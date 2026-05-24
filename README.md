# bpstrategists-client

Lets Claude drive the BP Strategists agency dashboard in plain English. Create campaigns, schedule GMB posts, list integrations, archive stuff. Same things you'd do clicking around the dashboard, just by chatting.

---

## Setup (one-time, ~30 seconds)

You need [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`) and [Claude Code](https://claude.com/claude-code).

```
git clone <this-repo>
cd bpstrategists-client
bun install
```

That's it. `bun install` runs an interactive setup that asks how you want to authenticate:

1. **Email + password** — mints fresh tokens via the agency dashboard's login endpoint.
2. **Paste session cookie** — paste the `agency_dashboard_session` cookie value from your browser. Use this if SSO / 2FA / Cloudflare blocks the password flow.
3. **Skip** — set up later with `bun run login` or `bun run login:cookie`.

It then writes tokens to `./.env` (gitignored) and registers the MCP server at user scope. The MCP loads in every Claude Code session on this machine, in any folder. Restart Claude Code once if it was already open.

Re-running `bun install` later is a no-op for auth (existing tokens are preserved).

---

## Daily use

Open Claude Code anywhere and ask:

> create a campaign for acme.com with the keywords "acme widgets", "buy acme" and the GMB location attached

> schedule a GMB post for tomorrow at 5pm on the simonbalfe.com campaign

> list active campaigns

Tokens last roughly 24 hours. When tool calls 401, run `bun run login` again (no args, reads creds from `.env`) and you're back.

---

## What it can do

- **Campaigns** — create, list active/archived, archive, look up integration bindings.
- **Google connections** — list every Google account connected, see what each is connected to (GA4 / Search Console / Ads / GMB).
- **Integrations** — find the right GA4 account, GSC property, Ads account, GMB location to attach.
- **GMB posting** — write a post (now or scheduled), upload images, set a CTA, see what's already scheduled.
- **Domain check** — verify a domain resolves before creating a campaign for it.

---

## Scripts

| Script | Purpose |
|---|---|
| `bun run setup` | Interactive: pick auth method, mint tokens, register MCP. Runs automatically on `bun install`. |
| `bun run login [email] [password]` | Mint tokens from credentials only. Args optional if `BP_EMAIL`/`BP_PASSWORD` already in `.env`. |
| `bun run login:cookie '<cookie>'` | Mint tokens from a pasted `agency_dashboard_session` cookie. |
| `bun run install:mcp` | Re-register the MCP at user scope without touching auth. |
| `bun run reset` | Wipe all state: removes the global MCP entry and truncates `./.env`. Re-run `bun install` to re-set up. |
| `bun run mcp` | Run the MCP server in the foreground (Claude Code normally launches this for you). |

---

## How auth works

`./.env` holds `BP_EMAIL`, `BP_PASSWORD`, `BP_CSRF_TOKEN`, `BP_AGENCY_SESSION`. The MCP server hot-reloads `./.env` on every tool call, so token refreshes take effect with no restart.

There's also a `set_auth` MCP tool that lets Claude refresh tokens directly from a pasted cookie value, without dropping out to the shell.
