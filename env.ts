// Loads .env from this file's directory and OVERRIDES process.env.
// Import this before reading any BP_* variable. Repo policy: secrets come from
// the local .env, never from ~/.zshrc (see CLAUDE.md).
//
// Exports `loadEnv()` so long-running processes (mcp.ts) can pick up token
// changes written by `bun run login` without restarting.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const envPath = join(import.meta.dir, '.env');

export function parseEnvFile(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  const out: Record<string, string> = {};
  for (const raw of readFileSync(path, 'utf8').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key) out[key] = value;
  }
  return out;
}

export function loadEnv(): void {
  const parsed = parseEnvFile(envPath);
  for (const [k, v] of Object.entries(parsed)) process.env[k] = v;
}

export function writeEnvVars(path: string, updates: Record<string, string>): void {
  const before = existsSync(path) ? readFileSync(path, 'utf8') : '';
  const lines = before.split('\n');
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
  for (const key of remaining) out.push(`${key}=${quoteIfNeeded(updates[key])}`);
  writeFileSync(path, out.join('\n'));
}

function quoteIfNeeded(value: string): string {
  return /[\s"'#]/.test(value) ? `"${value.replace(/"/g, '\\"')}"` : value;
}

loadEnv();
