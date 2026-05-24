#!/usr/bin/env bun
import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { which } from './_shell.ts';

const NAME = 'bpstrategists';
const REPO_ROOT = join(import.meta.dir, '..');
const ENV_PATH = join(REPO_ROOT, '.env');

console.log(`[1/2] Removing ${NAME} MCP from all scopes`);
if (which('claude')) {
  for (const scope of ['local', 'project', 'user']) {
    const res = spawnSync('claude', ['mcp', 'remove', '--scope', scope, NAME], { encoding: 'utf8' });
    console.log(`      ${scope}: ${res.status === 0 ? 'removed' : 'not registered'}`);
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
