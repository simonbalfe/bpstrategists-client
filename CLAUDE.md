# bpstrategists-client agent rules

## Zero-to-working in one go

If the MCP server isn't connected and `./.env` doesn't exist, this is the full path. Stop at the first step that's already done.

1. **Install deps.** `bun install` from the repo root. Needs Bun (`curl -fsSL https://bun.sh/install | bash`).
2. **Seed `./.env`.** Create it with just the login credentials. The token/session lines can stay empty; `bun run login` fills them.
   ```
   BP_EMAIL=you@example.com
   BP_PASSWORD=yourpassword
   BP_TOKEN=
   BP_SESSION=
   ```
3. **Mint tokens.** `bun run login`. Rewrites `BP_TOKEN` and `BP_SESSION` in `./.env`. Good for ~24h.
4. **Wire the MCP server into the host** (only once per host). Claude Code does NOT auto-discover MCP servers when you `cd` into a repo. The server has to be installed explicitly. Three install paths:
   1. **`claude mcp add` (CLI):**
      ```
      claude mcp add --transport stdio bpstrategists -- bun run /absolute/path/to/bpstrategists-client/mcp.ts
      ```
      Default scope is `local` (current project, private, lives in `~/.claude.json`). Override with `--scope project|user|local`:
      - `local` (default): current project, private to you.
      - `project`: writes a `.mcp.json` at the repo root, shared with the team via git. First use triggers a one-time trust dialog. Reset with `claude mcp reset-project-choices`.
      - `user`: available across all your projects, private to you.
   2. **Commit a `.mcp.json` at the repo root** (project-scoped, shared with the team via git):
      ```json
      {
        "mcpServers": {
          "bpstrategists": {
            "type": "stdio",
            "command": "bun",
            "args": ["run", "/absolute/path/to/bpstrategists-client/mcp.ts"],
            "env": { "EXAMPLE_KEY": "value" }
          }
        }
      }
      ```
      `CLAUDE_PROJECT_DIR` is auto-injected into the server's env, so a relative path works if teammates clone to a consistent spot. The `env` field is optional and not needed for this server (it reads `./.env` itself). Project-scoped servers trigger a one-time trust dialog on first use; reset with `claude mcp reset-project-choices`.
   3. **Manually edit `~/.claude.json`** (user-scoped, applies across all your projects). Same `mcpServers` block as above. Equivalent to `claude mcp add --scope user`.
   - Claude Desktop (not Claude Code): edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows) with the same `mcpServers` block (omit `"type": "stdio"`).
   - Cursor (not Claude Code): same `mcpServers` block in `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global).
   - Reference: https://code.claude.com/docs/en/mcp.md
5. **Reconnect once.** Restart the host, or `/mcp` then reconnect `bpstrategists` in Claude Code. From then on it auto-starts with the host.
6. **Verify.** Call any MCP tool (e.g. `list_campaigns`). 200 means working.

`bun` must be on the host's `PATH` (`which bun` to confirm). The server reads `./.env` from the repo it runs out of, so no env vars need to be passed via the host config.

## Auth tokens (BP_TOKEN, BP_SESSION)

Two supported paths to populate `BP_TOKEN` + `BP_SESSION`. Pick one.

### Path A — credential login (default)

`bun run login` reads `BP_EMAIL` + `BP_PASSWORD` from `./.env`, hits the SSO login flow, and writes fresh `BP_TOKEN` + `BP_SESSION` back to the same file. There is no CLI arg path.

Flow when refreshing auth:

1. Edit `./.env` so `BP_EMAIL` and `BP_PASSWORD` hold the credentials you want to log in with. Existing `BP_TOKEN` / `BP_SESSION` can stay; they'll be overwritten.
2. Read `./.env` back to verify both creds are present and free of typos. `login.ts` only sees what's on disk, so anything stale in your head is ignored.
3. Run `bun run login`. On success it rewrites `BP_TOKEN` and `BP_SESSION` in `./.env`.
4. Call any MCP tool. The MCP server hot-reloads `./.env` on every tool call (`mcp.ts:25-43`, proxy around `BpStrategistsClient`), so the new tokens take effect immediately. **No `/mcp` reconnect needed.**

How to verify after `bun run login`:

- Grep `./.env` to confirm `BP_TOKEN` actually changed.
- Call an MCP tool (e.g. `list_campaigns`). If it returns 200, the new token is live.

When you **do** still need to reset the MCP server:

- You changed code in `mcp.ts`, `client.ts`, `env.ts`, or any module they import. Hot-reload only covers env values, not code.
- The MCP process died or was killed (`ps -ef | grep "bun.*mcp.ts"` to check).
- Reset = `/mcp` in Claude Code → reconnect `bpstrategists`, or in any other host kill and let it respawn.

### Path B — paste session cookie from browser

Use when you can't / don't want to type credentials (SSO, 2FA, Cloudflare flaking the login flow, or just already-logged-in in a tab). You paste the session cookie; a one-liner derives the CSRF token from it.

1. **Grab the session cookie.** Browser DevTools → Application → Cookies → `bpstrategists.agencydashboard.io` → copy the value of `agency_dashboard_session`. That one cookie is the entire auth — `XSRF-TOKEN`, analytics cookies, and Google cookies are irrelevant.
2. **Paste into `./.env`:**
   ```
   BP_SESSION="agency_dashboard_session=<paste here>"
   BP_TOKEN=
   ```
3. **Derive the CSRF token.** GET the dashboard with that cookie, scrape `<meta name="csrf-token">`, paste into `BP_TOKEN`. One-liner (run from repo root):
   ```bash
   curl -s -H "Cookie: $(grep -E '^BP_SESSION=' .env | cut -d= -f2- | tr -d '"')" \
     https://bpstrategists.agencydashboard.io/dashboard \
     | grep -oE 'name="csrf-token" content="[^"]+"' | cut -d'"' -f4
   ```
   Copy the printed value into `BP_TOKEN=` in `./.env`.
4. **Verify.** Call any MCP tool. The MCP server hot-reloads `./.env`; no reconnect needed.

Why this works: `BP_SESSION` (cookie) authenticates the user; `BP_TOKEN` (CSRF) only matters for POST/PUT/DELETE. The cookie and the scraped token end up bound to the same Laravel session, so both reads and writes work.

Caveats:
- The cookie expires ~24h after the browser issued it. When calls 401, repeat step 1-3 (or fall back to Path A).
- If the curl in step 3 returns nothing, your cookie is probably dead — the server 302'd you to login.

### Rules (apply to both paths)

- Never pass credentials to `login.ts` via shell env, flags, or stdin. Always go through `./.env`.
- `./.env` is gitignored. Never commit it. Never paste real cookies into docs.
- A successful login is good for ~24h. Re-run when calls start 401-ing.
- Scripts and tests under `scripts/` and `tests/` import `../env.ts`, which loads `./.env` and overrides `process.env`. They pick up the new tokens on next run automatically — same contract as the MCP proxy.

## Don't

- Don't write a parallel login flow. If `bun run login` fails, fix `login.ts` rather than working around it.
- Don't read auth from `~/.zshrc`, `~/.env`, or any other location. Repo-local `./.env` only.
