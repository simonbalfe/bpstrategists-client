#!/usr/bin/env bun
// Smoke test: create a real campaign via the patched flow.
// Reads creds from ./.env via env.ts.

import '../env.ts';
import { BpStrategistsClient } from '../client.ts';

const token = process.env.BP_TOKEN!;
const sessionCookie = process.env.BP_SESSION!;
const userId = Number(process.env.BP_USER_ID);
if (!token || !sessionCookie || !Number.isFinite(userId)) {
  console.error('Missing BP_TOKEN, BP_SESSION, or BP_USER_ID. See .env.example.');
  process.exit(1);
}

const client = new BpStrategistsClient({ token, sessionCookie, userId });

const result = await client.createCampaign({
  domain: 'simonbalfe.com',
  keywords: ['seo agency london', 'seo agency uk'],
  locations: ['United Kingdom'],
  dashboards: ['SEO'],
});

console.log('Created campaign:', result);
