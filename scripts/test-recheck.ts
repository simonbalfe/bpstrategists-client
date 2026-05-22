#!/usr/bin/env bun
// Fresh check: re-call storeRankingDetails to get a fresh encrypted pId,
// then immediately check /get_latest_keywords. Plus hit /ajax_live_keyword_list
// (the dashboard's actual keyword list endpoint, uses numeric campaign_id).

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

await client.listCampaigns({ limit: 1 });

const projectId = 32080;

// 1) Fresh pId via repeat storeRankingDetails.
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
const sr = await anyClient.postRaw.call(client, '/ajax_store_ranking_details', body);
const srText = await sr.text();
console.log('store_ranking_details (repeat):', srText);
let pid = '';
try { pid = JSON.parse(srText).projectId ?? ''; } catch {}

// 2) get_latest_keywords with the FRESH pid.
if (pid) {
  const v = new URLSearchParams();
  v.set('pId', pid);
  v.set('_token', anyClient.token);
  const r = await anyClient.postRaw.call(client, '/get_latest_keywords', v);
  console.log('\nget_latest_keywords (fresh pId):', await r.text());
}

// 3) Ground truth: the dashboard's keyword-list endpoint.
const list = new URLSearchParams();
list.set('campaign_id', String(projectId));
list.set('tag_id', '');
list.set('tracking_type', 'all');
list.set('locations', '');
list.set('column_name', 'position');
list.set('order_type', 'asc');
list.set('limit', '50');
list.set('page', '1');
list.set('query', '');
list.set('favourites', '1');
list.set('_token', anyClient.token);
const lr = await anyClient.postRaw.call(client, '/ajax_live_keyword_list', list);
console.log('\najax_live_keyword_list:', (await lr.text()).slice(0, 600));
