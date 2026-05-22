import { Impit } from 'impit';
import { resolveCountry } from './locations.ts';

const BASE_URL = 'https://bpstrategists.agencydashboard.io';

export type UrlType = 'Root Domain' | 'Subdomain' | 'Subfolder';
export type RegionalDb = 'us' | 'uk' | string;

export type Dashboard =
  | 1   // SEO
  | 2   // ADS
  | 3   // GMB
  | 4   // SOCIAL
  | 13  // REPUTO
  | 15; // AI

export type Device = 'desktop' | 'mobile' | 'tablet';

export type SearchLocation = {
  searchLocation: string;
  latitude: number;
  longitude: number;
  country: string;
  locationId: number;
};

export type StoreProjectInfoInput = {
  projectName: string;
  domainUrl: string;
  urlType?: UrlType;
  regionalDb?: RegionalDb;
  dashboards: Dashboard[];
  existedId?: number;
};

export type StoreProjectInfoResponse = {
  status: 'success' | 'error' | string;
  step: number;
  last_id: number;
  message: string;
  dashboards: string;
  actual: number;
  domain_url_value: string;
  field?: string;
};

export type StoreRankingDetailsInput = {
  projectId: number;
  keywords: string[];
  keywordTag: string;
  locations: SearchLocation[];
  searchEngine: string;
  language: string;
  ignoreLocalListing: 0 | 1 | 2;
  device: Device;
};

export type AddKeywordsDataInput = {
  campaignId: number;
  domainUrl: string;
  /** Defaults to "Root Domain". */
  keywordDomainType?: 'Root Domain' | 'Subdomain' | 'Subfolder';
  /** Optional grouping label. */
  keywordTag?: string;
  /** Tag color hex (defaults to "#FF2171"). */
  tagColor?: string;
  keywords: string[];
  locations: SearchLocation[];
  /** e.g. "google.co.uk". */
  searchEngineRegion: string;
  /** e.g. "English". */
  language: string;
  ignoreLocalListing: 0 | 1 | 2;
  device: Device;
};

export type AddKeywordsDataResponse = {
  status: 1 | '1' | 0 | '0' | string;
  message?: string;
  error?: string;
  today?: string;
  newKeywords?: string[];
  /** Keywords grouped into per-DFS-request batches. */
  keywordFinal?: string[][];
  tag_id?: number | string;
};

export type SendDfsRequestInput = {
  campaignId: number;
  domainUrl: string;
  keywords: string[];
  /** Search engine domain, e.g. "google.co.uk". */
  regions: string;
  language: string;
  locations: SearchLocation[];
  device: Device;
  /** Defaults to "Root Domain". */
  keywordDomainType?: 'Root Domain' | 'Subdomain' | 'Subfolder';
  /** SERP type: 0 Local+Organic, 1 Organic, 2 Local. */
  ignoreLocalListing: 0 | 1 | 2;
  tagId?: number | string;
};

export type SendDfsRequestResponse = {
  status: 1 | '1' | 0 | '0' | string;
  message?: string;
  error?: string;
  keywordsArray?: Array<{
    location: string;
    language: string;
    user_id: number;
    request_id: string;
    keywords: string[];
  }>;
};

export type StoreRankingDetailsResponse = {
  /** 1 on success, 0 on failure. */
  status: 0 | 1;
  message?: string;
  /** Numeric project id as a string. */
  project_id?: string;
  /** Encrypted Laravel campaign id (long base64 token). */
  projectId?: string;
  keyword?: 'true' | 'false';
  /** Keywords the server accepted, echoed back for the bind step. */
  keyword_field?: string[];
  /** Search engine domain echoed back, e.g. "google.co.uk". */
  region?: string;
  /** Tag id assigned to this keyword set. Required by bindNewProjectKeywords. */
  tag_id?: number | string;
  ignore_local_listing?: string | number;
};

export type BindNewProjectKeywordsInput = {
  projectId: number;
  /** Pass response.keyword_field from storeRankingDetails. */
  finalKeywords: string[];
  /** Pass response.region from storeRankingDetails. */
  region: string;
  /** Pass response.ignore_local_listing from storeRankingDetails. */
  ignoreLocalListing: 0 | 1 | 2;
  /** Pass response.tag_id from storeRankingDetails. */
  tagId: number | string;
  /** Same location set that was sent to storeRankingDetails. */
  locations: SearchLocation[];
};

export type BindNewProjectKeywordsResponse = {
  status: 0 | 1 | '0' | '1';
  message?: string;
  project_id?: string;
};


