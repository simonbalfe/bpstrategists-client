// Loads .env from this file's directory and OVERRIDES process.env.
// Import this before reading any BP_* variable. Repo policy: secrets come from
// the local .env, never from ~/.zshrc (see CLAUDE.md).
//
// Exports `loadEnv()` so long-running processes (mcp.ts) can pick up token
// changes written by `bun run login` without restarting.

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const envPath = join(import.meta.dir, '.env');

export function loadEnv(): void {
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadEnv();
