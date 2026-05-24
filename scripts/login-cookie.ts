#!/usr/bin/env bun
import { setAuthFromCookie } from '../auth.ts';

const raw = (process.argv[2] ?? (await readStdin())).trim();
if (!raw) {
  console.error('Missing cookie. Pass it as an argument or pipe it on stdin.');
  console.error('Get it from DevTools -> Application -> Cookies -> agency_dashboard_session');
  process.exit(1);
}

try {
  const { token, envPath } = await setAuthFromCookie(raw);
  console.log(`Authenticated. CSRF token starts with ${token.slice(0, 12)}...`);
  console.log(`Persisted to ${envPath}.`);
} catch (err) {
  console.error((err as Error).message);
  process.exit(1);
}

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}
