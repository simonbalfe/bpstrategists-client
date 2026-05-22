#!/usr/bin/env bun
// Replays the create-campaign flow captured in ~/Downloads/latest.har 1:1.
// The wizard fires exactly 3 POSTs in this order:
//   1. /store_project_info
//   2. /complete_steps (steps=1)
//   3. /ajax_store_ranking_details
// Only the project_name is randomised so we don't collide with an existing campaign.

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

// Step 0a — GET /add-new-campaign (wizard HTML page; may seed session keys the
// commit endpoint later checks).
const wizardHtml = await (client as any).getString('/add-new-campaign');
console.log('add-new-campaign len:', wizardHtml.length);

// Step 0b — GET /checkdnsrr (validates domain; may also cache it in session).
const dns = await client.checkDnsRecord('simonbalfe.com', userId);
console.log('checkdnsrr:', JSON.stringify(dns).slice(0, 200));

// Step 1 — POST /store_project_info
const projectName = `test-5-${Date.now()}`;
const project = await client.storeProjectInfo({
  projectName,
  domainUrl: 'simonbalfe.com',
  urlType: 'Root Domain',
  regionalDb: 'us',
  dashboards: [1], // SEO
});
console.log('store_project_info:', project);

// Step 2 — POST /complete_steps (steps=1)
await client.completeSteps(project.last_id, 1);
console.log('complete_steps step=1 ok');

// Step 2.5 — GET /ajax_keyword_locations twice, mimicking the wizard's location-picker typeahead.
// May register session state the ranking-details commit later checks.
const locEmpty = await (client as any).getJson(
  `/ajax_keyword_locations?campaign_id=${project.last_id}&location=`,
);
console.log('keyword_locations(empty):', JSON.stringify(locEmpty).slice(0, 200));
const locMain = await (client as any).getJson(
  `/ajax_keyword_locations?campaign_id=${project.last_id}&location=main`,
);
console.log('keyword_locations(main):', JSON.stringify(locMain).slice(0, 200));

// Step 3 — POST /ajax_store_ranking_details (values copied verbatim from HAR)
const ranking = await client.storeRankingDetails({
  projectId: project.last_id,
  keywords: ['copy this'],
  keywordTag: 'main',
  locations: [
    {
      searchLocation: 'Mainz, Germany',
      latitude: 49.9928617,
      longitude: 8.2472526,
      country: 'Main Middle,Massachusetts,United States',
      locationId: 9060635,
    },
  ],
  searchEngine: 'google.de',
  language: 'English',
  ignoreLocalListing: 0,
  device: 'desktop',
});
console.log('ajax_store_ranking_details:', ranking);

console.log('Done. projectId =', project.last_id);
