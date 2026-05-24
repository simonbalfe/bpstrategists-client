# bpstrategists-client — agent rules

See `README.md` for the human-facing overview (what the tools do, setup commands, troubleshooting). This file is the agent-only layer on top.

## What this is

MCP server that drives the BP Strategists agency dashboard. `bun install` does the full setup: postinstall hook runs `scripts/setup.ts`, which prompts for auth method (email+password OR cookie paste OR skip), writes tokens to `./.env`, and registers the MCP at user scope. Loads in every Claude Code session on this machine regardless of cwd.

## Auth

Two paths, both write `BP_CSRF_TOKEN` + `BP_AGENCY_SESSION` to `./.env` AND register the MCP at user scope on success (idempotent — safe to re-run). Tokens last ~24h.

- **Credential login** (primary): `bun run login` reads `BP_EMAIL`+`BP_PASSWORD` from `./.env` (or accepts them as args) and mints fresh tokens via the dashboard's `/ajax-do-login` endpoint. First-time use during `bun install` prompts interactively.
- **Cookie paste** (fallback): `bun run login:cookie '<value>'` or the `set_auth` MCP tool accepts the `agency_dashboard_session` cookie value from the user's browser. Use this when credential login is blocked (SSO, 2FA, Cloudflare). Steps: open https://bpstrategists.agencydashboard.io in the user's browser → DevTools → Application → Cookies → copy `agency_dashboard_session` value.

When a tool returns 401 / "Not authenticated":
1. If `BP_EMAIL` + `BP_PASSWORD` are already in `.env`, suggest the user run `bun run login` in the terminal.
2. If not, walk them through the cookie-paste flow and call `set_auth` with the value they paste.

## Don't

- Don't ask the user to edit `.env` by hand. `bun run setup`, `bun run login`, `bun run login:cookie`, and `set_auth` are the only sanctioned writers.
- Don't create a parallel auth flow. If any auth path errors, surface the error verbatim.
- Don't read auth from `~/.zshrc` or any other env source. Repo-local `./.env` only.
- Don't restart the MCP after auth changes. The proxy in `mcp.ts` hot-reloads `./.env` on every call.
- **Don't write one-off scripts (curl, bun, python, anything) to hit the BP dashboard directly.** Every dashboard call must go through the `bpstrategists` MCP tools. Reasons: (1) the MCP enforces the configured auth flow; if the MCP isn't loaded, you'll catch that before issuing a half-authed request; (2) the MCP is the single place CSRF + cookie + endpoint logic lives, so client behaviour stays consistent; (3) ad-hoc scripts skip the `set_auth` / re-login prompt path and leave the user with broken state. If a needed action isn't exposed, add a tool to `mcp.ts` rather than scripting around it.

## Refreshing the install

If the user moves the repo, run `bun run install:mcp` to re-register the MCP at user scope with the new absolute path. (Or just re-run `bun install`, which is idempotent for both MCP install and auth.)
