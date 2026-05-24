#!/usr/bin/env bun
// Auto-login: email + password -> fresh BP_TOKEN + BP_SESSION written back to .env.
//
// Flow (reconstructed from login.har at the repo root):
//   1. GET  https://agencydashboard.io/                -> seeds XSRF-TOKEN + agency_dashboard_session on the marketing domain, exposes the CSRF _token via <meta>.
//   2. POST https://agencydashboard.io/ajax-do-login   -> email + password + _token. Responds with JSON containing the SSO bridge URL.
//   3. GET  <bridge URL on bpstrategists.agencydashboard.io/dashboard/<encrypted>> -> 302 to /dashboard, sets the subdomain XSRF-TOKEN + agency_dashboard_session.
//   4. GET  https://bpstrategists.agencydashboard.io/dashboard -> final landing; scrape the fresh CSRF token from <meta name="csrf-token">.
//
// Laravel session cookies on this app expire ~24h after issue, so re-run when you start hitting 401s.

import '../env.ts';
import { Impit } from 'impit';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const LANDING = 'https://agencydashboard.io';
const SUBDOMAIN = 'https://bpstrategists.agencydashboard.io';

const email = process.env.BP_EMAIL;
const password = process.env.BP_PASSWORD;
if (!email || !password) {
  console.error('Missing BP_EMAIL or BP_PASSWORD in .env. See CLAUDE.md for the .env layout.');
  process.exit(1);
}

const http = new Impit({ browser: 'chrome' });
const jar = new Map<string, { value: string; domain: string }>();

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';

// ---------- step 1: prime CSRF on agencydashboard.io ----------
console.log('1. GET ' + LANDING + '/');
const landing = await fetchWithJar(`${LANDING}/`, {
  method: 'GET',
  headers: {
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'User-Agent': UA,
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
  },
});
assertOk(landing, `GET ${LANDING}/`);
const landingHtml = await landing.text();
const csrfMeta = landingHtml.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
if (!csrfMeta) throw new Error('Could not scrape <meta name="csrf-token"> from landing page.');
const loginToken = csrfMeta[1];
console.log('   csrf meta:', loginToken.slice(0, 16) + '...');
console.log('   jar:', cookieNames());

// ---------- step 2: POST /ajax-do-login ----------
console.log('2. POST ' + LANDING + '/ajax-do-login');
const loginBody = new URLSearchParams({ email, password, _token: loginToken });
const loginRes = await fetchWithJar(`${LANDING}/ajax-do-login`, {
  method: 'POST',
  headers: {
    Accept: 'application/json, text/javascript, */*; q=0.01',
    'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    Origin: LANDING,
    Referer: `${LANDING}/`,
    'User-Agent': UA,
    'X-Requested-With': 'XMLHttpRequest',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
  },
  body: loginBody.toString(),
});
assertOk(loginRes, 'POST /ajax-do-login');
const loginJsonText = await loginRes.text();
let loginJson: Record<string, unknown>;
try {
  loginJson = JSON.parse(loginJsonText);
} catch {
  throw new Error(`ajax-do-login did not return JSON: ${loginJsonText.slice(0, 200)}`);
}
console.log('   response keys:', Object.keys(loginJson).join(', '));

// The response shape isn't in the HAR (Chrome strips bodies). Cover the common shapes.
const bridgeUrl = extractBridgeUrl(loginJson, loginJsonText);
if (!bridgeUrl) {
  throw new Error(
    `Could not find SSO bridge URL in login response. Full body:\n${loginJsonText}\n\n` +
      `Expected a key like "url" / "redirect" / "redirect_url" pointing at ${SUBDOMAIN}/dashboard/<encrypted>.`,
  );
}
console.log('   bridge:', bridgeUrl.slice(0, 90) + '...');

// ---------- step 3: follow the SSO bridge manually so we capture every Set-Cookie hop ----------
// Bridge -> 302 to /dashboard -> 200 HTML. The final HTML has the fresh CSRF token we need.
let currentUrl = bridgeUrl;
let dashHtml: string | null = null;
for (let hop = 0; hop < 5; hop++) {
  console.log(`3.${hop + 1} GET ${currentUrl.slice(0, 100)}`);
  const res = await fetchWithJar(currentUrl, {
    method: 'GET',
    headers: {
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
      Referer: `${LANDING}/`,
      'User-Agent': UA,
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'cross-site',
      'Upgrade-Insecure-Requests': '1',
    },
    redirect: 'manual',
  });
  if (res.status >= 300 && res.status < 400) {
    const next = res.headers.get('location');
    if (!next) throw new Error(`Redirect with no Location header at ${currentUrl}`);
    currentUrl = new URL(next, currentUrl).toString();
    continue;
  }
  if (!res.ok) throw new Error(`Bridge GET failed: ${res.status} ${currentUrl}`);
  dashHtml = await res.text();
  break;
}
if (!dashHtml) throw new Error('Bridge chain exceeded 5 hops without landing on a 2xx.');
console.log('   jar after bridge:', cookieNames());

