#!/usr/bin/env bun
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { which } from './_shell.ts';

const NAME = 'bpstrategists';
const REPO_ROOT = join(import.meta.dir, '..');
const MCP_PATH = join(REPO_ROOT, 'mcp.ts');

if (!which('claude')) {
  console.warn(
    [
      '',
      `[${NAME}] Skipping MCP install — \`claude\` CLI not found on PATH.`,
      '   Install Claude Code (https://claude.com/claude-code) then run:',
      '     bun run scripts/install-mcp.ts',
      '',
    ].join('\n'),
  );
  process.exit(0);
}

if (!which('bun')) {
  console.warn(
    [
      '',
      `[${NAME}] Skipping MCP install — \`bun\` CLI not found on PATH.`,
      '   Install Bun (https://bun.sh) then re-run `bun install`.',
      '',
    ].join('\n'),
  );
  process.exit(0);
}

for (const scope of ['local', 'project', 'user']) {
  spawnSync('claude', ['mcp', 'remove', '--scope', scope, NAME], { stdio: 'ignore' });
}

const add = spawnSync(
  'claude',
  ['mcp', 'add', '--scope', 'user', '--transport', 'stdio', NAME, '--', 'bun', 'run', MCP_PATH],
  { stdio: 'inherit' },
);

if (add.status !== 0) {
  console.error(`[${NAME}] \`claude mcp add\` failed (exit ${add.status}). See output above.`);
  process.exit(1);
}

console.log(
  [
    '',
    `[${NAME}] Installed at user scope. Loads in every Claude Code session on this machine.`,
    `   Path: ${MCP_PATH}`,
    '   (If Claude Code is already open, restart it once to pick up the new server.)',
    '',
  ].join('\n'),
);
