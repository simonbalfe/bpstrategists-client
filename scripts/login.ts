#!/usr/bin/env bun
import { writeEnvVars } from '../env.ts';
import { Impit } from 'impit';
import { join } from 'node:path';

const LANDING = 'https://agencydashboard.io';
const SUBDOMAIN = 'https://bpstrategists.agencydashboard.io';
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36';

const email = process.argv[2] ?? process.env.BP_EMAIL;
const password = process.argv[3] ?? process.env.BP_PASSWORD;
if (!email || !password) {
  console.error('Usage: bun run login <email> <password>');
  console.error('Or set BP_EMAIL and BP_PASSWORD in ./.env');
  process.exit(1);
}

const http = new Impit({ browser: 'chrome' });
const jar = new Map<string, { value: string; domain: string }>();

console.log(`[1/6] GET ${LANDING}/`);
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
if (!landing.ok) die(`GET ${LANDING}/ returned HTTP ${landing.status}. Body preview:\n${(await landing.text()).slice(0, 400)}`);
const landingHtml = await landing.text();
const csrfMeta = landingHtml.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
if (!csrfMeta) die(`No <meta name="csrf-token"> on ${LANDING}/. First 500 chars of body:\n${landingHtml.slice(0, 500)}`);
const loginToken = csrfMeta[1];
console.log(`      csrf meta = ${loginToken.slice(0, 16)}...`);
console.log(`      cookies   = ${cookieNames() || '(none)'}`);

console.log(`[2/6] POST ${LANDING}/ajax-do-login`);
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
const loginText = await loginRes.text();
if (!loginRes.ok) die(`POST /ajax-do-login returned HTTP ${loginRes.status}. Body:\n${loginText.slice(0, 600)}`);

let loginJson: Record<string, unknown>;
try {
  loginJson = JSON.parse(loginText);
} catch {
  die(`/ajax-do-login did not return JSON. Body:\n${loginText.slice(0, 600)}`);
}
console.log(`      response keys = ${Object.keys(loginJson).join(', ') || '(none)'}`);

if (loginJson.status === false || loginJson.success === false || loginJson.error) {
  die(`/ajax-do-login returned an error response. Body:\n${JSON.stringify(loginJson, null, 2)}`);
}

const bridgeUrl = extractBridgeUrl(loginJson, loginText);
if (!bridgeUrl) {
  die(
    `Could not find SSO bridge URL in login response. Looked under: url, redirect, redirect_url, redirectUrl, location, data.url, data.redirect.\n` +
      `Full body:\n${loginText}`,
  );
}
console.log(`      bridge = ${bridgeUrl.slice(0, 100)}...`);

console.log(`[3/6] Following SSO bridge redirects`);
let currentUrl = bridgeUrl;
let dashHtml: string | null = null;
for (let hop = 0; hop < 5; hop++) {
  console.log(`      hop ${hop + 1}: GET ${currentUrl.slice(0, 100)}`);
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
    if (!next) die(`Redirect with no Location header at ${currentUrl} (status ${res.status})`);
    currentUrl = new URL(next, currentUrl).toString();
    continue;
  }
  if (!res.ok) die(`Bridge GET failed: HTTP ${res.status} at ${currentUrl}\nBody:\n${(await res.text()).slice(0, 400)}`);
  dashHtml = await res.text();
  break;
}
if (!dashHtml) die('Bridge chain exceeded 5 hops without landing on a 2xx response.');
console.log(`      cookies = ${cookieNames()}`);

console.log(`[4/6] Scrape CSRF from /dashboard`);
const dashCsrf = dashHtml.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
if (!dashCsrf) die(`No <meta name="csrf-token"> on /dashboard. First 500 chars:\n${dashHtml.slice(0, 500)}`);
const finalToken = dashCsrf[1];
console.log(`      csrf = ${finalToken.slice(0, 16)}...`);

console.log(`[5/6] Build BP_AGENCY_SESSION from cookie jar`);
const subdomainCookies = [...jar.entries()]
  .filter(([, v]) => v.domain.endsWith('bpstrategists.agencydashboard.io'))
  .map(([k, v]) => `${k}=${v.value}`)
  .join('; ');
if (!/agency_dashboard_session=/.test(subdomainCookies) || !/XSRF-TOKEN=/.test(subdomainCookies)) {
  die(
    `Missing expected session cookies on bpstrategists subdomain. Got:\n  ${subdomainCookies || '(none)'}\nFull jar:\n  ${[...jar.entries()].map(([k, v]) => `${k}@${v.domain}=${v.value.slice(0, 24)}...`).join('\n  ')}`,
  );
}
console.log(`      session cookies = ${subdomainCookies.split(';').map((c) => c.trim().split('=')[0]).join(', ')}`);

console.log(`[6/6] Write tokens to ./.env`);
const envPath = join(import.meta.dir, '..', '.env');
writeEnvVars(envPath, {
  BP_EMAIL: email,
  BP_PASSWORD: password,
  BP_CSRF_TOKEN: finalToken,
  BP_AGENCY_SESSION: subdomainCookies,
});
console.log(`      wrote ${envPath}`);

console.log(`\nLogin OK. Tokens persisted to ${envPath}.`);

function die(msg: string): never {
  console.error(`\nFAILED: ${msg}`);
  process.exit(1);
}

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
  const res = await http.fetch(url, { ...init, headers } as unknown as Parameters<typeof http.fetch>[1]);
  absorbSetCookie(res as unknown as Response, url);
  return res as unknown as Response;
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
  const m = raw.match(/https?:\\?\/\\?\/bpstrategists\.agencydashboard\.io\\?\/dashboard\\?\/[A-Za-z0-9+/=]+/);
  if (m) return m[0].replace(/\\\//g, '/');
  return null;
}

