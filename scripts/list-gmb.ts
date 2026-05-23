#!/usr/bin/env bun
// List every GMB channel reachable across all active campaigns x connected Google accounts.
// Usage: bun scripts/list-gmb.ts

import '../env.ts';
import { BpStrategistsClient } from '../client.ts';

const client = new BpStrategistsClient({
  token: process.env.BP_TOKEN!,
  sessionCookie: process.env.BP_SESSION!,
});


const campaigns = (await client.listCampaigns({ archived: false, limit: 200 })).campaigns;
console.log(`Active campaigns: ${campaigns.length}`);

const wizard = await client.listWizardEmails();
console.log(`GMB-OAuth accounts (wizard dropdown): ${wizard.gmb.length}`);
console.table(wizard.gmb);

const rows: Array<{
  campaignId: number;
  campaign: string;
  email: string;
  channelId: number;
  channel: string;
}> = [];

for (const c of campaigns) {
  for (const a of wizard.gmb) {
    try {
      const channels = await client.listGmbAccounts(a.id, c.id);
      for (const ch of channels) {
        rows.push({
          campaignId: c.id,
          campaign: c.name,
          email: a.label,
          channelId: ch.id,
          channel: ch.label,
        });
      }
    } catch (err) {
      console.error(`  ! ${c.name} (${c.id}) via ${a.label}: ${(err as Error).message}`);
    }
  }
}

console.log(`\nGMB channels found: ${rows.length}`);
console.table(rows);
