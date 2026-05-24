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
   BP_USER_ID=
   ```
3. **Mint tokens.** `bun run login`. Rewrites `BP_TOKEN` and `BP_SESSION` in `./.env`. Good for ~24h.
4. **Wire the MCP server into the host** (only once per host):
   - Claude Code (CLI):
     ```
     claude mcp add --transport stdio bpstrategists -- bun run /absolute/path/to/bpstrategists-client/mcp.ts
     ```
     Default scope is `local` (current project, private, lives in `~/.claude.json`). Override with `--scope project|user|local`:
     - `local` (default): current project, private to you.
     - `project`: writes a `.mcp.json` at the repo root, shared with the team via git. First use triggers a one-time trust dialog. Reset with `claude mcp reset-project-choices`.
     - `user`: available across all your projects, private to you.
   - Team-shared `.mcp.json` (commit at repo root):
     ```json
     {
       "mcpServers": {
         "bpstrategists": {
           "type": "stdio",
           "command": "bun",
           "args": ["run", "/absolute/path/to/bpstrategists-client/mcp.ts"]
         }
       }
     }
     ```
     `CLAUDE_PROJECT_DIR` is auto-injected, so a relative path works if teammates clone to a consistent spot.
   - Claude Desktop: edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows) with the same `mcpServers` block (omit `"type": "stdio"`).
   - Cursor: same `mcpServers` block in `.cursor/mcp.json` (project) or `~/.cursor/mcp.json` (global).
   - Reference: https://code.claude.com/docs/en/mcp.md
5. **Reconnect once.** Restart the host, or `/mcp` then reconnect `bpstrategists` in Claude Code. From then on it auto-starts with the host.
6. **Verify.** Call any MCP tool (e.g. `list_campaigns`). 200 means working.

`bun` must be on the host's `PATH` (`which bun` to confirm). The server reads `./.env` from the repo it runs out of, so no env vars need to be passed via the host config.

## Auth tokens (BP_TOKEN, BP_SESSION)

`bun run login` is the only supported way to mint fresh `BP_TOKEN` and `BP_SESSION`. It reads inputs from `./.env` and writes outputs back to the same file. There is no CLI arg path.

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

Rules:

- Never pass credentials to `login.ts` via shell env, flags, or stdin. Always go through `./.env`.
- `./.env` is gitignored. Never commit it. Never paste real cookies into docs.
- A successful login is good for ~24h. Re-run when calls start 401-ing.
- Scripts and tests under `scripts/` and `tests/` import `../env.ts`, which loads `./.env` and overrides `process.env`. They pick up the new tokens on next run automatically — same contract as the MCP proxy.

## Don't

- Don't write a parallel login flow. If `bun run login` fails, fix `login.ts` rather than working around it.
- Don't read auth from `~/.zshrc`, `~/.env`, or any other location. Repo-local `./.env` only.