export type GoogleAccountOption = {
  /** Internal account ID used in attach payloads. */
  id: number;
  /** Display label, e.g. "info@bpstrategists.com" or "sc-domain:example.com". */
  label: string;
};

export type AttachIntegrationInput = {
  campaignId: number;
  /** OAuth account internal ID (from list_connected_emails / list_ga4_emails). */
  email: number;
  /** Property internal ID (from listConsoleProperties / listGa4Accounts). */
  account: number;
};

export type Campaign = {
  id: number;
  name: string;
  display_name: string;
  url: string;
  serp_url: string;
};

export type CampaignListResponse = {
  success: boolean;
  campaigns: Campaign[];
  count: number;
  total_count: number;
  has_more: boolean;
  offset: string;
  limit: string;
};

export type FullCampaignInput = StoreProjectInfoInput & {
  ranking: Omit<StoreRankingDetailsInput, 'projectId'>;
  integrations?: {
    searchConsole?: { email: number; account: number };
  };
};

export type ClientConfig = {
  token: string;
  sessionCookie: string;
  userId: number;
  baseUrl?: string;
};

// -------- GMB / social posting (same host) --------

export type GmbCtaAction =
  | 'none'
  | 'book'
  | 'order'
  | 'shop'
  | 'learn_more'
  | 'sign_up'
  | 'call';

export type GmbSectionType = 'whatsnew' | 'event' | 'offer';

export type UploadMediaResult = {
  fileName: string;
  url: string;
  type: string;
  width?: number;
  height?: number;
};

export type StoreSocialPostResult = {
  success: boolean;
  message: string;
  errors: unknown[];
};

export type ScheduleGmbPostInput = {
  /** Encrypted Laravel campaignId (the long base64 token from a /social-post/<id> page). */
  campaignId: string;
  /** Numeric channel ID for the connected GMB account on this campaign. */
  channelId: number;
  text: string;
  /** Local file paths to upload, or already-hosted https URLs to attach as-is. */
  images?: string[];
  /** "YYYY-MM-DD HH:mm:ss" in `timeZone`. Omit to publish immediately. */
  scheduleTime?: string;
  timeZone?: string;
  sectionType?: GmbSectionType;
  cta?: {
    action: GmbCtaAction;
    /** URL for actions that need a link (learn_more, book, order, shop, sign_up). */
    url?: string;
  };
};

export const DASHBOARD_BY_NAME: Record<string, Dashboard> = {
  SEO: 1,
  ADS: 2,
  GMB: 3,
  SOCIAL: 4,
  REPUTO: 13,
  AI: 15,
};

export type DashboardName = keyof typeof DASHBOARD_BY_NAME;

export type CreateCampaignInput = {
  domain: string;
  projectName?: string;
  /** Names like "SEO", "ADS". Defaults to ["SEO"]. */
  dashboards?: DashboardName[];
  keywords: string[];
  keywordTag?: string;
  /** One or more country names/aliases, e.g. ["United Kingdom"] or ["uk", "us"]. */
  locations: string[];
  /** Override the primary country used for regional_db + default search engine. Defaults to locations[0]. */
  regionalDb?: string;
  searchEngine?: string;
  language?: string;
  device?: Device;
  /** Optional GSC attachment using human-readable strings. */
  searchConsole?: {
    /** Gmail address of the OAuth account, e.g. "info@bpstrategists.com". */
    googleAccount: string;
    /** Exact GSC property string, e.g. "sc-domain:example.com". */
    property: string;
  };
};

export type CreateCampaignResult = {
  projectId: number;
  dashboardUrl: string;
  serpUrl: string;
};

export class BpStrategistsClient {
  private token: string;
  private readonly baseUrl: string;
  /** Cookie jar — kept in sync with Set-Cookie responses so we get the browser's rolling-session behavior. */
  private readonly cookies = new Map<string, string>();
  /** Have we fetched at least one HTML page to ensure the CSRF token matches the current session? */
  private primed = false;
  /** Chrome-impersonating HTTP client. Some endpoints (notably the wizard's
   * /ajax_store_ranking_details) silently no-op writes when the request doesn't
   * look like it came from a real Chrome browser — TLS fingerprint included. */
  private readonly http: Impit;
  readonly userId: number;

