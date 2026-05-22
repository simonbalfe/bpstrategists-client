#!/usr/bin/env bun
// Spawn ../mcp.ts as a subprocess and drive it via real MCP stdio protocol:
//   initialize -> tools/call create_campaign -> verify keywords on the new project.

import '../env.ts';
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { BpStrategistsClient } from '../client.ts';

const repoRoot = join(import.meta.dir, '..');
const proc = spawn('bun', ['run', 'mcp.ts'], { cwd: repoRoot });
let buf = '';
const pending = new Map<number, (msg: any) => void>();
let nextId = 1;

proc.stdout.on('data', (chunk) => {
  buf += chunk.toString();
  let nl: number;
  while ((nl = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id !== undefined && pending.has(msg.id)) {
        pending.get(msg.id)!(msg);
        pending.delete(msg.id);
      }
    } catch {
      console.error('non-JSON line:', line);
    }
  }
});
proc.stderr.on('data', (chunk) => process.stderr.write(`[mcp] ${chunk}`));

function send(method: string, params: unknown): Promise<any> {
  const id = nextId++;
  const req = { jsonrpc: '2.0', id, method, params };
  return new Promise((resolve) => {
    pending.set(id, resolve);
    proc.stdin.write(JSON.stringify(req) + '\n');
  });
}

// 1. Initialize handshake.
const init = await send('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'mcp-final-check', version: '0' },
});
console.log('init server:', init.result?.serverInfo);
proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');

// 2. Real tool call — same shape any MCP client would send.
const call = await send('tools/call', {
  name: 'create_campaign',
  arguments: {
    domain: 'simonbalfe.com',
    keywords: ['mcp final check kw1', 'mcp final check kw2'],
    locations: ['United Kingdom'],
    dashboards: ['SEO'],
  },
});
console.log('tool result:', JSON.stringify(call.result, null, 2));

// Parse the project id out of the human-readable response text the tool returns.
const text: string = call.result?.content?.[0]?.text ?? '';
const m = text.match(/Created campaign (\d+)/);
if (!m) {
  console.error('Could not parse projectId from tool response');
  proc.kill();
  process.exit(1);
}
const projectId = Number(m[1]);
console.log('projectId =', projectId);

// 3. Verify via a separate Bun client that the keyword rows persisted.
const client = new BpStrategistsClient({
  token: process.env.BP_TOKEN!,
  sessionCookie: process.env.BP_SESSION!,
  userId: Number(process.env.BP_USER_ID),
});
const stats = (await (client as any).getJson(
  `/ajax_live_keyword_stats?campaign_id=${projectId}&tag_id=&tracking_type=all&locations=`,
)) as { total: number | string };
console.log(`live_keyword_stats.total = ${stats.total}`);

proc.kill();
process.exit(stats.total && Number(stats.total) > 0 ? 0 : 1);
