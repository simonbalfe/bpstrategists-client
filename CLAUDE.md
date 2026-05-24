# bpstrategists-client agent rules

## Auth tokens (BP_TOKEN, BP_SESSION)

`bun run login` is the only supported way to mint fresh `BP_TOKEN` and `BP_SESSION`. It reads inputs from `./.env` and writes outputs back to the same file. There is no CLI arg path.

Flow when refreshing auth:

1. Edit `./.env` so `BP_EMAIL` and `BP_PASSWORD` hold the credentials you want to log in with. Existing `BP_TOKEN` / `BP_SESSION` can stay; they'll be overwritten.
2. Read `./.env` back to verify both creds are present and free of typos. `login.ts` only sees what's on disk, so anything stale in your head is ignored.
3. Run `bun run login`. On success it rewrites `BP_TOKEN` and `BP_SESSION` in `./.env`.
4. **Reset MCP state.** The running `mcp.ts` process only reads `./.env` at startup, so it is still holding the old `BP_TOKEN` / `BP_SESSION` in memory. New tokens on disk do nothing until the server is reconnected. In Claude Code, run `/mcp` and reconnect `bpstrategists`. In any other host, kill and restart the MCP process.

Anytime `BP_TOKEN` or `BP_SESSION` changes — whether you ran `bun run login`, hand-edited `./.env`, or pasted in cookies from DevTools — step 4 is mandatory. Skipping it produces stale 401s while `./.env` already shows the new tokens, which is confusing to debug.

Rules:

- Never pass credentials to `login.ts` via shell env, flags, or stdin. Always go through `./.env`.
- `./.env` is gitignored. Never commit it. Never paste real cookies into docs.
- A successful login is good for ~24h. Re-run when calls start 401-ing — then redo step 4.
- Scripts and tests under `scripts/` and `tests/` import `../env.ts`, which loads `./.env` and overrides `process.env`. They pick up the new tokens on next run automatically; the reconnect step is only needed for the long-lived MCP server.

## Don't

- Don't write a parallel login flow. If `bun run login` fails, fix `login.ts` rather than working around it.
- Don't read auth from `~/.zshrc`, `~/.env`, or any other location. Repo-local `./.env` only.
