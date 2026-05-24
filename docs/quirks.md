# Dashboard quirks handled internally

Things the client transparently works around so MCP callers don't have to.

## TLS fingerprint matters

Some wizard endpoints silently no-op writes when the request doesn't look like real Chrome (JA3/JA4 inspection on the server). The client uses [`impit`](https://github.com/grafbase/impit) with `browser: 'chrome'` to spoof Chrome's TLS fingerprint so writes actually persist.

## Wizard step numbers

The campaign wizard fires `POST /complete_steps` after each integration is attached, with `steps=N`. The number maps to integration **type**, not call order:

| `steps=` | Marks |
|---|---|
| 1 | project shell (`store_project_info`) |
| 2 | Search Console |
| 4 | Google Ads |
| 5 | GA4 |
| (none) | GMB has no completion step |

Step 3 is unused. `complete_steps step=2` only runs when GSC was actually attached — the server 500s if you mark a step with nothing committed.

## `complete_steps?steps=4` always 500s

The Ads handshake is broken server-side. The preceding `ajax_save_new_project_adwords_data` returns 200 and persists the link, but the handshake always 500s.

The real browser wizard hits the same 500; its JS swallows it and proceeds. The client mirrors that: retries with exponential backoff (1s, 2s, 4s, 8s), then returns silently. Any other step's 500 still throws.

## GMB location labels carry the channel id

`list_gmb_locations` returns labels like `"HermesOps (14624712567507918236)"`. Callers often pass just `"HermesOps"`. The matcher strips the trailing ` (digits)` suffix when comparing, so both forms work.

## GMB attach requires a follow-up `log_gmb_data` ping

`/ajax_update_gmb_data` accepts a multi-select `account[]` (native GMB multi-attach). For each attached location, the client also fires `GET /log_gmb_data?campaign_id&account_id`. Without it, the GMB tab shows "No Location Found" and `/storeSocialPostContent` rejects with 422 "A server error occurred while posting GMB posts". GMB has no `complete_steps` handshake — `ajax_update_gmb_data` (plus the log ping) is the final write.

## GMB post Referer is enforced

`/storeSocialPostContent`, `/uploadMediaFiles`, `/removeUploadMediaFiles`, `/removeDirectoryAndFiles`, and `/get-calendar-social-post-content` must all send `Referer: <baseUrl>/social-post/<numericCampaignId>`. Wrong referer → generic 422 with no useful body.

## Encrypted campaign ids

The dashboard exposes a numeric campaign id everywhere except a handful of social-posting endpoints that require a Laravel-encrypted `eyJ...` token.

- The correct campaign token lives on `/social-post/<numericId>` as `<input id="socialCampaign" value="eyJ...">`.
- `/campaign_gmb_content/<id>` embeds the encrypted **GMB channel** token, not the campaign token — easy to grab the wrong one.

The client scrapes the right one and passes it transparently; callers only see numeric ids.

## `storeSocialPostContent` reads `channels` twice

The form must include `channels` as a plain string (`gmb`) **and** again as a JSON object `{"<channelId>":"gmb"}`. The server reads both.

## GA4 email list comes from a different endpoint

GSC, Ads, GMB email pools are scraped from the `<select>` options on the `/add-new-campaign` HTML (no JSON endpoint exists — every guess like `ajax_get_*_emails` returns the dashboard HTML). GA4 uses `/ajax_get_ga4_emails` because the wizard's `analytics_existing_emails` select is for the dead Universal Analytics flow.

## Keyword writes are a two-step dance

`/ajax_store_ranking_details` (step 3a) returns `status:1` and a `tag_id` but does **not** persist keyword rows. The wizard's success handler then fires `bindNewProjectKeywords` (step 3b) which is what actually writes them. The browser JS does this inline and then immediately navigates to `/dashboard`, so the second call rarely shows up in HAR exports. The client always fires both.

`/ajax_store_ranking_details` returns HTTP 200 with `{status:0, message:"..."}` on failure rather than a non-2xx — the client surfaces that as an error.

## Location ids must be city-level

DFS country-level location ids (e.g. UK=2826) are rejected by `/ajax_store_ranking_details` with a generic "Error!! Please try again." even though the autocomplete endpoint accepts them. City ids work. `locations.ts` keeps a curated city per country.

## `campaignId` query param is decorative on list endpoints

Discovery endpoints like `listConsoleProperties`, `listAdsAccounts`, `listGmbAccounts` accept a `campaign_id` query param but ignore it — verified by diffing responses for `''`, `'0'`, and real campaign ids. The client defaults to `0` so discovery works without an in-flight project.

## CSRF auto-refresh

If only a `remember_web_*` cookie is supplied, the client primes a session on first use by fetching `/dashboard`, absorbing the new cookies, and re-scraping the meta CSRF. From then on every POST sends both the cookie and the matching `X-CSRF-TOKEN` header.

## Chrome HAR strips response bodies on certain content types

When debugging from a HAR, expect `response.content.text` to be empty for JSON 500s. Size field is still populated, so you can infer Laravel's generic `{"message":"Server Error"}` (33 bytes) vs an actual error body.

## PPC + GMB tabs embed bound integrations as HTML hidden inputs

The dashboard's per-campaign view exposes structured fields (`ga4_email_id`, `console_account_id`, `is_connected.*` booleans) via `/ajax_fetch_campaign_datajson`. For Ads and GMB it only returns booleans — the actual ids are embedded as HTML:

- PPC tab: `<input type="hidden" class="account_id" value="<cid>">` — `cid` is the 10-digit dashless Google Ads CID (e.g. `8108264861`).
- GMB tab: `<h3 id="activeLocationName<gmbId>">Name</h3>` — extract `<gmbId>` from the id attribute.

`list_campaign_bindings` scrapes both to surface the real ids.
