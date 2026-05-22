#!/usr/bin/env bun
// Re-check every test project's keyword count from our Bun client. Looks at
// total = how many keyword rows exist on the project (not ranked, just tracked).

import '../env.ts';
import { BpStrategistsClient } from '../client.ts';

const client = new BpStrategistsClient({
  token: process.env.BP_TOKEN!,
  sessionCookie: process.env.BP_SESSION!,
  userId: Number(process.env.BP_USER_ID),
});

const ids = [32082, 32083, 32084, 32085, 32086, 32087, 32088];

for (const id of ids) {
  const stats = (await (client as any).getJson(
    `/ajax_live_keyword_stats?campaign_id=${id}&tag_id=&tracking_type=all&locations=`,
  )) as { total: string | number };
  const tags = await (client as any).getJson(`/ajax_list_existing_tags?campaign_id=${id}`);
  const tagMatches = (JSON.stringify(tags).match(/value=\\"(\d+)\\"/g) || []).slice(0, 5);
  console.log(`project ${id}  total=${stats.total}  tags=${tagMatches.join(',')}`);
}
