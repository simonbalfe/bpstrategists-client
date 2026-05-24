# bpstrategists-client

Lets you (or an AI assistant like Claude) control the BP Strategists agency dashboard with plain English instead of clicking through the web UI.

You ask things like *"create a new campaign for acme.com with GA4 and GMB attached"* or *"schedule a GMB post for tomorrow at 5pm"*, and it happens.

---

## What you can ask it to do

- **Campaigns** — create new tracking campaigns, list active or archived ones, archive old ones, look up which integrations a campaign has attached.
- **Google connections** — list every Google account connected to the workspace and what each one is connected to (GA4 / Search Console / Ads / Google Business Profile).
- **Integrations** — find the right GA4 account, Search Console property, Google Ads account, or GMB location to attach to a new campaign.
- **GMB posting** — write a Google Business Profile post (now or scheduled for the future), upload images, set a call-to-action button, see what's already scheduled.
- **Domain check** — confirm a domain is reachable before creating a campaign for it.

You don't need to know any of the technical details below; you just talk to the AI and it handles the dashboard.

---

## One-time setup

You need [Bun](https://bun.sh) installed (`curl -fsSL https://bun.sh/install | bash`), then:

```
bun install
```

Create a file called `.env` in the project folder with your dashboard login:

```
BP_EMAIL=you@example.com
BP_PASSWORD=yourpassword
```

Then log in:

```
bun run login
```

That's it. The login command grabs the cookies it needs and saves them into the same `.env` file. You're now ready to use the tool.

---

## Daily use

### Wire it into your MCP host

You only do this once. The exact command depends on the host:

**Claude Code (CLI):**

```
claude mcp add bpstrategists bun run /absolute/path/to/bpstrategists-client/mcp.ts
```

**Claude Desktop** — open `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows) and add:

```json
{
  "mcpServers": {
    "bpstrategists": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/bpstrategists-client/mcp.ts"]
    }
  }
}
```

**Cursor** — open the project's `.cursor/mcp.json` (or the global `~/.cursor/mcp.json`) and add the same `mcpServers` block as above.

Replace `/absolute/path/to/bpstrategists-client` with wherever you cloned the repo. `bun` must be on the host's `PATH` (`which bun` to confirm). No env vars need to be passed in the config — the server reads `./.env` from the repo it's running out of.

Restart the host (or `/mcp` reconnect in Claude Code) once after adding the entry. From then on it auto-starts whenever the host starts.

### When something stops working

If you get errors saying you're not logged in (typically once every 24 hours):

```
bun run login
```

That's all — it grabs fresh cookies and writes them to `./.env`. The MCP server hot-reloads `./.env` on every tool call, so the next AI request just works. No reconnect needed.

---

## Example things to say

- *"Show me every active campaign."*
- *"Create a campaign for acme.com with these keywords: ..., tracking from the UK, with our Google Ads and GMB attached."*
- *"Which campaigns is the simon@simonbalfe.com GMB account on?"*
- *"Schedule this image as a GMB post for next Tuesday at 9am with a 'Learn more' button linking to acme.com."*
- *"Archive the test campaigns I made yesterday."*
- *"Which Google accounts are connected, and what does each one have access to?"*

---

## Troubleshooting

| Symptom | What to do |
|---|---|
| AI says "missing BP_TOKEN" or login errors | Run `bun run login` to refresh the cookies. |
| AI says "missing BP_EMAIL or BP_PASSWORD" | Add them to `.env` (see "One-time setup" above). |
| Campaign created but missing one integration | The Google Ads handshake is broken on the dashboard server — the integration is actually attached, just check the dashboard to confirm. |
| AI says it can't reach the dashboard | Check your internet connection and that the dashboard is up at https://bpstrategists.agencydashboard.io. |

---

## For developers

- [docs/tools.md](./docs/tools.md) — full MCP tool reference (every input, every output).
- [docs/auth.md](./docs/auth.md) — how the autologin works, what's persisted in `.env`, session expiry.
- [docs/quirks.md](./docs/quirks.md) — dashboard quirks the client handles transparently.

### Scripts

| Script | Purpose |
|---|---|
| `bun run login` | Refresh session cookies from email + password. |
| `bun run scripts/example.ts` | Minimal usage example. |
| `bun run scripts/list-bp.ts` | List active campaigns. |
| `bun run scripts/list-gmb.ts` | List every GMB channel reachable across active campaigns. |

### Tests

Two end-to-end smoke tests covering the main flows:

| Test | Purpose |
|---|---|
| `bun run tests/create-campaign.ts` | Create a campaign with all 4 integrations attached and verify the bindings. |
| `bun run tests/schedule-gmb-post.ts` | Schedule a GMB post and verify it appears in the calendar. |
