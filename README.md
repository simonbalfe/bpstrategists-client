# bpstrategists-client

MCP server + TypeScript client for the BP Strategists agency dashboard
(`bpstrategists.agencydashboard.io`).

Two entry points:

- `bun run mcp.ts` — exposes the tools below over MCP stdio.
- `import { BpStrategistsClient } from './client.ts'` — same surface as a library.

## Setup

```
bun install
cp .env.example .env   # if you have one, otherwise create it
```

Required env vars in `./.env`:

| Var | Used for | How to get it |
|---|---|---|
| `BP_EMAIL` | autologin | dashboard login email |
| `BP_PASSWORD` | autologin | dashboard password |
| `BP_USER_ID` | API calls | numeric user id (stable per account, one-time) |
| `BP_TOKEN` | CSRF | populated by `bun run login` |
| `BP_SESSION` | session cookie | populated by `bun run login` |

`BP_USER_ID` is stable per account — set it once. The other two are session-bound and refresh via the autologin below.

## Auth (autologin)

Laravel rolls the session ~daily, so cookies expire. Don't hand-copy them — use the autologin:

```
bun run login
```

This runs `scripts/login.ts` which:

1. `GET agencydashboard.io/` — seeds XSRF + session cookies on the marketing domain, scrapes `<meta name="csrf-token">`.
2. `POST agencydashboard.io/ajax-do-login` with `BP_EMAIL` + `BP_PASSWORD` + the CSRF token.
3. Follows the SSO bridge URL onto `bpstrategists.agencydashboard.io`, picking up the subdomain's session cookies.
4. `GET bpstrategists.agencydashboard.io/dashboard` — scrapes the fresh CSRF.
5. Writes the refreshed `BP_TOKEN` + `BP_SESSION` back to `./.env`.

After running it, reconnect the MCP server (`/mcp` in Claude Code) so the process picks up the new env. Re-run any time you start hitting 401s.

## MCP tools

### `create_campaign` — the main tool

Create a tracking campaign and optionally attach any combination of GSC, GA4, Ads, GMB in one call.

**Inputs**

| Field | Type | Required | Default |
|---|---|---|---|
| `domain` | string | yes | — |
| `keywords` | string[] | yes | — |
| `locations` | string[] | yes | — |
| `dashboards` | `("SEO"\|"ADS"\|"GMB"\|"SOCIAL"\|"REPUTO"\|"AI")[]` | no | `["SEO"]` |
| `volumeLocations` | string[] | no | mirrors `locations` |
| `regionalDb` | string | no | first location's country |
| `projectName` | string | no | `"<domain>-<timestamp>"` |
| `keywordTag` | string | no | `domain` |
| `searchEngine` | string | no | per-country default |
| `language` | string | no | `"English"` |
| `device` | `"desktop"\|"mobile"` | no | `"desktop"` |
| `serpType` | `"local+organic"\|"organic"\|"local"` | no | `"local+organic"` |
| `urlType` | `"Root Domain"\|"Exact URL"\|"Subdomain"\|"Subfolder"` | no | `"Root Domain"` |
| `searchConsole` | `{ googleAccount, property }` | no | — |
| `ga4` | `{ googleAccount, account, property }` | no | — |
| `ads` | `{ googleAccount, account }` | no | — |
| `gmb` | `{ googleAccount, locations: string[] }` | no | — |

**Returns** — `{ projectId, dashboardUrl, serpUrl }`.

Integration blocks use human-readable labels — resolve them with the discovery tools below.

### Discovery — Google accounts

| Tool | Input | Returns |
|---|---|---|
| `list_google_accounts` | none | gmails deduplicated, with which provider scopes each has |
| `list_connected_emails` | none | same data split into raw per-provider pools |

### Discovery — per-provider accounts

Each takes a `googleAccount` gmail and returns `{ id, label }` rows.

| Tool | Input | Returns |
|---|---|---|
| `list_search_console_properties` | `googleAccount` | GSC properties |
| `list_ads_accounts` | `googleAccount` | Google Ads accounts |
| `list_gmb_locations` | `googleAccount` | GMB locations (`id` = channel id for `schedule_gmb_post`) |
| `list_ga4_accounts` | `googleAccount` | GA4 accounts (first hop) |
| `list_ga4_properties` | `accountId` | GA4 properties for a chosen account |

### Campaign management

| Tool | Input | Notes |
|---|---|---|
| `list_campaigns` | `archived?`, `limit?` | Default `archived=false`, `limit=50`. |
| `list_campaign_bindings` | `campaignId?` | Returns GA4/GSC/GMB/Ads ids + `isConnected` flags. Omit `campaignId` for all. |
| `archive_campaign` | `campaignId` | Moves to Archived, frees a project slot. |
| `check_domain` | `domain` | DNS-check before `create_campaign`. |

### GMB posting

#### `schedule_gmb_post`

| Field | Type | Required | Default |
|---|---|---|---|
| `campaignId` | number | yes | — |
| `channelId` | number | yes | — |
| `text` | string | yes | — (≤1500) |
| `images` | string[] | no | — (local paths OR `https://` URLs) |
| `scheduleTime` | string | no | now (else `"YYYY-MM-DD HH:mm:ss"` in `timeZone`) |
| `timeZone` | string | no | `"Europe/London"` |
| `sectionType` | `"whatsnew"\|"event"\|"offer"` | no | `"whatsnew"` |
| `cta` | `{ action, url? }` | no | — |

CTA actions: `none`, `book`, `order`, `shop`, `learn_more`, `sign_up`, `call`.

The client handles the encrypted Laravel campaign token and the Referer dance — callers pass numeric ids only.

#### `list_gmb_posts`

| Field | Type | Required | Default |
|---|---|---|---|
| `campaignId` | number | yes | — |
| `startDate` | string | yes | `YYYY-MM-DD` |
| `endDate` | string | yes | `YYYY-MM-DD` |
| `channelId` | number\|`"all"` | no | `"all"` |

## Typical flow

```
list_google_accounts                            // find connected gmails + scopes
list_gmb_locations(simon@simonbalfe.com)        // pick a location label
create_campaign({
  domain: 'mysite.com',
  keywords: ['my brand'],
  locations: ['United Kingdom'],
  dashboards: ['SEO', 'GMB'],
  gmb: { googleAccount: 'simon@simonbalfe.com', locations: ['HermesOps'] },
})
schedule_gmb_post({ campaignId, channelId, text, images })
```

## Quirks handled internally

- **Ads step-4 handshake 500s server-side.** The Ads attach itself returns 200 and persists; the cosmetic `/complete_steps?steps=4` call always 500s — even in the real browser wizard (verified via HAR capture). The client retries with exponential backoff, then swallows the 500 so campaign creation completes.
- **Step numbers map to integration type, not call order.** Wizard uses `1=shell, 2=GSC, 4=Ads, 5=GA4`. GMB has no completion step.
- **GMB location labels.** Wizard surfaces labels like `"HermesOps (14624712567507918236)"`. The client accepts either the full label or the bare name.
- **GMB post Referer.** All `/storeSocialPostContent` and `/uploadMediaFiles` calls must be referer'd as `/social-post/<numericId>` or Laravel rejects with a generic 422.

## Quick test

```
bun run scripts/test-create.ts          # creates a campaign via createCampaign()
bun run scripts/test-all-params.ts      # every optional param set explicitly + all 4 integrations
bun run scripts/test-mcp-create.ts      # spawns mcp.ts and calls create_campaign over MCP stdio
```
