#!/usr/bin/env bun
// Cookie-paste login: paste the `agency_dashboard_session` value from your browser,
// this script scrapes the matching CSRF token and writes BP_SESSION + BP_TOKEN to .env.
//
// Usage:
//   bun run login:cookie '<cookie-value>'                  # just the value
//   bun run login:cookie 'agency_dashboard_session=<...>'  # full Cookie pair, also fine
//   echo '<cookie-value>' | bun run login:cookie           # via stdin
//
// Pair is good for ~24h. Re-run when MCP calls start returning 401.

import '../env.ts';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DASHBOARD = 'https://bpstrategists.agencydashboard.io/dashboard';

const raw = (process.argv[2] ?? (await readStdin())).trim();
if (!raw) {
  console.error('Missing cookie. Pass it as an argument or pipe it on stdin.');
  console.error('Get it from DevTools -> Application -> Cookies -> agency_dashboard_session');
  process.exit(1);
}

const sessionValue = raw.startsWith('agency_dashboard_session=')
  ? raw.slice('agency_dashboard_session='.length)
  : raw;
const session = `agency_dashboard_session=${sessionValue}`;

console.log('1. GET ' + DASHBOARD);
const res = await fetch(DASHBOARD, {
  headers: { Cookie: session },
  redirect: 'manual',
});
if (res.status !== 200) {
  console.error(`Expected 200, got ${res.status}. Cookie is probably expired or wrong.`);
  if (res.status >= 300 && res.status < 400) {
    console.error('  -> ' + (res.headers.get('location') ?? '(no location header)'));
  }
  process.exit(1);
}
const html = await res.text();
const match = html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
if (!match) {
  console.error('Could not scrape <meta name="csrf-token"> from /dashboard.');
  process.exit(1);
}
const token = match[1];
console.log('   csrf token:', token.slice(0, 16) + '...');

const envPath = join(import.meta.dir, '..', '.env');
const before = readFileSync(envPath, 'utf8');
const after = upsertEnvVars(before, { BP_TOKEN: token, BP_SESSION: session });
writeFileSync(envPath, after);
console.log('\n.env updated: BP_TOKEN, BP_SESSION');

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
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
  return /[\s"'#]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}
