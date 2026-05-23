# Dashboard quirks handled internally

Things the client transparently works around so MCP callers don't have to.

## Wizard step numbers

The campaign wizard fires `POST /complete_steps` after each integration is attached, with a `steps=N` field. The number maps to the integration **type**, not the call order. Empirical mapping from captured browser HARs:

| `steps=` | Marks |
|---|---|
| 1 | project shell (`store_project_info`) |
| 2 | Search Console |
| 4 | Google Ads |
| 5 | GA4 |
| (none) | GMB — has no completion step |

Step 3 is unused / legacy. We hard-coded `step=3` for GA4 at one point — server tolerated it but it was wrong; the correct value is `step=5`.

## `complete_steps?steps=4` always 500s

The Ads handshake call is broken server-side. The preceding `ajax_save_new_project_adwords_data` returns 200 and actually persists the Ads link, but `complete_steps` for step 4 always 500s.

The real browser wizard hits the same 500 — its JS swallows the error and proceeds to keywords, and the campaign ends up created with Ads attached. The client mirrors that behavior: retries `step=4` with exponential backoff (1s, 2s, 4s, 8s), then returns silently. Any other step still throws on persistent 500.

## GMB location labels include the channel id

`list_gmb_locations` (and the wizard's own dropdown) return labels like `"HermesOps (14624712567507918236)"`. Callers often pass just `"HermesOps"`. The client's matcher strips the trailing ` (digits)` suffix when comparing, so both forms work.

## GMB post Referer is enforced

Any call to `/storeSocialPostContent`, `/uploadMediaFiles`, `/removeUploadMediaFiles`, `/removeDirectoryAndFiles`, or `/get-calendar-social-post-content` must send `Referer: <baseUrl>/social-post/<numericCampaignId>`. Without it, Laravel rejects with a generic 422 "A server error occurred while posting GMB posts" — no useful body.

## Encrypted campaign ids

The dashboard exposes a numeric campaign id everywhere except a handful of social-posting endpoints, which require a Laravel-encrypted `eyJ...` token. The client scrapes it from `<input id="socialCampaign">` on `/social-post/<numericId>` and passes it transparently — callers always work with numeric ids.

## TLS fingerprint matters for some endpoints

A few wizard endpoints silently no-op writes when the request doesn't look like real Chrome (probably JA3/JA4 inspection). The client uses [`impit`](https://github.com/grafbase/impit) with `browser: 'chrome'` to spoof Chrome's TLS fingerprint, which makes the writes actually persist.

## Chrome HAR doesn't save the response body for non-`Content-Type: text/...` endpoints

When debugging from a HAR, expect `text` to be empty for JSON 500s. The size field is still populated, so you can infer Laravel's generic `{"message":"Server Error"}` (33 bytes) vs an actual error body.