  constructor(config: ClientConfig) {
    this.token = config.token;
    this.userId = config.userId;
    this.baseUrl = config.baseUrl ?? BASE_URL;
    this.http = new Impit({ browser: 'chrome' });
    for (const [k, v] of parseCookieHeader(config.sessionCookie)) {
      this.cookies.set(k, v);
    }
    // Always prime on first POST: even with a fresh session cookie, the supplied
    // CSRF token may be stale (or a placeholder). One GET /dashboard refreshes it
    // from the meta tag and keeps the jar in sync.
  }

  /** Current cookie header value. Useful for persisting between runs. */
  cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  // -------- Discovery --------

  async listCampaigns(opts: { limit?: number; offset?: number; archived?: boolean } = {}): Promise<CampaignListResponse> {
    const path = opts.archived ? '/get_archived_campaigns' : '/get_active_campaigns';
    const qs = new URLSearchParams({
      limit: (opts.limit ?? 500).toString(),
      offset: (opts.offset ?? 0).toString(),
    });
    return (await this.getJson(`${path}?${qs}`)) as CampaignListResponse;
  }

  async checkDomainName(name: string, userId: number): Promise<unknown> {
    return this.getJson(`/checkDomainName?search=${encodeURIComponent(name)}&user_id=${userId}`);
  }

  /** Move a campaign to the archived list. Frees a project slot. */
  async archiveCampaign(campaignId: number): Promise<{ status: number | string; message?: string }> {
    const body = new URLSearchParams({
      request_id: campaignId.toString(),
      _token: this.token,
    });
    return this.postJson('/ajax_archive_campaign', body);
  }

  async checkDnsRecord(domain: string, userId: number): Promise<unknown> {
    return this.getJson(`/checkdnsrr?search=${encodeURIComponent(domain)}&user_id=${userId}`);
  }

  // -------- Integration discovery --------

  /** OAuth-connected Google accounts (one row per Gmail address) usable for GA4 picker. */
  async listGa4Emails(userId: number): Promise<GoogleAccountOption[]> {
    const html = await this.getString(`/ajax_get_ga4_emails?user_id=${userId}`);
    return parseOptions(html);
  }

  /** GA4 properties under a given OAuth account. */
  async listGa4Accounts(email: number, campaignId: number): Promise<GoogleAccountOption[]> {
    const html = await this.getString(`/ajax_get_ga4_accounts?email=${email}&campaign_id=${campaignId}`);
    return parseOptions(html);
  }

  /** GSC properties under a given OAuth account. */
  async listConsoleProperties(email: number, campaignId: number): Promise<GoogleAccountOption[]> {
    const html = await this.getString(`/ajax_get_console_urls?email=${email}&campaign_id=${campaignId}`);
    return parseOptions(html);
  }

  // -------- Project creation flow --------

  async storeProjectInfo(input: StoreProjectInfoInput): Promise<StoreProjectInfoResponse> {
    const body = new URLSearchParams();
    body.set('existed_id', input.existedId?.toString() ?? '');
    body.set('project_name', input.projectName);
    body.set('domain_url', input.domainUrl);
    body.set('addNew_url_type', input.urlType ?? 'Root Domain');
    body.set('regional_db', input.regionalDb ?? 'us');
    for (const id of input.dashboards) {
      body.append(`dashboardType[${id}]`, id.toString());
    }
    const res = await this.postJson<StoreProjectInfoResponse>('/store_project_info', body);
    if (res.status !== 'success') {
      throw new Error(`store_project_info: ${res.message} (field=${res.field ?? 'unknown'})`);
    }
    return res;
  }

  async completeSteps(projectId: number, step: number): Promise<void> {
    const body = new URLSearchParams({
      project_id: projectId.toString(),
      steps: step.toString(),
      _token: this.token,
    });
    // Server 500s for a short window after store_project_info commits while
    // background jobs spin up. Retry with exponential backoff: 1s, 2s, 4s, 8s.
    const delays = [1000, 2000, 4000, 8000];
    let lastErr: unknown;
    for (let i = 0; i < delays.length + 1; i++) {
      try {
        await this.postRaw('/complete_steps', body);
        return;
      } catch (err) {
        if (!(err instanceof Error) || !err.message.includes('HTTP 500')) throw err;
        lastErr = err;
        if (i < delays.length) await new Promise((r) => setTimeout(r, delays[i]));
      }
    }
    throw lastErr;
  }

