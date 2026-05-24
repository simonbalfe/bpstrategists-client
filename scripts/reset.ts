#!/usr/bin/env bun
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { which } from './_shell.ts';

const NAME = 'bpstrategists';
const REPO_ROOT = join(import.meta.dir, '..');
const ENV_PATH = join(REPO_ROOT, '.env');

console.log(`[1/2] Removing ${NAME} MCP from user scope`);
if (which('claude')) {
  const res = spawnSync('claude', ['mcp', 'remove', '--scope', 'user', NAME], { encoding: 'utf8' });
  if (res.status === 0) {
    console.log(`      removed`);
  } else {
    console.log(`      not registered (skipping)`);
  }
} else {
  console.log(`      \`claude\` CLI not on PATH (skipping)`);
}

console.log(`[2/2] Clearing ./.env`);
if (existsSync(ENV_PATH)) {
  writeFileSync(ENV_PATH, '');
  console.log(`      truncated ${ENV_PATH}`);
} else {
  console.log(`      ${ENV_PATH} does not exist (skipping)`);
}

console.log(`\nReset complete. To set back up:`);
console.log(`  bun install`);
