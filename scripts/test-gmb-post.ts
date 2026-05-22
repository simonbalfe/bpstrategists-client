#!/usr/bin/env bun
// End-to-end GMB posting test using the campaign + email_id from the captured HAR:
//   campaign_id = 32092, email_id = 7094 (BP Strategists agency, simonbalfe.com).
// Steps:
//   1. Discover GMB channels via the new /ajax_get_gmb_accounts endpoint.
//   2. Resolve the encrypted campaign token via /campaign_gmb_content/<id>.
//   3. Publish a CLEARLY-MARKED test post so it can be reviewed/removed.

import '../env.ts';
import { BpStrategistsClient } from '../client.ts';

const CAMPAIGN_ID = 32092;
const EMAIL_ID = 7094;

const client = new BpStrategistsClient({
  token: process.env.BP_TOKEN!,
  sessionCookie: process.env.BP_SESSION!,
  userId: Number(process.env.BP_USER_ID),
});

// 1. List GMB channels (the missing piece — channelId for schedule_gmb_post).
const channels = await client.listGmbAccounts(EMAIL_ID, CAMPAIGN_ID);
console.log('gmb channels:', channels);
if (!channels.length) {
  console.error('No GMB channels returned — campaign may not have GMB connected.');
  process.exit(1);
}
const channel = channels[0];
console.log(`using channelId=${channel.id} label="${channel.label}"`);

// 2. Resolve encrypted campaignId (also new, needed for schedule_gmb_post).
const encrypted = await client.getEncryptedCampaignId(CAMPAIGN_ID);
console.log('encrypted campaignId:', encrypted.slice(0, 60) + '...');

// 3. Publish a real post with a clear test marker so it's easy to identify and delete.
const text = `[API integration test ${new Date().toISOString()}] Please disregard — this post was created by an automated test and can be safely deleted.`;
const result = await client.scheduleGmbPost({
  campaignId: encrypted,
  channelId: channel.id,
  text,
  // no images, no CTA — minimum side effects
});
console.log('scheduleGmbPost result:', result);