  /**
   * Wizard step 3a: create the project's keyword shell + tag.
   * Returns status:1 and a tag_id but does NOT persist keyword rows on its own —
   * the wizard's success handler then fires bindNewProjectKeywords (step 3b)
   * which is what actually writes the keywords. See add_new_project.js:807-825.
   */
  async storeRankingDetails(input: StoreRankingDetailsInput): Promise<StoreRankingDetailsResponse> {
    const body = new URLSearchParams();
    body.set('_token', this.token);
    body.set('project_id', input.projectId.toString());
    body.set('keyword_field', input.keywords.join('\r\n'));
    body.set('keyword_tag', input.keywordTag);
    for (const loc of input.locations) {
      body.append('searchlocations[]', loc.searchLocation);
      body.append('latitude[]', loc.latitude.toString());
      body.append('longitude[]', loc.longitude.toString());
      body.append('locations[]', loc.country);
      body.append('location_id[]', loc.locationId.toString());
    }
    body.set('add_project_search_engine', input.searchEngine);
    body.set('add_project_language', input.language);
    body.set('ignore_local_listing', input.ignoreLocalListing.toString());
    body.set('device', input.device);
    const res = await this.postJson<StoreRankingDetailsResponse>('/ajax_store_ranking_details', body);
    // Server returns HTTP 200 with {status:0, message:"..."} on failure. Surface it.
    if (res.status !== 1) {
      throw new Error(`store_ranking_details failed: ${res.message ?? JSON.stringify(res)}`);
    }
    return res;
  }


  /**
   * Wizard step 3b: bind the keywords created by storeRankingDetails to the project.
   * Posts the same location set + the tag_id returned by step 3a. The wizard JS
   * fires this from inside the storeRankingDetails success callback, then does
   * `window.location.href = '/dashboard'` on the next line — which is why this
   * call never appears in browser HAR exports.
   */
  async bindNewProjectKeywords(input: BindNewProjectKeywordsInput): Promise<BindNewProjectKeywordsResponse> {
    const body = new URLSearchParams();
    body.set('_token', this.token);
    body.set('project_id', input.projectId.toString());
    for (const kw of input.finalKeywords) body.append('finalKeywords[]', kw);
    body.set('ignore_local_listing', input.ignoreLocalListing.toString());
    body.set('region', input.region);
    for (const loc of input.locations) {
      body.append('dfs_locations[]', loc.searchLocation);
      body.append('lat[]', loc.latitude.toString());
      body.append('long[]', loc.longitude.toString());
      body.append('locations[]', loc.country);
    }
    body.set('tag_id', input.tagId.toString());
    const res = await this.postJson<BindNewProjectKeywordsResponse>(
      '/new_project_ajax_send_dfs_request',
      body,
    );
    if (res.status !== 1 && res.status !== '1') {
      throw new Error(`new_project_ajax_send_dfs_request failed: ${res.message ?? JSON.stringify(res)}`);
    }
    return res;
  }

  // -------- Add-to-existing-campaign keyword flow --------
  // The wizard's storeRankingDetails endpoint is unreliable outside a real browser
  // session (returns status:1 but never persists). These two endpoints back the
  // dashboard's "Add Keywords" popup and work from any HTTP client.

  /** Step 1: register keywords against an existing campaign. */
  async addKeywordsData(input: AddKeywordsDataInput): Promise<AddKeywordsDataResponse> {
    const body = new URLSearchParams();
    body.set('_token', this.token);
    body.set('campaign_id', input.campaignId.toString());
    body.set('domain_url', input.domainUrl);
    body.set('keyword_domain_type', input.keywordDomainType ?? 'Root Domain');
    body.set('keyword_tag', input.keywordTag ?? '');
    body.set('color-radio', input.tagColor ?? '#FF2171');
    body.set('keyword_field', input.keywords.join('\r\n'));
    for (const loc of input.locations) {
      body.append('searchlocations[]', loc.searchLocation);
      body.append('latitude[]', loc.latitude.toString());
      body.append('longitude[]', loc.longitude.toString());
      body.append('locations[]', loc.country);
      body.append('location_id[]', loc.locationId.toString());
    }
    body.set('search_engine_region', input.searchEngineRegion);
    body.set('language', input.language);
    body.set('ignore_local_listing', input.ignoreLocalListing.toString());
    body.set('tracking_options', input.device);
    const res = await this.postJson<AddKeywordsDataResponse>('/ajax_add_keywords_data', body);
    if (res.status !== '1' && res.status !== 1) {
      throw new Error(`ajax_add_keywords_data failed: ${res.message ?? JSON.stringify(res)}`);
    }
    return res;
  }

