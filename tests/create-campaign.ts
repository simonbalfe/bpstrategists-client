#!/usr/bin/env bun
// Canonical end-to-end campaign creation smoke test.
// Creates a campaign on simonbalfe.com with all 4 integrations (GSC, GA4, Ads, GMB)
// attached, every optional param set explicitly, then verifies the bindings.

import '../env.ts';
import { BpStrategistsClient } from '../client.ts';

const token = process.env.BP_TOKEN!;
const sessionCookie = process.env.BP_SESSION!;
if (!token || !sessionCookie) {
  console.error('Missing BP_TOKEN or BP_SESSION. Run `bun run login`.');
  process.exit(1);
}

const client = new BpStrategistsClient({ token, sessionCookie });

const result = await client.createCampaign({
  domain: 'simonbalfe.com',
  projectName: `simonbalfe-smoke-${Date.now()}`,
  urlType: 'Root Domain',
  regionalDb: 'uk',
  dashboards: ['SEO', 'ADS', 'GMB'],
  keywords: [
    'simon balfe',
    'ai consultant london',
    'automation engineer',
  ],
  keywordTag: 'simonbalfe-smoke',
  locations: ['United Kingdom'],
  volumeLocations: ['United Kingdom'],
  language: 'English',
  searchEngine: 'google.co.uk',
  serpType: 'local+organic',
  device: 'desktop',
  searchConsole: {
    googleAccount: 'bpstrategicmanagement@gmail.com',
    property: 'sc-domain:bpstrategists.com',
  },
  ga4: {
    googleAccount: 'bpstrategicmanagement@gmail.com',
    account: 'BP Strategists',
    property: 'BP Strategists',
  },
  ads: {
    googleAccount: 'info@bpstrategists.com',
    account: 'Coo Coo Lounge',
  },
  gmb: {
    googleAccount: 'simon@simonbalfe.com',
    locations: ['HermesOps'],
  },
});

console.log('Created:', result);

const [bindings] = await client.getCampaignBindings({ campaignId: result.projectId });
console.log('\nBindings:');
console.log(JSON.stringify(bindings, null, 2));

const ok =
  !!bindings.ga4 &&
  !!bindings.searchConsole &&
  !!bindings.ads &&
  bindings.gmb?.locations?.length === 1;
console.log(`\nAll integrations attached: ${ok ? 'YES' : 'NO'}`);
process.exit(ok ? 0 : 1);
