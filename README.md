# bpstrategists-client

MCP server + TypeScript client for the BP Strategists agency dashboard
(`bpstrategists.agencydashboard.io`).

Two entry points:

- `bun run mcp.ts` — exposes the tools below over MCP stdio.
- `import { BpStrategistsClient } from './client.ts'` — same surface as a library.

## Auth

Reads from `./.env`:

- `BP_SESSION` — `Cookie:` header for `bpstrategists.agencydashboard.io` (at minimum `XSRF-TOKEN` + `agency_dashboard_session`).
- `BP_TOKEN` — CSRF token from `<meta name="csrf-token">`. Placeholder is fine; the client refreshes it from `/dashboard` on first use.
- `BP_USER_ID` — numeric user id (stable per account, set once).

Laravel rolls the session ~daily, so the cookies expire. To refresh:

```
# one-time
echo 'BP_EMAIL=you@example.com'  >> .env
echo 'BP_PASSWORD=...'           >> .env

# whenever you start hitting 401s
bun run login
```

`scripts/login.ts` hits `agencydashboard.io/ajax-do-login`, follows the SSO bridge
onto the `bpstrategists.agencydashboard.io` subdomain, and writes fresh
`BP_TOKEN` + `BP_SESSION` back to `.env`. After running it, reconnect the MCP
server (`/mcp` in Claude Code) so the process picks up the new env.

## Tools

### Discovery — Google accounts

All discovery tools are standalone (no `campaignId` needed) and read live from
the dashboard. The dashboard exposes no JSON listing endpoint for connected
emails per provider, so we scrape the `/add-new-campaign` wizard page (only the
known `<select>` IDs) and combine it with `/ajax_get_ga4_emails` for GA4.

#### `list_google_accounts`

Every Google account connected to the workspace, deduplicated by gmail. Each
entry shows which providers it has OAuth scope for.

**In** — none.
**Out** — array of:
```jsonc
{
  "gmail": "info@bpstrategists.com",
  "scopes": { "ga4": 6192, "searchConsole": 3323, "ads": 5881, "gmb": 5297 }
}
```
Scope value = the per-provider OAuth-account internal id; undefined = not connected.

#### `list_connected_emails`

Same data, but split into the four raw per-provider pools (`{ ga4, searchConsole, ads, gmb }`).
Use this when you want to iterate a single provider.

### Discovery — per-provider accounts

Each takes a gmail address (from `list_google_accounts` or `list_connected_emails`)
and returns `{ id, label }` rows.

| Tool | Input | Returns |
|---|---|---|
| `list_search_console_properties` | `googleAccount` | GSC properties (e.g. `sc-domain:example.com`) |
| `list_ads_accounts` | `googleAccount` | Google Ads accounts |
| `list_gmb_locations` | `googleAccount` | GMB locations (`id` = channel id used by `schedule_gmb_post`) |
| `list_ga4_accounts` | `googleAccount` | GA4 accounts (first hop) |
| `list_ga4_properties` | `accountId` | GA4 properties for a chosen account (second/final hop — GA4 has no "view" layer) |

`list_gmb_channels` is kept as a deprecated alias of `list_gmb_locations` (its
old `campaignId` arg is now ignored).

### `create_campaign`

Create a tracking campaign end-to-end. Optionally attach any combination of
GSC, GA4, Ads and GMB at create time — each block resolves human-readable
labels to ids via the discovery tools.

**In**