  /** Step 2: queue DataForSEO ranking lookups for keywords just registered. */
  async sendDfsRequest(input: SendDfsRequestInput): Promise<SendDfsRequestResponse> {
    const body = new URLSearchParams();
    body.set('_token', this.token);
    body.set('campaign_id', input.campaignId.toString());
    body.set('domain_url', input.domainUrl);
    for (const kw of input.keywords) body.append('finalKeywords[]', kw);
    body.set('regions', input.regions);
    body.set('language', input.language);
    for (const loc of input.locations) {
      body.append('dfs_locations[]', loc.searchLocation);
      body.append('lat[]', loc.latitude.toString());
      body.append('long[]', loc.longitude.toString());
      body.append('locations[]', loc.country);
      body.append('location_id[]', loc.locationId.toString());
    }
    body.set('tracking_options', input.device);
    body.set('keyword_domain_type', input.keywordDomainType ?? 'Root Domain');
    body.set('serp', input.ignoreLocalListing.toString());
    body.set('tagId', String(input.tagId ?? ''));
    const res = await this.postJson<SendDfsRequestResponse>('/ajax_send_dfs_request', body);
    if (res.status !== '1' && res.status !== 1) {
      throw new Error(`ajax_send_dfs_request failed: ${res.message ?? JSON.stringify(res)}`);
    }
    return res;
  }

  // -------- Integrations (Search Console) --------

  /** Attach a GSC property to a brand new project (in-wizard step 2). */
  async attachSearchConsole(input: AttachIntegrationInput): Promise<unknown> {
    return this.postJson('/ajax_save_new_project_console_data', this.integrationBody(input));
  }

  /** Change the GSC property on an existing project (settings page). */
  async updateSearchConsole(input: AttachIntegrationInput): Promise<unknown> {
    return this.postJson('/ajax_update_console_data', this.integrationBody(input));
  }

  /** Remove the GSC connection from a campaign. */
  async disconnectSearchConsole(campaignId: number): Promise<unknown> {
    const body = new URLSearchParams({
      request_id: campaignId.toString(),
      _token: this.token,
    });
    return this.postJson('/ajax_disconnect_console', body);
  }

  // -------- Composed flows --------

  /**
   * High-level: create a campaign end-to-end using human-friendly names.
   * Resolves location, dashboards, and (optionally) GSC integration internally.
   */
  async createCampaign(input: CreateCampaignInput): Promise<CreateCampaignResult> {
    if (!input.locations.length) throw new Error('At least one location is required.');
    const resolved = input.locations.map(resolveCountry);
    const primary = resolved[0];
    const dashboardNames = input.dashboards ?? ['SEO'];
    const dashboards = dashboardNames.map((n) => {
      const id = DASHBOARD_BY_NAME[n];
      if (!id) throw new Error(`Unknown dashboard "${n}". Known: ${Object.keys(DASHBOARD_BY_NAME).join(', ')}`);
      return id;
    });
    const projectName = input.projectName ?? `${input.domain}-${Date.now()}`;
    const keywordTag = input.keywordTag ?? input.domain;

    const projectId = await this.createCampaignShell({
      projectName,
      domainUrl: input.domain,
      urlType: 'Root Domain',
      regionalDb: input.regionalDb ?? primary.regionalDb,
      dashboards,
    });

    if (input.searchConsole) {
      const emails = await this.listGa4Emails(this.userId);
      const email = emails.find(
        (e) => e.label.toLowerCase() === input.searchConsole!.googleAccount.toLowerCase(),
      );
      if (!email) {
        throw new Error(
          `Google account "${input.searchConsole.googleAccount}" not connected. Available: ${emails.map((e) => e.label).join(', ')}`,
        );
      }
      const properties = await this.listConsoleProperties(email.id, projectId);
      const property = properties.find(
        (p) => p.label.toLowerCase() === input.searchConsole!.property.toLowerCase(),
      );
      if (!property) {
        throw new Error(
          `GSC property "${input.searchConsole.property}" not found under ${email.label}. Available: ${properties.map((p) => p.label).join(', ')}`,
        );
      }
      await this.attachSearchConsole({ campaignId: projectId, email: email.id, account: property.id });
      // Mark step 2 complete only when we actually attached an integration.
      // With no GSC, the server has nothing to commit and 500s.
      await this.completeSteps(projectId, 2);
    }

    // Matches the wizard's 4-POST flow exactly. The earlier workaround
    // (ajax_add_keywords_data + ajax_send_dfs_request) is retained on this
    // client for the separate "Add Keywords" popup on existing campaigns.
    const locs = resolved.map((r) => ({
      searchLocation: r.searchLocation,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country,
      locationId: r.locationId,
    }));
    const ignoreLocalListing = 0 as const; // wizard default (Local + Organic)
    const tracking = input.device ?? 'desktop';
    const searchEngine = input.searchEngine ?? primary.searchEngine;
    const language = input.language ?? 'English';

    const ranking = await this.storeRankingDetails({
      projectId,
      keywords: input.keywords,
      keywordTag,
      locations: locs,
      searchEngine,
      language,
      ignoreLocalListing,
      device: tracking,
    });

    await this.bindNewProjectKeywords({
      projectId,
      finalKeywords: ranking.keyword_field ?? input.keywords,
      region: ranking.region ?? searchEngine,
      ignoreLocalListing: (Number(ranking.ignore_local_listing ?? ignoreLocalListing) || 0) as 0 | 1 | 2,
      tagId: ranking.tag_id ?? '',
      locations: locs,
    });

    return {
      projectId,
      dashboardUrl: `${this.baseUrl}/campaign-detail/${projectId}`,
      serpUrl: `${this.baseUrl}/serp/${projectId}`,
    };
  }

