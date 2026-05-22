#!/usr/bin/env bun
// Replays the same 3-POST wizard flow, but from inside a real headless Chrome.
// If the keyword now persists, the discriminator was a transport-layer signal
// our Bun + Impit client doesn't emit. If it still drops, the gate is purely
// server-side application state we can't observe.

import '../env.ts';
import { chromium } from 'playwright';

const BASE = 'https://bpstrategists.agencydashboard.io';
const userId = Number(process.env.BP_USER_ID);
const sessionCookieHeader = process.env.BP_SESSION!;

// Parse "k=v; k=v" into Playwright cookie objects.
const cookies = sessionCookieHeader.split(';').map((piece) => {
  const eq = piece.indexOf('=');
  const name = piece.slice(0, eq).trim();
  const value = piece.slice(eq + 1).trim();
  return {
    name,
    value,
    domain: 'bpstrategists.agencydashboard.io',
    path: '/',
    httpOnly: name === 'agency_dashboard_session',
    secure: true,
    sameSite: 'Lax' as const,
  };
});

const browser = await chromium.launch({
  headless: true,
  channel: 'chrome',
});
const context = await browser.newContext();
await context.addCookies(cookies);
const page = await context.newPage();

// Step 0a — load the wizard HTML to seed any session-side wizard state.
await page.goto(`${BASE}/add-new-campaign`, { waitUntil: 'domcontentloaded' });
const csrf = await page.evaluate(
  () =>
    document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
);
if (!csrf) {
  console.error('No CSRF meta on /add-new-campaign — session likely expired.');
  await browser.close();
  process.exit(1);
}
console.log('csrf:', csrf.slice(0, 8) + '...');

// Wrapper: run a fetch FROM the page so it uses real Chrome TLS + cookies.
async function postForm(path: string, body: Record<string, string | string[]>) {
  return page.evaluate(
    async ({ path, body, csrf }) => {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) {
        if (Array.isArray(v)) for (const item of v) params.append(k, item);
        else params.append(k, v);
      }
      const res = await fetch(path, {
        method: 'POST',
        headers: {
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-CSRF-TOKEN': csrf,
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: params.toString(),
        credentials: 'include',
      });
      const text = await res.text();
      try {
        return { status: res.status, json: JSON.parse(text) };
      } catch {
        return { status: res.status, text };
      }
    },
    { path, body, csrf },
  );
}

async function getJson(path: string) {
  return page.evaluate(async (path) => {
    const res = await fetch(path, {
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest',
      },
      credentials: 'include',
    });
    const text = await res.text();
    try {
      return { status: res.status, json: JSON.parse(text) };
    } catch {
      return { status: res.status, text };
    }
  }, path);
}

// Step 1 — POST /store_project_info
const projectName = `test-browser-${Date.now()}`;
const step1 = await postForm('/store_project_info', {
  existed_id: '',
  project_name: projectName,
  domain_url: 'simonbalfe.com',
  addNew_url_type: 'Root Domain',
  regional_db: 'us',
  'dashboardType[1]': '1',
});
console.log('store_project_info:', step1);
const projectId = (step1 as any).json?.last_id;
if (!projectId) {
  await browser.close();
  process.exit(1);
}

// Step 2 — POST /complete_steps
const step2 = await postForm('/complete_steps', {
  project_id: String(projectId),
  steps: '1',
  _token: csrf,
});
console.log('complete_steps:', step2);

// Step 2.5 — typeahead GETs the wizard makes
await getJson(`/ajax_keyword_locations?campaign_id=${projectId}&location=`);
await getJson(`/ajax_keyword_locations?campaign_id=${projectId}&location=main`);

// Step 3 — POST /ajax_store_ranking_details (HAR values verbatim)
const step3 = await postForm('/ajax_store_ranking_details', {
  _token: csrf,
  project_id: String(projectId),
  keyword_field: 'copy this',
  keyword_tag: 'main',
  'searchlocations[]': 'Mainz, Germany',
  'latitude[]': '49.9928617',
  'longitude[]': '8.2472526',
  'locations[]': 'Main Middle,Massachusetts,United States',
  'location_id[]': '9060635',
  add_project_search_engine: 'google.de',
  add_project_language: 'English',
  ignore_local_listing: '0',
  device: 'desktop',
});
console.log('ajax_store_ranking_details:', step3);

// Step 4 — POST /new_project_ajax_send_dfs_request.
// Fired by add_new_project.js bind_keywords() in the ranking-details success callback,
// then immediately followed by window.location.href = '/dashboard'. The redirect
// clears Web Inspector's network log so this call never appears in HAR exports
// (unless "Preserve log" was on), but it IS what actually persists the keyword.
const rankingResp = (step3 as any).json;
const step4 = await postForm('/new_project_ajax_send_dfs_request', {
  'finalKeywords[]': rankingResp.keyword_field, // ["copy this"]
  project_id: String(projectId),
  ignore_local_listing: rankingResp.ignore_local_listing, // "0"
  region: rankingResp.region, // "google.de"
  'dfs_locations[]': 'Mainz, Germany',
  'lat[]': '49.9928617',
  'long[]': '8.2472526',
  'locations[]': 'Main Middle,Massachusetts,United States',
  tag_id: String(rankingResp.tag_id),
  _token: csrf,
});
console.log('new_project_ajax_send_dfs_request:', step4);

// Verify
const stats = await getJson(
  `/ajax_live_keyword_stats?campaign_id=${projectId}&tag_id=&tracking_type=all&locations=`,
);
console.log('live_keyword_stats:', stats);

console.log('projectId =', projectId);
await browser.close();
