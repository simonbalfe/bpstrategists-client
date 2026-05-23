# Auth — how `bun run login` works

The BP Strategists dashboard uses Laravel session cookies. Logging in turns email + password into two cookies that act as a bearer token for every subsequent API call.

## What's persisted

Three values total — but only two are session-bound. `BP_EMAIL` + `BP_PASSWORD` are static; `bun run login` reads them and rewrites `BP_TOKEN` + `BP_SESSION` in `.env`.

| Var | Refreshed by login | Notes |
|---|---|---|
| `BP_EMAIL` | no | static |
| `BP_PASSWORD` | no | static |
| `BP_TOKEN` | yes | Laravel CSRF token (`<meta name="csrf-token">`) |
| `BP_SESSION` | yes | full `Cookie:` header string: `XSRF-TOKEN=...; agency_dashboard_session=...` |

No separate user id is needed. The server identifies the user purely from the `agency_dashboard_session` cookie.

## How the server knows which user we are

Every API call sends `Cookie: <BP_SESSION>`. Inside that string is `agency_dashboard_session=<encrypted-blob>`. The server:

1. Decrypts the blob to recover the internal session id.
2. Looks up the session record server-side (DB / Redis / file store).
3. Reads the bound user id off the record.
4. Runs the request as that user, returning only their data.

So `/ajax_get_ga4_emails` doesn't need a `user_id` query param — the cookie already tells the server who we are. Anything in the URL is decorative; we used to send `?user_id=...` to mimic the browser, but the server ignores it (verified by sending random values back-to-back and getting identical results).

## The login flow, step by step

1. `GET https://agencydashboard.io/` → marketing-domain seeds `XSRF-TOKEN` + `agency_dashboard_session` cookies. HTML body has `<meta name="csrf-token" content="...">` — scrape it.
2. `POST https://agencydashboard.io/ajax-do-login` with `email`, `password`, `_token`. Returns JSON containing an SSO bridge URL pointing at `bpstrategists.agencydashboard.io/dashboard/<encrypted>`.
3. Walk the bridge with `redirect: 'manual'`, absorbing every `Set-Cookie` along the way. The chain ends with a 2xx on `bpstrategists.agencydashboard.io/dashboard` and a fresh pair of subdomain-scoped cookies in the jar.
4. Scrape the final `<meta name="csrf-token">` off the dashboard HTML — this is the new CSRF (`BP_TOKEN`).
5. Filter the jar down to cookies whose domain is `bpstrategists.agencydashboard.io`, join as `name=value; name=value` — this is the new `BP_SESSION`.
6. Upsert `BP_TOKEN` + `BP_SESSION` in `.env`, leaving everything else untouched.

After running login, reconnect the MCP server (`/mcp` in Claude Code) so the process picks up the new env.

## Session expiry

Laravel rotates the session record after ~24h. When that happens:

- API responses start coming back as 401 or 419 ("Page Expired").
- Run `bun run login` to fetch a new session and overwrite `BP_TOKEN` + `BP_SESSION`.
- No data is lost — sessions are bearer-style, the server just stops accepting the old one.

## CSRF coupling

Laravel pairs each session with a CSRF token (stored alongside the session record). On state-changing requests (POST/PUT/DELETE), the server requires:

- The `agency_dashboard_session` cookie (identifies you)
- AND the matching CSRF token in either an `X-CSRF-TOKEN` header or `_token` form field

If only one is present, the server rejects with 419 even when the session is otherwise valid. The client sets both on every POST.