  /** Step 1 only: create the campaign shell and advance past Campaign Info. */
  async createCampaignShell(input: StoreProjectInfoInput): Promise<number> {
    const project = await this.storeProjectInfo(input);
    await this.completeSteps(project.last_id, 1);
    return project.last_id;
  }

  /** Full wizard: project info -> integrations (optional) -> ranking details -> bind. */
  async createFullCampaign(input: FullCampaignInput): Promise<number> {
    const projectId = await this.createCampaignShell(input);

    if (input.integrations?.searchConsole) {
      await this.attachSearchConsole({
        campaignId: projectId,
        ...input.integrations.searchConsole,
      });
      await this.completeSteps(projectId, 2);
    }

    const ranking = await this.storeRankingDetails({ ...input.ranking, projectId });
    await this.bindNewProjectKeywords({
      projectId,
      finalKeywords: ranking.keyword_field ?? input.ranking.keywords,
      region: ranking.region ?? input.ranking.searchEngine,
      ignoreLocalListing: (Number(ranking.ignore_local_listing ?? input.ranking.ignoreLocalListing) || 0) as 0 | 1 | 2,
      tagId: ranking.tag_id ?? '',
      locations: input.ranking.locations,
    });
    return projectId;
  }

  // -------- GMB / social posting --------

  async uploadMedia(opts: {
    campaignId: string;
    file: Blob;
    fileName: string;
    /** Must match the `datetime` sent in storeSocialPost. */
    datetime: string;
    type?: 'image' | 'video';
    postType?: string;
  }): Promise<UploadMediaResult> {
    const form = new FormData();
    form.append('socialpostfile[]', opts.file, opts.fileName);
    form.append('campaignId', opts.campaignId);
    form.append('type', opts.type ?? 'image');
    form.append('_token', this.token);
    form.append('datetime', opts.datetime);
    form.append('postType', opts.postType ?? 'whatnew');
    const res = await this.postMultipart('/uploadMediaFiles', form);
    const json = (await res.json()) as { status: boolean; fileData?: UploadMediaResult };
    if (!json.status || !json.fileData) {
      throw new Error(`uploadMediaFiles failed: ${JSON.stringify(json)}`);
    }
    return json.fileData;
  }

  async storeSocialPost(opts: {
    campaignId: string;
    channelId: number;
    channelType: 'gmb';
    datetime: string;
    scheduleTime?: string;
    timeZone?: string;
    posts: Array<{
      channelType: 'gmb';
      text: string;
      images?: string[];
      button?: { inputText: string; activeValue: GmbCtaAction; remaining: number };
      fileType?: 'image' | 'video' | '';
      sectionType?: GmbSectionType;
    }>;
  }): Promise<StoreSocialPostResult> {
    const form = new FormData();
    form.append('campaignId', opts.campaignId);
    form.append('channelIds', opts.channelId.toString());
    form.append('channels', opts.channelType);
    form.append('_token', this.token);
    form.append('datetime', opts.datetime);
    form.append('scheduleTime', opts.scheduleTime ?? '');
    form.append('timeZone', opts.timeZone ?? 'Europe/London');
    form.append('result', JSON.stringify(opts.posts));
    // Second `channels` field, JSON-encoded — the server reads both.
    form.append('channels', JSON.stringify({ [opts.channelId]: opts.channelType }));
    const res = await this.postMultipart('/storeSocialPostContent', form);
    return (await res.json()) as StoreSocialPostResult;
  }

