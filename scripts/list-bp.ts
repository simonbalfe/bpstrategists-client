#!/usr/bin/env bun
// Quick listing of active campaigns. Reads creds from ./.env.
// Usage: bun run scripts/list-bp.ts            (all active)
//        bun run scripts/list-bp.ts simonbalfe (case-insensitive filter on the row JSON)

import '../env.ts';
import { BpStrategistsClient } from '../client.ts';

const client = new BpStrategistsClient({
  token: process.env.BP_TOKEN!,
  sessionCookie: process.env.BP_SESSION!,
});

const filter = process.argv[2]?.toLowerCase();
const res = await client.listCampaigns({ archived: false, limit: 200 });
const rows = res.campaigns
  .filter((c) => !filter || JSON.stringify(c).toLowerCase().includes(filter))
  .map((c) => ({ id: c.id, name: c.name, url: c.url }));
console.log(`Active: ${res.campaigns.length}, matching "${filter ?? '*'}": ${rows.length}`);
console.table(rows);
