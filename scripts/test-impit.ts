#!/usr/bin/env bun
// FULL E2E TEST via impit (Chrome TLS fingerprint).
// Uses the OLD wizard endpoint (storeRankingDetails) — NOT the new addKeywordsData pair.
// If keywords land via /get_latest_keywords, TLS fingerprint was the missing piece.

import '../env.ts';
import { BpStrategistsClient } from '../client.ts';

const client = new BpStrategistsClient({
  token: process.env.BP_TOKEN!,
  sessionCookie: process.env.BP_SESSION!,
  userId: Number(process.env.BP_USER_ID),
});

const anyClient = client as unknown as {
  postRaw: (p: string, b: URLSearchParams) => Promise<Response>;
  token: string;
};

// 1. List campaigns — assume the user already freed a slot manually.
const list = await client.listCampaigns({ limit: 50 });
console.log(`Current campaigns: ${list.campaigns.length}/${list.total_count}`);

// 2. Create a fresh shell.
const projectId = await client.createCampaignShell({
  projectName: `impit-test-${Date.now()}`,
  domainUrl: 'simonbalfe.com',
  urlType: 'Root Domain',
  regionalDb: 'uk',
  dashboards: [1], // SEO only
});
console.log('\nFresh shell created:', projectId);

// 3. Call the OLD wizard endpoint directly.
const body = new URLSearchParams();
body.set('_token', anyClient.token);
body.set('project_id', String(projectId));
body.set('keyword_field', 'impit fingerprint test');
body.set('keyword_tag', '');
body.append('searchlocations[]', 'London, UK');
body.append('latitude[]', '51.5072178');
body.append('longitude[]', '-0.1275862');
body.append('locations[]', 'London,England,United Kingdom');
body.append('location_id[]', '1006886');
body.set('add_project_search_engine', 'google.co.uk');
body.set('add_project_language', 'English');
body.set('ignore_local_listing', '0');
body.set('device', 'desktop');

const res = await anyClient.postRaw.call(client, '/ajax_store_ranking_details', body);
const text = await res.text();
console.log('\nstore_ranking_details:', res.status, text);

// 4. Verify via get_latest_keywords.
let json: any = {};
try { json = JSON.parse(text); } catch {}
if (json.projectId) {
  const verify = new URLSearchParams();
  verify.set('pId', json.projectId);
  verify.set('_token', anyClient.token);
  const v = await anyClient.postRaw.call(client, '/get_latest_keywords', verify);
  console.log('\nget_latest_keywords:', await v.text());
}

console.log(`\nDashboard: https://bpstrategists.agencydashboard.io/campaign-detail/${projectId}/seo`);
