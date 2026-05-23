#!/usr/bin/env bun
// Canonical GMB post scheduling smoke test.
// Schedules a post to a GMB location on a campaign for 24h from now,
// then verifies it appears in the calendar feed.

import '../env.ts';
import { BpStrategistsClient } from '../client.ts';

const token = process.env.BP_TOKEN!;
const sessionCookie = process.env.BP_SESSION!;
if (!token || !sessionCookie) {
  console.error('Missing BP_TOKEN or BP_SESSION. Run `bun run login`.');
  process.exit(1);
}

const CAMPAIGN_ID = 32132; // simonbalfe.com campaign with HermesOps GMB attached.
const CHANNEL_ID = 32235; // HermesOps GMB location id.
const IMAGE_PATH = '/Users/simon/Downloads/ring.jpg';

const client = new BpStrategistsClient({ token, sessionCookie });

const inDay = new Date(Date.now() + 24 * 60 * 60 * 1000);
const scheduleTime = inDay.toISOString().slice(0, 19).replace('T', ' ');

const post = await client.scheduleGmbPost({
  campaignId: CAMPAIGN_ID,
  channelId: CHANNEL_ID,
  text: `GMB smoke test — scheduled at ${new Date().toISOString()}`,
  images: [IMAGE_PATH],
  scheduleTime,
  timeZone: 'Europe/London',
  sectionType: 'whatsnew',
});

console.log('Scheduled:', post);

const start = new Date().toISOString().slice(0, 10);
const end = inDay.toISOString().slice(0, 10);
const encrypted = await client.getEncryptedCampaignId(CAMPAIGN_ID);
const calendar = await client.getCalendarPosts({
  campaignId: encrypted,
  numericCampaignId: CAMPAIGN_ID,
  startDate: start,
  endDate: end,
  channelId: CHANNEL_ID,
});

const items = (calendar as any).data ?? [];
console.log(`\nCalendar items in window: ${items.length}`);
const ok = items.length > 0;
console.log(`Post visible in calendar: ${ok ? 'YES' : 'NO'}`);
process.exit(ok ? 0 : 1);
