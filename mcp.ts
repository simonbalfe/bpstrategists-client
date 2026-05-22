#!/usr/bin/env bun
import './env.ts'; // load .env from this repo, override shell env
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

const token = process.env.BP_TOKEN;
const sessionCookie = process.env.BP_SESSION;
const userId = Number(process.env.BP_USER_ID);
if (!token || !sessionCookie || !Number.isFinite(userId)) {
  console.error(
    'Missing BP_TOKEN, BP_SESSION, or BP_USER_ID in ./.env (this repo).',
  );
  process.exit(1);
}

const client = new BpStrategistsClient({ token, sessionCookie, userId });

const server = new McpServer({
  name: 'bpstrategists',
  version: '0.3.0',
});

// --- The one tool that matters ---

server.tool(
  'create_campaign',
  [
    'Create a tracking campaign end-to-end. Single call, no IDs to look up.',
    'Required: domain, keywords, location (country name).',
    `Optional: dashboards (defaults to ['SEO']), Google Search Console attachment by Gmail + property name.`,
    'Use list_search_console_properties first if you need to find available GSC properties.',
  ].join(' '),
  {
    domain: z.string().describe('Domain to track. Must resolve in DNS.'),
    keywords: z.array(z.string()).min(1).describe('Keywords to track.'),
    locations: z
      .array(z.string())
      .min(1)
      .describe(
        `One or more country names/aliases to track. Supported: ${listSupportedCountries().join(', ')}.`,
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
    device: z.enum(['desktop', 'mobile', 'tablet']).default('desktop'),
    searchConsole: z
      .object({
        googleAccount: z
          .string()
          .describe('Gmail of the OAuth-connected account, e.g. "info@bpstrategists.com".'),
        property: z
          .string()
          .describe('Exact GSC property string, e.g. "sc-domain:example.com".'),
      })
      .optional(),
  },
  async (input) => {
    const result = await client.createCampaign({
      domain: input.domain,
      keywords: input.keywords,
      locations: input.locations,
      regionalDb: input.regionalDb,
      projectName: input.projectName,
      dashboards: input.dashboards as DashboardName[],
      keywordTag: input.keywordTag,
      searchEngine: input.searchEngine,
      language: input.language,
      device: input.device as Device,
      searchConsole: input.searchConsole,
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

// --- Discovery (only the bits a caller can't already know) ---

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
  'list_google_accounts',
  'List OAuth-connected Google accounts (Gmail addresses) usable for GA4 / Search Console.',
  {},
  async () => {
    const res = await client.listGa4Emails(client.userId);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  },
);

server.tool(
  'list_search_console_properties',
  'List Google Search Console properties available under a given OAuth account. Pass the Gmail address from list_google_accounts.',
  {
    googleAccount: z.string().describe('Gmail address, e.g. "info@bpstrategists.com".'),
  },
  async ({ googleAccount }) => {
    const emails = await client.listGa4Emails(client.userId);
    const email = emails.find((e) => e.label.toLowerCase() === googleAccount.toLowerCase());
    if (!email) {
      return {
        content: [
          {
            type: 'text',
            text: `Account "${googleAccount}" not connected. Available: ${emails.map((e) => e.label).join(', ')}`,
          },
        ],
      };
    }
    // Need an existing campaign_id; use the most recent active one.
    const campaigns = await client.listCampaigns({ limit: 1 });
    const campaignId = campaigns.campaigns[0]?.id ?? 0;
    const props = await client.listConsoleProperties(email.id, campaignId);
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
    const res = await client.checkDnsRecord(domain, client.userId);
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  },
);

server.tool(
  'list_gmb_channels',
  [
    'List GMB locations (channels) connected to a campaign via a given Google account.',
    'Each returned id is the channelId required by schedule_gmb_post.',
    'Returns [] if the account has GMB connected but no locations chosen for this campaign,',
    'or if GMB is not connected at all on this campaign.',
  ].join(' '),
  {
    googleAccount: z
      .string()
      .describe('Gmail address from list_google_accounts (e.g. "info@bpstrategists.com").'),
    campaignId: z.number().int().describe('Numeric campaign id from list_campaigns.'),
  },
  async ({ googleAccount, campaignId }) => {
    const emails = await client.listGa4Emails(client.userId);
    const email = emails.find((e) => e.label.toLowerCase() === googleAccount.toLowerCase());
    if (!email) {
      return {
        content: [
          {
            type: 'text',
            text: `Account "${googleAccount}" not connected. Available: ${emails.map((e) => e.label).join(', ')}`,
          },
        ],
      };
    }
    const channels = await client.listGmbAccounts(email.id, campaignId);
    return { content: [{ type: 'text', text: JSON.stringify(channels, null, 2) }] };
  },
);

server.tool(
  'get_encrypted_campaign_id',
  'Resolve a numeric campaign id to the encrypted Laravel token needed by schedule_gmb_post and list_gmb_posts.',
  {
    campaignId: z.number().int().describe('Numeric campaign id from list_campaigns.'),
  },
  async ({ campaignId }) => {
    const token = await client.getEncryptedCampaignId(campaignId);
    return { content: [{ type: 'text', text: token }] };
  },
);

// --- GMB social posting (agency dashboard) ---

server.tool(
  'schedule_gmb_post',
  [
    'Publish or schedule a Google Business Profile post via the agency dashboard.',
    'Uploads local image paths first, then creates the post.',
    'Set scheduleTime (YYYY-MM-DD HH:mm:ss in timeZone) to schedule, omit to publish now.',
    'campaignId is the encrypted token string from the agency dashboard URL/page (not the numeric id).',
    'channelId is the numeric ID of the connected GMB channel on this campaign.',
  ].join(' '),
  {
    campaignId: z
      .string()
      .describe('Encrypted Laravel campaignId (the long base64 token from the agency dashboard).'),
    channelId: z.number().int().describe('Numeric channel ID for the connected GMB account.'),
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
    campaignId: z.string().describe('Encrypted Laravel campaignId from the agency dashboard.'),
    startDate: z.string().describe('"YYYY-MM-DD".'),
    endDate: z.string().describe('"YYYY-MM-DD".'),
    channelId: z
      .union([z.number().int(), z.literal('all')])
      .default('all')
      .describe('Specific channel ID, or "all".'),
  },
  async ({ campaignId, startDate, endDate, channelId }) => {
    const res = await client.getCalendarPosts({ campaignId, startDate, endDate, channelId });
    return { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }] };
  },
);

await server.connect(new StdioServerTransport());
