#!/usr/bin/env bun
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as readline from 'node:readline';
import { parseEnvFile } from '../env.ts';

const REPO_ROOT = join(import.meta.dir, '..');
const ENV_PATH = join(REPO_ROOT, '.env');
const INSTALL_MCP = join(import.meta.dir, 'install-mcp.ts');
const LOGIN = join(import.meta.dir, 'login.ts');
const LOGIN_COOKIE = join(import.meta.dir, 'login-cookie.ts');

const NAME = 'bpstrategists';

const env = parseEnvFile(ENV_PATH);
const haveTokens = !!env.BP_CSRF_TOKEN && !!env.BP_AGENCY_SESSION;

if (haveTokens) {
  console.log(`[${NAME}] Existing auth found in .env. Skipping prompt.`);
  installMcp();
  process.exit(0);
}

if (!process.stdin.isTTY) {
  console.log(`[${NAME}] No auth in .env and not a TTY. Installing MCP only.`);
  console.log(`         Run \`bun run login <email> <password>\` or \`bun run login:cookie '<cookie>'\` to authenticate.`);
  installMcp();
  process.exit(0);
}

console.log(`\n[${NAME}] First-time setup. Choose how to authenticate:`);
console.log(`  1) Email + password`);
console.log(`  2) Paste session cookie (agency_dashboard_session)`);
console.log(`  3) Skip — set up later with \`bun run login\``);

const choice = (await ask('> ')).trim();

if (choice === '1') {
  const email = (await ask('Email: ')).trim();
  const password = await askHidden('Password: ');
  if (!email || !password) {
    console.error('Email and password required. Skipping auth.');
    installMcp();
    process.exit(0);
  }
  const r = spawnSync('bun', ['run', LOGIN, email, password], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\nLogin failed (exit ${r.status}). Fix the issue then re-run \`bun run login\`.`);
    installMcp();
    process.exit(0);
  }
} else if (choice === '2') {
  console.log('Get it from DevTools → Application → Cookies → agency_dashboard_session on');
  console.log('https://bpstrategists.agencydashboard.io');
  const cookie = (await ask('Cookie value: ')).trim();
  if (!cookie) {
    console.error('Empty cookie. Skipping auth.');
    installMcp();
    process.exit(0);
  }
  const r = spawnSync('bun', ['run', LOGIN_COOKIE, cookie], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.error(`\nCookie auth failed (exit ${r.status}). Fix the issue then re-run \`bun run login:cookie\`.`);
    installMcp();
    process.exit(0);
  }
} else {
  console.log('Skipped. Run `bun run login` or `bun run login:cookie` when ready.');
}

installMcp();

function installMcp(): void {
  const r = spawnSync('bun', ['run', INSTALL_MCP], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

function askHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let buf = '';
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        const code = ch.charCodeAt(0);
        if (code === 10 || code === 13 || code === 4) {
          stdin.setRawMode?.(wasRaw ?? false);
          stdin.pause();
          stdin.removeListener('data', onData);
          process.stdout.write('\n');
          resolve(buf);
          return;
        }
        if (code === 3) {
          stdin.setRawMode?.(wasRaw ?? false);
          process.stdout.write('\n');
          process.exit(130);
        }
        if (code === 127 || code === 8) {
          if (buf.length > 0) {
            buf = buf.slice(0, -1);
            process.stdout.write('\b \b');
          }
          continue;
        }
        if (code < 32) continue;
        buf += ch;
        process.stdout.write('*');
      }
    };
    stdin.on('data', onData);
  });
}
