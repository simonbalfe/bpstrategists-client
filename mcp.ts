#!/usr/bin/env bun
import { loadEnv } from './env.ts';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  BpStrategistsClient,
  type DashboardName,
  type Device,
  type GmbCtaAction,
  type GmbSectionType,
} from './client.ts';
import { listSupportedCountries } from './locations.ts';
import { setAuthFromCookie } from './auth.ts';

const NO_AUTH_MESSAGE =
  'Not authenticated. Ask the user to open https://bpstrategists.agencydashboard.io in their browser, ' +
  'log in if needed, then DevTools -> Application -> Cookies -> copy the value of `agency_dashboard_session`. ' +
  'Pass that value to the `set_auth` tool.';

let realClient: BpStrategistsClient | null = null;
let cachedToken: string | undefined;
let cachedSession: string | undefined;

function requireClient(): BpStrategistsClient {
  loadEnv();
  const t = process.env.BP_CSRF_TOKEN;
  const s = process.env.BP_AGENCY_SESSION;
  if (!t || !s) throw new Error(NO_AUTH_MESSAGE);
  if (!realClient || t !== cachedToken || s !== cachedSession) {
    realClient = new BpStrategistsClient({ token: t, sessionCookie: s });
    cachedToken = t;
    cachedSession = s;
  }
  return realClient;
}