// ---------- step 4: scrape fresh CSRF from /dashboard HTML ----------
const dashCsrf = dashHtml.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
if (!dashCsrf) throw new Error('Could not scrape <meta name="csrf-token"> from /dashboard. Login likely failed.');
const finalToken = dashCsrf[1];
console.log('4. final csrf:', finalToken.slice(0, 16) + '...');

// ---------- step 5: build BP_SESSION (subdomain-scoped cookies only) ----------
const subdomainCookies = [...jar.entries()]
  .filter(([, v]) => v.domain.endsWith('bpstrategists.agencydashboard.io'))
  .map(([k, v]) => `${k}=${v.value}`)
  .join('; ');
if (!/agency_dashboard_session=/.test(subdomainCookies) || !/XSRF-TOKEN=/.test(subdomainCookies)) {
  throw new Error(
    `Missing expected session cookies on bpstrategists subdomain. Got: ${subdomainCookies || '(none)'}`,
  );
}
console.log('   session cookies:', subdomainCookies.split(';').map((c) => c.trim().split('=')[0]).join(', '));

// ---------- step 6: persist to .env ----------
const envPath = join(import.meta.dir, '..', '.env');
const before = readFileSync(envPath, 'utf8');
const after = upsertEnvVars(before, {
  BP_TOKEN: finalToken,
  BP_SESSION: subdomainCookies,
});
writeFileSync(envPath, after);
console.log('\n.env updated: BP_TOKEN, BP_SESSION');

// ============================================================
// helpers
// ============================================================

function cookieNames(): string {
  return [...jar.entries()].map(([k, v]) => `${k}@${shortDomain(v.domain)}`).join(', ');
}

function shortDomain(d: string): string {
  return d.replace(/^\./, '').replace('bpstrategists.agencydashboard.io', 'bps').replace('agencydashboard.io', 'ad');
}

async function fetchWithJar(url: string, init: RequestInit): Promise<Response> {
  const cookieHeader = buildCookieHeader(url);
  const headers = new Headers(init.headers);
  if (cookieHeader) headers.set('Cookie', cookieHeader);
  const res = await http.fetch(url, { ...init, headers });
  absorbSetCookie(res, url);
  return res;
}

function buildCookieHeader(url: string): string {
  const u = new URL(url);
  const matches: string[] = [];
  for (const [name, { value, domain }] of jar) {
    if (cookieDomainMatches(u.hostname, domain)) matches.push(`${name}=${value}`);
  }
  return matches.join('; ');
}

function cookieDomainMatches(hostname: string, cookieDomain: string): boolean {
  const cd = cookieDomain.replace(/^\./, '');
  return hostname === cd || hostname.endsWith('.' + cd);
}

function absorbSetCookie(res: Response, requestUrl: string): void {
  const lines =
    typeof (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : [];
  const requestHost = new URL(requestUrl).hostname;
  for (const line of lines) {
    const parts = line.split(';');
    const first = parts[0];
    const eq = first.indexOf('=');
    if (eq <= 0) continue;
    const name = first.slice(0, eq).trim();
    const value = first.slice(eq + 1).trim();
    let domain = requestHost;
    for (const attr of parts.slice(1)) {
      const [k, v] = attr.split('=').map((s) => s.trim());
      if (k.toLowerCase() === 'domain' && v) domain = v;
    }
    if (value === '') {
      jar.delete(name);
    } else {
      jar.set(name, { value, domain });
    }
  }
}

function assertOk(res: Response, label: string): void {
  if (!res.ok) throw new Error(`${label} -> HTTP ${res.status}`);
}

function extractBridgeUrl(json: Record<string, unknown>, raw: string): string | null {
  const candidates: unknown[] = [
    json.url,
    json.redirect,
    json.redirect_url,
    json.redirectUrl,
    json.location,
    (json.data as Record<string, unknown> | undefined)?.url,
    (json.data as Record<string, unknown> | undefined)?.redirect,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && /bpstrategists\.agencydashboard\.io\/dashboard\//.test(c)) return c;
  }
  // Fall back: scan the entire body for the dashboard/<encrypted> pattern.
  const m = raw.match(/https?:\\?\/\\?\/bpstrategists\.agencydashboard\.io\\?\/dashboard\\?\/[A-Za-z0-9+/=]+/);
  if (m) return m[0].replace(/\\\//g, '/');
  return null;
}

function upsertEnvVars(text: string, updates: Record<string, string>): string {
  const lines = text.split('\n');
  const remaining = new Set(Object.keys(updates));
  const out = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eq = trimmed.indexOf('=');
    if (eq < 0) return line;
    const key = trimmed.slice(0, eq).trim();
    if (!(key in updates)) return line;
    remaining.delete(key);
    return `${key}=${quoteIfNeeded(updates[key])}`;
  });
  for (const key of remaining) {
    out.push(`${key}=${quoteIfNeeded(updates[key])}`);
  }
  return out.join('\n');
}

function quoteIfNeeded(value: string): string {
  // BP_SESSION contains '; ' which is safe unquoted for env.ts (it splits on first '=' only),
  // but quote anything containing whitespace just in case the file is sourced by a shell.
  return /[\s"'#]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}
