# bpstrategists-client agent rules

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
