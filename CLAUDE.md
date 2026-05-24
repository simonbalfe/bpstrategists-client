# bpstrategists-client agent rules

## Auth tokens (BP_TOKEN, BP_SESSION)

`bun run login` is the only supported way to mint fresh `BP_TOKEN` and `BP_SESSION`. It reads inputs from `./.env` and writes outputs back to the same file. There is no CLI arg path.

Flow when refreshing auth:

1. Edit `./.env` so `BP_EMAIL` and `BP_PASSWORD` hold the credentials you want to log in with. Existing `BP_TOKEN` / `BP_SESSION` can stay; they'll be overwritten.
2. Read `./.env` back to verify both creds are present and free of typos. `login.ts` only sees what's on disk, so anything stale in your head is ignored.
3. Run `bun run login`. On success it rewrites `BP_TOKEN` and `BP_SESSION` in `./.env`.

Rules:

- Never pass credentials to `login.ts` via shell env, flags, or stdin. Always go through `./.env`.
- `./.env` is gitignored. Never commit it. Never paste real cookies into docs.
- A successful login is good for ~24h. Re-run when calls start 401-ing.
- The MCP server (`mcp.ts`) caches `BP_TOKEN` / `BP_SESSION` at startup. After `bun run login`, reconnect it in the host (e.g. `/mcp` reconnect in Claude Code) so it picks up the new values.
- Scripts and tests under `scripts/` and `tests/` import `../env.ts`, which loads `./.env` and overrides `process.env`. Same contract as the MCP server.

## Don't

- Don't write a parallel login flow. If `bun run login` fails, fix `login.ts` rather than working around it.
- Don't read auth from `~/.zshrc`, `~/.env`, or any other location. Repo-local `./.env` only.