  async removeUploadedMedia(opts: {
    campaignId: string;
    fileName: string;
    datetime: string;
    fileType?: 'image' | 'video';
  }): Promise<unknown> {
    const body = new URLSearchParams({
      fileName: opts.fileName,
      campaignId: opts.campaignId,
      _token: this.token,
      datetime: opts.datetime,
      fileType: opts.fileType ?? 'image',
    });
    return this.postJson('/removeUploadMediaFiles', body);
  }

  async cleanupUploadDirectory(campaignId: string): Promise<unknown> {
    const body = new URLSearchParams({ campaignId, _token: this.token });
    return this.postJson('/removeDirectoryAndFiles', body);
  }

  async getCalendarPosts(opts: {
    campaignId: string;
    /** "YYYY-MM-DD". */
    startDate: string;
    /** "YYYY-MM-DD". */
    endDate: string;
    channelId?: string | number;
  }): Promise<{ data: unknown[] }> {
    const body = new URLSearchParams({
      campaignId: opts.campaignId,
      _token: this.token,
      channelId: (opts.channelId ?? 'all').toString(),
      startDate: opts.startDate,
      endDate: opts.endDate,
    });
    return this.postJson('/get-calendar-social-post-content', body);
  }

  /** Upload local images, then publish or schedule a GMB post. https:// URLs in `images` are passed through. */
  async scheduleGmbPost(input: ScheduleGmbPostInput): Promise<{
    scheduled: boolean;
    message: string;
    imageUrls: string[];
    raw: StoreSocialPostResult;
  }> {
    if (!input.text.trim() && !(input.images?.length)) {
      throw new Error('GMB post needs at least text or one image.');
    }
    const datetime = formatLocalDatetime(new Date());
    const cta = input.cta?.action ?? 'none';
    const ctaUrl = input.cta?.url ?? '';

    const imageUrls: string[] = [];
    for (const item of input.images ?? []) {
      if (/^https?:\/\//i.test(item)) {
        imageUrls.push(item);
        continue;
      }
      imageUrls.push(await this.uploadLocalImage(input.campaignId, item, datetime));
    }

    const sectionType = input.sectionType ?? 'whatsnew';
    const raw = await this.storeSocialPost({
      campaignId: input.campaignId,
      channelId: input.channelId,
      channelType: 'gmb',
      datetime,
      scheduleTime: input.scheduleTime ?? '',
      timeZone: input.timeZone ?? 'Europe/London',
      posts: [
        {
          channelType: 'gmb',
          text: input.text,
          images: imageUrls,
          button: {
            inputText: ctaUrl,
            activeValue: cta,
            remaining: Math.max(0, 1500 - input.text.length),
          },
          fileType: imageUrls.length ? 'image' : '',
          sectionType,
        },
      ],
    });

    await this.cleanupUploadDirectory(input.campaignId).catch(() => undefined);

    return {
      scheduled: Boolean(input.scheduleTime),
      message: raw.message ?? '',
      imageUrls,
      raw,
    };
  }

  private async uploadLocalImage(
    campaignId: string,
    filePath: string,
    datetime: string,
  ): Promise<string> {
    const file = Bun.file(filePath);
    if (!(await file.exists())) throw new Error(`Image not found: ${filePath}`);
    const fileName = filePath.split('/').pop() || 'upload.jpg';
    const mime = file.type || guessMime(fileName);
    const blob = new Blob([await file.arrayBuffer()], { type: mime });
    const uploaded = await this.uploadMedia({
      campaignId,
      file: blob,
      fileName,
      datetime,
      type: mime.startsWith('video/') ? 'video' : 'image',
    });
    return uploaded.url;
  }

  // -------- HTTP plumbing --------

