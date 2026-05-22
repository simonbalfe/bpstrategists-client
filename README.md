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
onto the `bpstrategists.agencydashboard.io` subdomain, and writes the fresh
`BP_TOKEN` + `BP_SESSION` back to `.env`. After running it, reconnect the MCP
server (`/mcp` in Claude Code) so the running process picks up the new env.

## Tools

### `create_campaign`

Create a tracking campaign end-to-end. One call, no IDs to look up.

**In**
- `domain` — domain to track (must resolve in DNS).
- `keywords` — one or more strings.
- `locations` — one or more country names (e.g. `"United Kingdom"`).
- `dashboards` — any of `SEO`, `ADS`, `GMB`, `SOCIAL`, `REPUTO`, `AI`. Defaults to `["SEO"]`.
- `searchConsole` — optional `{ googleAccount, property }` to attach Google Search Console at create time.
- Optional overrides: `projectName`, `keywordTag`, `regionalDb`, `searchEngine`, `language`, `device`.

**Out**
- `projectId` — numeric campaign id.
- `dashboardUrl` — link to the campaign dashboard.
- `serpUrl` — link to the SERP view.

### `list_campaigns`

List existing campaigns.

**In**
- `archived` — `false` (default) for active, `true` for archived.
- `limit` — default 50, max 500.

**Out**
- Array of campaigns: `{ id, name, display_name, url, serp_url }`.

### `archive_campaign`

Archive a campaign. Frees a project slot.

**In** — `campaignId` (numeric id from `list_campaigns`).
**Out** — `{ status, message }`.

### `check_domain`

DNS-check a domain before creating a campaign for it.

**In** — `domain`.
**Out** — server status + tooltip text.

### `list_google_accounts`

List OAuth-connected Google accounts (Gmail addresses) usable for GA4 / Search Console.

**In** — none.
**Out** — array of `{ id, label }` where `label` is the Gmail address.

### `list_search_console_properties`

List Google Search Console properties for a connected Google account.

**In** — `googleAccount` (Gmail address from `list_google_accounts`).
**Out** — array of `{ id, label }` where `label` is the GSC property string
(e.g. `sc-domain:example.com`).

### `schedule_gmb_post`

Publish or schedule a Google Business Profile post.

**In**
- `campaignId` — encrypted Laravel token (the long base64 string from the agency dashboard URL).
- `channelId` — numeric ID of the connected GMB channel on this campaign.
- `text` — post body (max 1500 chars).
- `images` — optional array of local file paths or pre-hosted https URLs.
- `scheduleTime` — `"YYYY-MM-DD HH:mm:ss"` in `timeZone`. Omit to publish now.
- `timeZone` — defaults to `Europe/London`.
- `sectionType` — `whatsnew` (default), `event`, `offer`.
- `cta` — optional `{ action, url }` where action is one of `none`, `book`, `order`, `shop`,
  `learn_more`, `sign_up`, `call`.

**Out** — confirmation message + uploaded image URLs.

### `list_gmb_posts`

List scheduled and published social posts for a campaign within a date range.

**In**
- `campaignId` — encrypted Laravel token.
- `startDate` / `endDate` — `"YYYY-MM-DD"`.
- `channelId` — specific channel ID or `"all"` (default).

**Out** — calendar data array.

## Quick test

```
bun run scripts/test-create.ts        # creates a real campaign via createCampaign()
bun run scripts/test-mcp-create.ts    # spawns mcp.ts and calls create_campaign over MCP stdio
```