| Field | Type | Notes |
|---|---|---|
| `domain` | string | Required. Must resolve in DNS. |
| `keywords` | string[] | Required. ≥ 1. |
| `locations` | string[] | Required. Search Location country names — controls `searchlocations[]` + lat/long. |
| `volumeLocations` | string[] | Optional Volume Location override (country names → `locations[]` + `location_id[]`). Length must match `locations`. Defaults to mirror `locations`. |
| `dashboards` | enum[] | Any of `SEO`, `ADS`, `GMB`, `SOCIAL`, `REPUTO`, `AI`. Default `["SEO"]`. |
| `projectName` | string | Default `"<domain>-<timestamp>"`. |
| `keywordTag` | string | Default = `domain`. |
| `regionalDb` | string | Country code override (e.g. `"uk"`). Default = primary location's country. |
| `searchEngine` | string | Default per country (e.g. `"google.co.uk"`). 84 options. |
| `language` | string | Default `"English"`. 24 options. |
| `device` | `"desktop"` \| `"mobile"` | Default `"desktop"`. Server does not support `tablet`. |
| `serpType` | `"local+organic"` \| `"organic"` \| `"local"` | Default `"local+organic"`. Maps to `ignore_local_listing` 0/1/2. |
| `urlType` | `"Root Domain"` \| `"Exact URL"` \| `"Subdomain"` \| `"Subfolder"` | Default `"Root Domain"`. |
| `searchConsole` | `{ googleAccount, property }` | Optional. |
| `ga4` | `{ googleAccount, account, property }` | Optional. |
| `ads` | `{ googleAccount, account }` | Optional. |
| `gmb` | `{ googleAccount, locations: string[] }` | Optional. Multi-select supported natively. |

**Out** — `{ projectId, dashboardUrl, serpUrl }`.

The wizard's exact step-progression is mirrored: GSC marks step 2, GA4 marks 3,
Ads marks 4, GMB has no completion step (per HAR capture). GMB attachment also
fires the wizard's `log_gmb_data` follow-up so posts work immediately.

### `list_campaigns`

**In** — `archived` (default false), `limit` (default 50, max 500).
**Out** — `[{ id, name, display_name, url, serp_url }]`.

### `archive_campaign`

**In** — `campaignId` (numeric).
**Out** — `{ status, message }`.

### `check_domain`

DNS-check a domain before creating a campaign.

**In** — `domain`.
**Out** — server status + tooltip text.

### `schedule_gmb_post`

Publish or schedule a Google Business Profile post. The client resolves the
encrypted Laravel campaign token (`<input id="socialCampaign">` on `/social-post/<id>`)
and sets the right `Referer` internally — callers pass numeric ids only.

**In**
- `campaignId` — **numeric** campaign id from `list_campaigns`.
- `channelId` — numeric channel id from `list_gmb_locations`.
- `text` — post body (max 1500 chars).
- `images` — optional array of local file paths or pre-hosted https URLs.
- `scheduleTime` — `"YYYY-MM-DD HH:mm:ss"` in `timeZone`. Omit to publish now.
- `timeZone` — default `"Europe/London"`.
- `sectionType` — `"whatsnew"` (default), `"event"`, `"offer"`.
- `cta` — optional `{ action, url }`. Action is one of `none`, `book`, `order`,
  `shop`, `learn_more`, `sign_up`, `call`.

**Out** — confirmation message + uploaded image URLs.

### `list_gmb_posts`

List scheduled and published social posts for a campaign within a date range.

**In** — `campaignId` (numeric), `startDate`/`endDate` (`YYYY-MM-DD`),
optional `channelId` (numeric or `"all"` — default).
**Out** — calendar data array.

## Typical agent flow

```
list_google_accounts                                # who's connected, with per-provider scopes
list_gmb_locations(simon@simonbalfe.com)            # pick a GMB location
create_campaign({
  domain: 'mysite.com',
  keywords: ['my brand'],
  locations: ['United Kingdom'],
  dashboards: ['SEO', 'GMB'],
  gmb: { googleAccount: 'simon@simonbalfe.com', locations: ['HermesOps (...)'] },
})
schedule_gmb_post({                                 # numeric campaign id, no encryption step
  campaignId: <projectId>,
  channelId: <from list_gmb_locations>,
  text: '...',
  images: ['/path/to/hero.jpg'],
})
```

## Quick test

```
bun run scripts/test-create.ts        # creates a real campaign via createCampaign()
bun run scripts/test-mcp-create.ts    # spawns mcp.ts and calls create_campaign over MCP stdio
```