  private async postMultipart(path: string, form: FormData): Promise<Response> {
    await this.ensurePrimed();
    if (form.has('_token')) form.set('_token', this.token);
    const res = await this.http.fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.baseHeaders('multipart'),
      body: form,
    });
    this.absorbSetCookie(res);
    this.assertOk(res, path);
    return res;
  }

  /**
   * Make sure we have a session cookie and a CSRF token that match each other.
   * Triggered automatically before the first POST when only a remember_web_* cookie was supplied.
   */
  private async ensurePrimed(): Promise<void> {
    if (this.primed) return;
    const res = await this.http.fetch(`${this.baseUrl}/dashboard`, {
      method: 'GET',
      headers: this.baseHeaders('GET'),
    });
    this.absorbSetCookie(res);
    if (res.ok) {
      const html = await res.text();
      const m = html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
      if (m) this.token = m[1];
    }
    this.primed = true;
  }

  private integrationBody(input: AttachIntegrationInput): URLSearchParams {
    return new URLSearchParams({
      campaign_id: input.campaignId.toString(),
      email: input.email.toString(),
      account: input.account.toString(),
      _token: this.token,
    });
  }

  private async getJson(path: string): Promise<unknown> {
    const res = await this.getRaw(path);
    return res.json();
  }

  private async getString(path: string): Promise<string> {
    const res = await this.getRaw(path);
    const text = await res.text();
    // Some endpoints return JSON-encoded strings; others return raw HTML.
    try {
      const parsed = JSON.parse(text);
      return typeof parsed === 'string' ? parsed : text;
    } catch {
      return text;
    }
  }

  private async getRaw(path: string): Promise<Response> {
    const res = await this.http.fetch(`${this.baseUrl}${path}`, {
      method: 'GET',
      headers: this.baseHeaders('GET'),
    });
    this.absorbSetCookie(res);
    this.assertOk(res, path);
    return res;
  }

  private async postJson<T>(path: string, body: URLSearchParams): Promise<T> {
    const res = await this.postRaw(path, body);
    return res.json() as Promise<T>;
  }

  private async postRaw(path: string, body: URLSearchParams): Promise<Response> {
    await this.ensurePrimed();
    // _token field, if present, should reflect the current (possibly refreshed) CSRF.
    if (body.has('_token')) body.set('_token', this.token);
    const res = await this.http.fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: this.baseHeaders('POST'),
      body: body.toString(),
    });
    this.absorbSetCookie(res);
    this.assertOk(res, path);
    return res;
  }

  private baseHeaders(method: 'GET' | 'POST' | 'multipart'): Record<string, string> {
    const h: Record<string, string> = {
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8,zh-CN;q=0.7,zh;q=0.6',
      Origin: this.baseUrl,
      Priority: 'u=1, i',
      Referer: `${this.baseUrl}/add-new-campaign`,
      'Sec-Ch-Ua': '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"macOS"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
      'X-CSRF-TOKEN': this.token,
      'X-Requested-With': 'XMLHttpRequest',
      Cookie: this.cookieHeader(),
    };
    if (method === 'POST') {
      h['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
    }
    // For multipart, let fetch set Content-Type (with the right boundary).
    return h;
  }

  private assertOk(res: Response, path: string): void {
    if (res.status >= 300 && res.status < 400) {
      throw new Error(
        `${path} → ${res.status} redirect to ${res.headers.get('location')}. Session cookie likely expired.`,
      );
    }
    if (!res.ok) {
      throw new Error(`${path} → HTTP ${res.status}`);
    }
  }

  /** Read Set-Cookie headers and update the jar, like a browser would. */
  private absorbSetCookie(res: Response): void {
    // `getSetCookie` returns each Set-Cookie separately. Bun + Node 20+ support it.
    const lines = typeof (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (res.headers as unknown as { getSetCookie: () => string[] }).getSetCookie()
      : [];
    for (const line of lines) {
      const first = line.split(';', 1)[0];
      const idx = first.indexOf('=');
      if (idx <= 0) continue;
      const name = first.slice(0, idx).trim();
      const value = first.slice(idx + 1).trim();
      // Treat empty value as a delete (Set-Cookie sets value to '' to expire it).
      if (value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
}

function parseCookieHeader(header: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  for (const piece of header.split(';')) {
    const idx = piece.indexOf('=');
    if (idx <= 0) continue;
    out.push([piece.slice(0, idx).trim(), piece.slice(idx + 1).trim()]);
  }
  return out;
}

function parseOptions(html: string): GoogleAccountOption[] {
  const out: GoogleAccountOption[] = [];
  const re = /<option\s+value="(\d+)"[^>]*>([^<]+)<\/option>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const id = Number(m[1]);
    if (!Number.isFinite(id) || id === 0) continue;
    out.push({ id, label: m[2].trim() });
  }
  return out;
}

function formatLocalDatetime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function guessMime(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'mp4':
      return 'video/mp4';
    case 'mov':
      return 'video/quicktime';
    default:
      return 'application/octet-stream';
  }
}