const client = new Proxy({} as BpStrategistsClient, {
  get(_target, prop) {
    const c = requireClient();
    const value = (c as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? (value as (...args: unknown[]) => unknown).bind(c) : value;
  },
});

const server = new McpServer({
  name: 'bpstrategists',
  version: '0.3.0',
});

server.tool(
  'set_auth',
  [
    'One-time auth bootstrap. Takes the `agency_dashboard_session` cookie value from the user\'s browser,',
    'scrapes the matching CSRF token, and persists both to ./.env. After this succeeds, every other tool',
    'works immediately. Re-run when calls start returning 401 (the cookie lasts ~24h).',
    'How to get the cookie value: open https://bpstrategists.agencydashboard.io in a browser, log in,',
    'DevTools -> Application -> Cookies -> copy the value of `agency_dashboard_session`.',
  ].join(' '),
  {
    cookie: z
      .string()
      .min(1)
      .describe(
        'Either the bare cookie value, or the full `agency_dashboard_session=<value>` pair. Whitespace is trimmed.',
      ),
  },
  async ({ cookie }) => {
    const { token, envPath } = await setAuthFromCookie(cookie);
    return {
      content: [
        {
          type: 'text',
          text: `Authenticated. CSRF token starts with ${token.slice(0, 12)}.... Persisted to ${envPath}.`,
        },
      ],
    };
  },
);

server.tool(
  'create_campaign',
  [
    'Create a tracking campaign end-to-end. Optionally attach any combination of',
    'GSC, GA4, Ads and GMB at create time — each block resolves human-readable labels',
    'to ids via the discovery tools (list_search_console_properties, list_ga4_accounts +',
    'list_ga4_properties, list_ads_accounts, list_gmb_locations).',
  ].join(' '),
  {
    domain: z.string().describe('Domain to track. Must resolve in DNS.'),
    keywords: z.array(z.string()).min(1).describe('Keywords to track.'),
    locations: z
      .array(z.string())
      .min(1)
      .describe(
        `Search Location(s) — controls where Google searches from (lat/long + searchlocations[]). Country names/aliases. Supported: ${listSupportedCountries().join(', ')}.`,
      ),
    volumeLocations: z
      .array(z.string())
      .optional()
      .describe(
        'Optional Volume Location override (DataForSEO volume aggregation region). Country names. If omitted, mirrors locations. Length must match locations.',
      ),
    regionalDb: z
      .string()
      .optional()
      .describe('Override primary country code (e.g. "uk"). Defaults to first location.'),
    projectName: z.string().optional().describe('Defaults to "<domain>-<timestamp>".'),
    dashboards: z
      .array(z.enum(['SEO', 'ADS', 'GMB', 'SOCIAL', 'REPUTO', 'AI']))
      .default(['SEO'])
      .describe('Which dashboards to enable.'),
    keywordTag: z.string().optional().describe('Tag for this keyword set. Defaults to domain.'),
    searchEngine: z.string().optional().describe('Override the per-country default, e.g. google.co.uk.'),
    language: z.string().default('English'),
    device: z.enum(['desktop', 'mobile']).default('desktop'),
    serpType: z
      .enum(['local+organic', 'organic', 'local'])
      .default('local+organic')
      .describe('SERP type. Maps to ignore_local_listing 0/1/2.'),
    urlType: z
      .enum(['Root Domain', 'Exact URL', 'Subdomain', 'Subfolder'])
      .default('Root Domain'),
    searchConsole: z
      .object({
        googleAccount: z.string().describe('Gmail of the OAuth-connected account.'),
        property: z.string().describe('GSC property label from list_search_console_properties.'),
      })
      .optional(),
    ga4: z
      .object({
        googleAccount: z.string().describe('Gmail of the OAuth-connected account.'),
        account: z.string().describe('GA4 account label from list_ga4_accounts.'),
        property: z.string().describe('GA4 property label from list_ga4_properties.'),
      })
      .optional(),
    ads: z
      .object({
        googleAccount: z.string().describe('Gmail of the OAuth-connected account.'),
        account: z.string().describe('Ads account label from list_ads_accounts.'),
      })
      .optional(),
    gmb: z
      .object({
        googleAccount: z.string().describe('Gmail of the OAuth-connected account.'),
        locations: z
          .array(z.string())
          .min(1)
          .describe('One or more GMB location labels from list_gmb_locations.'),
      })
      .optional(),
  },
  async (input) => {
    const result = await client.createCampaign({
      domain: input.domain,
      keywords: input.keywords,
      locations: input.locations,
      volumeLocations: input.volumeLocations,
      regionalDb: input.regionalDb,
      projectName: input.projectName,
      dashboards: input.dashboards as DashboardName[],
      keywordTag: input.keywordTag,
      searchEngine: input.searchEngine,
      language: input.language,
      device: input.device as Device,
      serpType: input.serpType,
      urlType: input.urlType,
      searchConsole: input.searchConsole,
      ga4: input.ga4,
      ads: input.ads,
      gmb: input.gmb,
    });
    return {
      content: [
        {
          type: 'text',
          text: `Created campaign ${result.projectId}\n  dashboard: ${result.dashboardUrl}\n  serp:      ${result.serpUrl}`,
        },
      ],
    };
  },
);

server.tool(
  'list_campaigns',
  'List existing campaigns. Returns id, name, display_name and dashboard URLs.',
  {
    archived: z.boolean().default(false),
    limit: z.number().int().min(1).max(500).default(50),
  },
  async ({ archived, limit }) => {
    const res = await client.listCampaigns({ archived, limit });
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  },
);

server.tool(
  'list_campaign_bindings',
  [
    'List per-campaign integration bindings: GA4 (email id + gmail), Search Console (account/property id),',
    'GMB (location id + name), plus is_connected booleans for every social provider.',
    'Reads ajax_fetch_campaign_datajson for the structured fields, and scrapes /campaign_gmb_content/<id>',
    'to recover the bound GMB location id(s) — the structured endpoint only returns a boolean for GMB.',
    'If campaignId is provided, returns just that campaign.',
  ].join(' '),
  {
    campaignId: z.number().int().optional().describe('Optional. If set, only this campaign is returned.'),
  },
  async ({ campaignId }) => {
    const res = await client.getCampaignBindings({ campaignId });
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  },
);

server.tool(
  'list_google_accounts',
  [
    'List every Google account connected to the workspace, deduplicated by gmail. Each entry includes',
    'a `scopes` object showing which providers (ga4, searchConsole, ads, gmb) that gmail is connected for —',
    'undefined scope = not connected. Reads live from the dashboard (combines /ajax_get_ga4_emails',
    'and the per-provider <select> options on /add-new-campaign). For the raw per-provider pools use list_connected_emails.',
  ].join(' '),
  {},
  async () => {
    const accounts = await client.listConnectedGoogleAccounts();
    return { content: [{ type: 'text', text: JSON.stringify(accounts, null, 2) }] };
  },
);

server.tool(
  'list_connected_emails',
  [
    'List the OAuth-connected Google accounts as the new-campaign wizard sees them, split by provider:',
    'ga4, searchConsole, ads, gmb. Each entry is { id, label } where label is the gmail address.',
    'Use the gmail address as input to list_search_console_properties / list_ads_accounts / list_gmb_locations / list_ga4_accounts.',
    'No campaign id needed — pure OAuth-side discovery.',
  ].join(' '),
  {},
  async () => {
    const res = await client.listWizardEmails();
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  },
);

server.tool(
  'list_search_console_properties',
  'List Google Search Console properties available under a given OAuth account. Pass the Gmail address from list_connected_emails.searchConsole.',
  {
    googleAccount: z.string().describe('Gmail address, e.g. "info@bpstrategists.com".'),
  },
  async ({ googleAccount }) => {
    const wizard = await client.listWizardEmails();
    const email = wizard.searchConsole.find((e) => e.label.toLowerCase() === googleAccount.toLowerCase());
    if (!email) {
      return {
        content: [
          {
            type: 'text',
            text: `"${googleAccount}" not connected to GSC. Available: ${wizard.searchConsole.map((e) => e.label).join(', ') || '(none)'}`,
          },
        ],
      };
    }
    const props = await client.listConsoleProperties(email.id);
    return { content: [{ type: 'text', text: JSON.stringify(props, null, 2) }] };
  },
);

server.tool(
  'list_ads_accounts',
  'List Google Ads (adwords) accounts available under a given OAuth account. Pass the Gmail address from list_connected_emails.ads.',
  {
    googleAccount: z.string().describe('Gmail address, e.g. "info@bpstrategists.com".'),
  },
  async ({ googleAccount }) => {
    const wizard = await client.listWizardEmails();
    const email = wizard.ads.find((e) => e.label.toLowerCase() === googleAccount.toLowerCase());
    if (!email) {
      return {
        content: [
          {
            type: 'text',
            text: `"${googleAccount}" not connected to Ads. Available: ${wizard.ads.map((e) => e.label).join(', ') || '(none)'}`,
          },
        ],
      };
    }
    const accounts = await client.listAdsAccounts(email.id);
    return { content: [{ type: 'text', text: JSON.stringify(accounts, null, 2) }] };
  },
);

server.tool(
  'list_ga4_accounts',
  'First hop of GA4 discovery: list GA4 accounts under a given OAuth account. Pass the Gmail address from list_connected_emails.ga4.',
  {
    googleAccount: z.string().describe('Gmail address, e.g. "info@bpstrategists.com".'),
  },
  async ({ googleAccount }) => {
    const wizard = await client.listWizardEmails();
    const email = wizard.ga4.find((e) => e.label.toLowerCase() === googleAccount.toLowerCase());
    if (!email) {
      return {
        content: [
          {
            type: 'text',
            text: `"${googleAccount}" not connected to GA4. Available: ${wizard.ga4.map((e) => e.label).join(', ') || '(none)'}`,
          },
        ],
      };
    }
    const accounts = await client.listGa4Accounts(email.id);
    return { content: [{ type: 'text', text: JSON.stringify(accounts, null, 2) }] };
  },
);

server.tool(
  'list_ga4_properties',
  'Second (final) hop of GA4 discovery: list GA4 properties under a chosen GA4 account id (from list_ga4_accounts). GA4 has no "view" layer.',
  {
    accountId: z.number().int().describe('Numeric GA4 account id from list_ga4_accounts.'),
  },
  async ({ accountId }) => {
    const props = await client.listGa4Properties(accountId);
    return { content: [{ type: 'text', text: JSON.stringify(props, null, 2) }] };
  },
);

server.tool(
  'archive_campaign',
  'Archive a campaign by numeric id. Moves it to the Archived list and frees a project slot.',
  {
    campaignId: z.number().int().describe('Numeric campaign id (the "id" field from list_campaigns).'),
  },
  async ({ campaignId }) => {
    const res = await client.archiveCampaign(campaignId);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  },
);

server.tool(
  'check_domain',
  'DNS-check a domain before creating. create_campaign rejects unresolvable domains.',
  { domain: z.string() },
  async ({ domain }) => {
    const res = await client.checkDnsRecord(domain);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  },
);

server.tool(
  'list_gmb_locations',
  [
    'List GMB locations under a given OAuth account. Pass the Gmail from list_connected_emails.gmb.',
    'Each returned id is the channelId required by schedule_gmb_post.',
    'No campaign id needed — the dashboard returns the full pool of locations the OAuth account can manage.',
  ].join(' '),
  {
    googleAccount: z
      .string()
      .describe('Gmail address from list_connected_emails.gmb (e.g. "simon@simonbalfe.com").'),
  },
  async ({ googleAccount }) => {
    const wizard = await client.listWizardEmails();
    const email = wizard.gmb.find((e) => e.label.toLowerCase() === googleAccount.toLowerCase());
    if (!email) {
      return {
        content: [
          {
            type: 'text',
            text: `"${googleAccount}" not connected to GMB. Available: ${wizard.gmb.map((e) => e.label).join(', ') || '(none)'}`,
          },
        ],
      };
    }
    const locations = await client.listGmbAccounts(email.id);
    return { content: [{ type: 'text', text: JSON.stringify(locations, null, 2) }] };
  },
);

server.tool(
  'schedule_gmb_post',
  [
    'Publish or schedule a Google Business Profile post via the agency dashboard.',
    'Uploads local image paths first, then creates the post.',
    'Set scheduleTime (YYYY-MM-DD HH:mm:ss in timeZone) to schedule, omit to publish now.',
    'campaignId is the NUMERIC campaign id from list_campaigns.',
    'channelId is the numeric channel id from list_gmb_locations.',
  ].join(' '),
  {
    campaignId: z.number().int().describe('Numeric campaign id from list_campaigns.'),
    channelId: z.number().int().describe('Numeric channel id from list_gmb_locations.'),
    text: z.string().min(1).max(1500).describe('Post body. GMB caps around 1500 characters.'),
    images: z
      .array(z.string())
      .optional()
      .describe('Local file paths to upload, or pre-hosted https URLs to attach as-is.'),
    scheduleTime: z
      .string()
      .optional()
      .describe('"YYYY-MM-DD HH:mm:ss" in timeZone. Omit to publish immediately.'),
    timeZone: z.string().default('Europe/London'),
    sectionType: z.enum(['whatsnew', 'event', 'offer']).default('whatsnew'),
    cta: z
      .object({
        action: z.enum(['none', 'book', 'order', 'shop', 'learn_more', 'sign_up', 'call']),
        url: z.string().optional().describe('Required for actions that need a link.'),
      })
      .optional(),
  },
  async (input) => {
    const result = await client.scheduleGmbPost({
      campaignId: input.campaignId,
      channelId: input.channelId,
      text: input.text,
      images: input.images,
      scheduleTime: input.scheduleTime,
      timeZone: input.timeZone,
      sectionType: input.sectionType as GmbSectionType,
      cta: input.cta as { action: GmbCtaAction; url?: string } | undefined,
    });
    return {
      content: [
        {
          type: 'text',
          text: [
            result.scheduled ? 'Scheduled GMB post.' : 'Published GMB post.',
            result.message && `Server: ${result.message}`,
            result.imageUrls.length && `Images: ${result.imageUrls.join(', ')}`,
          ]
            .filter(Boolean)
            .join('\n'),
        },
      ],
    };
  },
);

server.tool(
  'list_gmb_posts',
  'List scheduled and published social posts for a campaign within a date range.',
  {
    campaignId: z.number().int().describe('Numeric campaign id from list_campaigns.'),
    startDate: z.string().describe('"YYYY-MM-DD".'),
    endDate: z.string().describe('"YYYY-MM-DD".'),
    channelId: z
      .union([z.number().int(), z.literal('all')])
      .default('all')
      .describe('Specific channel id, or "all".'),
  },
  async ({ campaignId, startDate, endDate, channelId }) => {
    const encrypted = await client.getEncryptedCampaignId(campaignId);
    const res = await client.getCalendarPosts({
      campaignId: encrypted,
      numericCampaignId: campaignId,
      startDate,
      endDate,
      channelId,
    });
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  },
);

await server.connect(new StdioServerTransport());
