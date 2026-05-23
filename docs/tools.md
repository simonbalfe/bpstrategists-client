# MCP tools reference

Full input/output spec for every tool exposed by `bun run mcp.ts`.

## `create_campaign`

Create a tracking campaign and optionally attach any combination of GSC, GA4, Ads, GMB.

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

## Discovery

| Tool | Input | Returns |
|---|---|---|
| `list_google_accounts` | — | gmails deduplicated, with per-provider scopes |
| `list_connected_emails` | — | same data split into raw per-provider pools |
| `list_search_console_properties` | `googleAccount` | `[{ id, label }]` |
| `list_ads_accounts` | `googleAccount` | `[{ id, label }]` |
| `list_gmb_locations` | `googleAccount` | `[{ id, label }]` (`id` = channel id for `schedule_gmb_post`) |
| `list_ga4_accounts` | `googleAccount` | `[{ id, label }]` |
| `list_ga4_properties` | `accountId` | `[{ id, label }]` |

## Campaign management

| Tool | Input | Returns |
|---|---|---|
| `list_campaigns` | `archived?`, `limit?` | `[{ id, name, display_name, url, serp_url }]` |
| `list_campaign_bindings` | `campaignId?` | GA4/GSC/GMB/Ads ids + `isConnected` flags |
| `archive_campaign` | `campaignId` | `{ status, message }` |
| `check_domain` | `domain` | server status |

## `schedule_gmb_post`

| Field | Type | Required | Default |
|---|---|---|---|
| `campaignId` | number | yes | — |
| `channelId` | number | yes | — |
| `text` | string | yes | ≤1500 chars |
| `images` | string[] | no | — (local paths or `https://` URLs) |
| `scheduleTime` | string | no | now (else `"YYYY-MM-DD HH:mm:ss"`) |
| `timeZone` | string | no | `"Europe/London"` |
| `sectionType` | `"whatsnew"\|"event"\|"offer"` | no | `"whatsnew"` |
| `cta` | `{ action, url? }` | no | — |

CTA actions: `none`, `book`, `order`, `shop`, `learn_more`, `sign_up`, `call`.

**Returns** — `{ scheduled, message, imageUrls }`.

## `list_gmb_posts`

| Field | Type | Required | Default |
|---|---|---|---|
| `campaignId` | number | yes | — |
| `startDate` | `"YYYY-MM-DD"` | yes | — |
| `endDate` | `"YYYY-MM-DD"` | yes | — |
| `channelId` | number\|`"all"` | no | `"all"` |

**Returns** — `{ data: [...] }`.
