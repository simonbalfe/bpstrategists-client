import { Impit } from 'impit';
import { resolveCountry } from './locations.ts';

const BASE_URL = 'https://bpstrategists.agencydashboard.io';

export type UrlType = 'Root Domain' | 'Exact URL' | 'Subdomain' | 'Subfolder';
export type RegionalDb = 'us' | 'uk' | string;

export type Dashboard =
  | 1   // SEO
  | 2   // ADS
  | 3   // GMB
  | 4   // SOCIAL
  | 13  // REPUTO
  | 15; // AI

export type Device = 'desktop' | 'mobile';

export type SerpType = 'local+organic' | 'organic' | 'local';
const SERP_TYPE_TO_FLAG: Record<SerpType, 0 | 1 | 2> = {
  'local+organic': 0,
  organic: 1,
  local: 2,
};

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

export type CampaignDirectoryRow = {
  id: number;
  domain_name: string;
  domain_url: string;
  regional_db: string;
  ga4_email_id: number | null;
  console_account_id: number | null;
  is_connected: Record<string, boolean>;
  [key: string]: unknown;
};

export type CampaignDirectoryResponse = {
  data: CampaignDirectoryRow[];
  [key: string]: unknown;
};

export type CampaignGmbLocation = { id: number; name: string };

export type CampaignBindings = {
  campaignId: number;
  name: string;
  domain: string;
  ga4: { emailId: number; email: string | null } | null;
  searchConsole: { propertyAccountId: number } | null;
  gmb: { locations: CampaignGmbLocation[] } | null;
  ads: { customerId: string } | null;
  isConnected: Record<string, boolean>;
};

export type FullCampaignInput = StoreProjectInfoInput & {
  ranking: Omit<StoreRankingDetailsInput, 'projectId'>;
  integrations?: {
    searchConsole?: { email: number; account: number };
    ads?: { email: number; account: number };
    gmb?: { email: number; accounts: number[] };
    ga4?: { email: number; account: number; property: number };
  };
};

export type WizardEmailOptions = {
  /** OAuth accounts with GA4 scope. Sourced from /ajax_get_ga4_emails (the wizard's own GA4 section uses this endpoint, not a server-rendered select). */
  ga4: GoogleAccountOption[];
  /** OAuth accounts in the GSC dropdown of the new-campaign wizard. */
  searchConsole: GoogleAccountOption[];
  /** OAuth accounts in the Ads (adwords) dropdown. */
  ads: GoogleAccountOption[];
  /** OAuth accounts in the GMB dropdown. */
  gmb: GoogleAccountOption[];
};

export type ConnectedGoogleAccount = {
  /** Gmail address — case-preserved from whichever provider list it first appeared in. */
  gmail: string;
  /** Per-provider OAuth-account internal ID. Undefined if that provider isn't connected for this gmail. */
  scopes: {
    ga4?: number;
    searchConsole?: number;
    ads?: number;
    gmb?: number;
  };
};

export type AttachGmbInput = {
  campaignId: number;
  /** OAuth account internal ID (from WizardEmailOptions.gmb). */
  email: number;
  /** One or more GMB location IDs (from listGmbAccounts). */
  accounts: number[];
};

export type AttachGa4Input = {
  campaignId: number;
  /** OAuth account internal ID (from listGa4Emails / WizardEmailOptions.ga4). */
  email: number;
  /** GA4 account ID (from listGa4Accounts). */
  account: number;
  /** GA4 property ID (from listGa4Properties). */
  property: number;
};

export type ClientConfig = {
  token: string;
  sessionCookie: string;
  userId: number;
  baseUrl?: string;
};

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
  /** Numeric campaign id. The client resolves the encrypted token + correct Referer internally. */
  campaignId: number;
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
  /** One or more country names/aliases — controls Search Location (lat/long + searchlocations[]). */
  locations: string[];
  /**
   * Optional Volume Location override (DataForSEO volume aggregation region) —
   * country names that map to locations[] + location_id[] in the POST. If
   * omitted, Volume Location mirrors `locations`. When supplied, length must
   * match `locations`.
   */
  volumeLocations?: string[];
  /** Override the primary country used for regional_db + default search engine. Defaults to locations[0]. */
  regionalDb?: string;
  searchEngine?: string;
  language?: string;
  device?: Device;
  /** SERP type — defaults to "local+organic". */
  serpType?: SerpType;
  /** URL type — defaults to "Root Domain". */
  urlType?: UrlType;
  /** Optional GSC attachment using human-readable strings. */
  searchConsole?: {
    /** Gmail address of the OAuth account, e.g. "info@bpstrategists.com". */
    googleAccount: string;
    /** Exact GSC property string, e.g. "sc-domain:example.com". */
    property: string;
  };
  /** Optional Google Ads attachment using human-readable strings. */
  ads?: {
    googleAccount: string;
    /** Exact account label as shown in the wizard's adwords account dropdown. */
    account: string;
  };
  /** Optional GMB attachment using human-readable strings. Locations may be multi-select. */
  gmb?: {
    googleAccount: string;
    /** One or more GMB location labels (e.g. "My Business — London"). */
    locations: string[];
  };
  /** Optional GA4 attachment. The account → property chain is resolved by label. */
  ga4?: {
    googleAccount: string;
    /** GA4 account label (from listGa4Accounts). */
    account: string;
    /** GA4 property label (from listGa4Properties). */
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
  private readonly cookies = new Map<string, string>();
  private primed = false;
  // Chrome TLS fingerprint required — some wizard endpoints silently no-op
  // writes when the request doesn't look like real Chrome.
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
  }

  cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async listCampaigns(opts: { limit?: number; offset?: number; archived?: boolean } = {}): Promise<CampaignListResponse> {
    const path = opts.archived ? '/get_archived_campaigns' : '/get_active_campaigns';
    const qs = new URLSearchParams({
      limit: (opts.limit ?? 500).toString(),
      offset: (opts.offset ?? 0).toString(),
    });
    return (await this.getJson(`${path}?${qs}`)) as CampaignListResponse;
  }

  // Richer per-campaign view: includes ga4_email_id, console_account_id, and
  // is_connected.{gmb,google_ads,facebook,instagram,...} booleans.
  async fetchCampaignDirectory(opts: { page?: number; limit?: number; query?: string; dashboardCategory?: number } = {}): Promise<CampaignDirectoryResponse> {
    const qs = new URLSearchParams({
      page: (opts.page ?? 1).toString(),
      limit: (opts.limit ?? 500).toString(),
      query: opts.query ?? '',
      query_type: 'campaign:',
      column_name: 'keywords',
      order_type: 'desc',
      dash_category: (opts.dashboardCategory ?? 1).toString(),
    });
    return (await this.getJson(`/ajax_fetch_campaign_datajson?${qs}`)) as CampaignDirectoryResponse;
  }

  // The PPC tab embeds the bound Google Ads customer id (CID) as
  // `<input type="hidden" class="account_id" value="<cid>">`. CID is the
  // dashless 10-digit Google identifier (e.g. 8108264861).
  async getCampaignAdsCid(campaignId: number): Promise<string | null> {
    const html = await this.getString(`/campaign_ppc_content/${campaignId}`);
    const m = html.match(/<input[^>]+class=["']account_id["'][^>]+value=["'](\d+)["']/);
    return m ? m[1] : null;
  }

  // The GMB tab embeds the bound location(s) as `<h3 id="activeLocationName<gmbId>">Name</h3>`.
  async getCampaignGmbLocations(campaignId: number): Promise<CampaignGmbLocation[]> {
    const html = await this.getString(`/campaign_gmb_content/${campaignId}`);
    const seen = new Set<number>();
    const out: CampaignGmbLocation[] = [];
    for (const m of html.matchAll(/id=["']activeLocationName(\d+)["'][^>]*>([^<]+)</g)) {
      const id = Number(m[1]);
      if (!Number.isFinite(id) || seen.has(id)) continue;
      const name = m[2].trim();
      if (!name) continue;
      seen.add(id);
      out.push({ id, name });
    }
    return out;
  }

  async getCampaignBindings(opts: { campaignId?: number } = {}): Promise<CampaignBindings[]> {
    const [dir, wizard] = await Promise.all([
      this.fetchCampaignDirectory({ limit: 500 }),
      this.listWizardEmails(),
    ]);
    const ga4ById = new Map(wizard.ga4.map((e) => [e.id, e.label] as const));
    const rows = opts.campaignId ? dir.data.filter((r) => r.id === opts.campaignId) : dir.data;
    const out: CampaignBindings[] = [];
    for (const row of rows) {
      const isConnected = row.is_connected ?? {};
      const [locs, cid] = await Promise.all([
        isConnected.gmb ? this.getCampaignGmbLocations(row.id) : Promise.resolve([] as CampaignGmbLocation[]),
        isConnected.google_ads ? this.getCampaignAdsCid(row.id) : Promise.resolve(null),
      ]);
      out.push({
        campaignId: row.id,
        name: row.domain_name,
        domain: row.domain_url,
        ga4: row.ga4_email_id ? { emailId: row.ga4_email_id, email: ga4ById.get(row.ga4_email_id) ?? null } : null,
        searchConsole: row.console_account_id ? { propertyAccountId: row.console_account_id } : null,
        gmb: locs.length ? { locations: locs } : null,
        ads: cid ? { customerId: cid } : null,
        isConnected,
      });
    }
    return out;
  }

  async checkDomainName(name: string, userId: number): Promise<unknown> {
    return this.getJson(`/checkDomainName?search=${encodeURIComponent(name)}&user_id=${userId}`);
  }

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

  async listGa4Emails(userId: number): Promise<GoogleAccountOption[]> {
    const html = await this.getString(`/ajax_get_ga4_emails?user_id=${userId}`);
    return parseOptions(html);
  }

  // The campaignId on these list endpoints is decorative — verified by diffing
  // responses for '', '0', and real ids. Default to 0 so discovery works
  // without an in-flight project.

  async listGa4Accounts(email: number, campaignId: number = 0): Promise<GoogleAccountOption[]> {
    const html = await this.getString(`/ajax_get_ga4_accounts?email=${email}&campaign_id=${campaignId}`);
    return parseOptions(html);
  }

  async listGa4Properties(accountId: number, campaignId: number = 0): Promise<GoogleAccountOption[]> {
    const html = await this.getString(`/ajax_get_ga4_properties?account_id=${accountId}&campaign_id=${campaignId}`);
    return parseOptions(html);
  }

  async listConsoleProperties(email: number, campaignId: number = 0): Promise<GoogleAccountOption[]> {
    const html = await this.getString(`/ajax_get_console_urls?email=${email}&campaign_id=${campaignId}`);
    return parseOptions(html);
  }

  async listGmbAccounts(email: number, campaignId: number = 0): Promise<GoogleAccountOption[]> {
    const html = await this.getString(`/ajax_get_gmb_accounts?email=${email}&campaign_id=${campaignId}`);
    return parseOptions(html);
  }

  async listAdsAccounts(email: number, campaignId: number = 0): Promise<GoogleAccountOption[]> {
    const html = await this.getString(`/ajax_get_adwords_accounts?email=${email}&campaign_id=${campaignId}`);
    return parseOptions(html);
  }

  async listConnectedGoogleAccounts(): Promise<ConnectedGoogleAccount[]> {
    const w = await this.listWizardEmails();
    const byGmail = new Map<string, ConnectedGoogleAccount>();
    const upsert = (
      provider: keyof ConnectedGoogleAccount['scopes'],
      list: GoogleAccountOption[],
    ) => {
      for (const e of list) {
        const key = e.label.toLowerCase();
        let row = byGmail.get(key);
        if (!row) {
          row = { gmail: e.label, scopes: {} };
          byGmail.set(key, row);
        }
        row.scopes[provider] = e.id;
      }
    };
    upsert('ga4', w.ga4);
    upsert('searchConsole', w.searchConsole);
    upsert('ads', w.ads);
    upsert('gmb', w.gmb);
    return [...byGmail.values()].sort((a, b) => a.gmail.localeCompare(b.gmail));
  }

  // GSC/Ads/GMB emails come from the wizard page only — no JSON endpoint exists
  // (probed `ajax_get_*_emails` for each; all return the catch-all dashboard HTML).
  // GA4 uses /ajax_get_ga4_emails because the wizard's analytics_existing_emails
  // select is for the dead Universal Analytics flow.
  async listWizardEmails(): Promise<WizardEmailOptions> {
    const [html, ga4] = await Promise.all([
      this.getString('/add-new-campaign'),
      this.listGa4Emails(this.userId),
    ]);
    const sectionIds = {
      searchConsole: 'search_console_existing_emails',
      ads: 'adwords_existing_emails',
      gmb: 'settings_gmb_existing_emails',
    } as const;
    const out: WizardEmailOptions = { ga4, searchConsole: [], ads: [], gmb: [] };
    const selectRe = /<select[^>]*(?:id|name)="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi;
    for (const m of html.matchAll(selectRe)) {
      const id = m[1];
      const target = (Object.entries(sectionIds) as [Exclude<keyof WizardEmailOptions, 'ga4'>, string][])
        .find(([, key]) => id === key);
      if (!target) continue;
      const opts: GoogleAccountOption[] = [];
      for (const o of m[2].matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)<\/option>/g)) {
        const value = o[1].trim();
        const label = o[2].trim();
        if (!value || !label || label.toLowerCase().startsWith('select')) continue;
        const id = Number(value);
        if (!Number.isFinite(id)) continue;
        opts.push({ id, label });
      }
      out[target[0]] = opts;
    }
    return out;
  }

  // The /campaign_gmb_content/<id> page embeds the encrypted GMB channel token,
  // not the campaign token. The /social-post/<id> page has the right one in
  // <input id="socialCampaign" value="...">.
  async getEncryptedCampaignId(numericCampaignId: number): Promise<string> {
    const html = await this.getString(`/social-post/${numericCampaignId}`);
    const m = html.match(/id=["']socialCampaign["'][^>]*value=["'](eyJ[A-Za-z0-9+/=]+)["']/);
    if (!m) throw new Error(`Could not locate socialCampaign token in /social-post/${numericCampaignId}`);
    return m[1];
  }

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
    // step=4 (Ads) 500s server-side; the real browser wizard also hits this and ignores it.
    if (step === 4) return;
    throw new Error(
      `complete_steps step=${step} for project=${projectId} returned HTTP 500 after retries. ` +
        `Original: ${(lastErr as Error)?.message ?? lastErr}`,
    );
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

  // Add-to-existing-campaign keyword flow. The wizard's storeRankingDetails
  // returns status:1 but never persists outside a real browser session; these
  // two back the dashboard's "Add Keywords" popup and work from any HTTP client.

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

  async attachSearchConsole(input: AttachIntegrationInput): Promise<unknown> {
    return this.postJson('/ajax_save_new_project_console_data', this.integrationBody(input));
  }

  async updateSearchConsole(input: AttachIntegrationInput): Promise<unknown> {
    return this.postJson('/ajax_update_console_data', this.integrationBody(input));
  }

  async disconnectSearchConsole(campaignId: number): Promise<unknown> {
    const body = new URLSearchParams({
      request_id: campaignId.toString(),
      _token: this.token,
    });
    return this.postJson('/ajax_disconnect_console', body);
  }

  async attachAds(input: AttachIntegrationInput): Promise<unknown> {
    return this.postJson('/ajax_save_new_project_adwords_data', this.integrationBody(input));
  }

  // `account[]` is repeated — GMB supports multi-select natively.
  // Each attached location needs a follow-up GET /log_gmb_data?campaign_id&account_id
  // to fully commit; without it the GMB tab shows "No Location Found" and
  // /storeSocialPostContent returns 422 "A server error occurred while posting GMB posts".
  async attachGmb(input: AttachGmbInput): Promise<unknown> {
    const body = new URLSearchParams();
    body.set('campaign_id', input.campaignId.toString());
    body.set('email', input.email.toString());
    for (const acc of input.accounts) body.append('account[]', acc.toString());
    body.set('_token', this.token);
    const res = await this.postJson('/ajax_update_gmb_data', body);
    for (const acc of input.accounts) {
      await this.getRaw(`/log_gmb_data?campaign_id=${input.campaignId}&account_id=${acc}`);
    }
    return res;
  }

  // -------- Integrations (GA4) --------

  /** Attach a GA4 account+property to a brand new project (in-wizard). GA4 has no "view" concept. */
  async attachGa4(input: AttachGa4Input): Promise<unknown> {
    const body = new URLSearchParams({
      campaign_id: input.campaignId.toString(),
      email: input.email.toString(),
      account: input.account.toString(),
      property: input.property.toString(),
      _token: this.token,
    });
    return this.postJson('/ajax_store_ga4_data', body);
  }

  async createCampaign(input: CreateCampaignInput): Promise<CreateCampaignResult> {
    if (!input.locations.length) throw new Error('At least one location is required.');
    const resolved = input.locations.map(resolveCountry);
    const volumeResolved = input.volumeLocations
      ? input.volumeLocations.map(resolveCountry)
      : resolved;
    if (volumeResolved.length !== resolved.length) {
      throw new Error(
        `volumeLocations length (${volumeResolved.length}) must match locations length (${resolved.length}).`,
      );
    }
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
      urlType: input.urlType ?? 'Root Domain',
      regionalDb: input.regionalDb ?? primary.regionalDb,
      dashboards,
    });

    const wantsIntegration = !!(input.searchConsole || input.ads || input.gmb || input.ga4);
    const wizard = wantsIntegration ? await this.listWizardEmails() : null;
    const pickEmail = (
      provider: keyof WizardEmailOptions,
      gmail: string,
    ): GoogleAccountOption => {
      const pool = wizard![provider];
      const hit = pool.find((e) => e.label.toLowerCase() === gmail.toLowerCase());
      if (!hit) {
        throw new Error(
          `Google account "${gmail}" not connected to ${provider}. Available: ${pool.map((e) => e.label).join(', ') || '(none)'}`,
        );
      }
      return hit;
    };
    const pickAccount = (
      options: GoogleAccountOption[],
      wanted: string,
      label: string,
    ): GoogleAccountOption => {
      const hit = options.find((o) => o.label.toLowerCase() === wanted.toLowerCase());
      if (!hit) {
        throw new Error(
          `${label} "${wanted}" not found. Available: ${options.map((o) => o.label).join(', ') || '(none)'}`,
        );
      }
      return hit;
    };

    if (input.searchConsole) {
      const email = pickEmail('searchConsole', input.searchConsole.googleAccount);
      const properties = await this.listConsoleProperties(email.id, projectId);
      const property = pickAccount(properties, input.searchConsole.property, 'GSC property');
      await this.attachSearchConsole({ campaignId: projectId, email: email.id, account: property.id });
      // Step 2 only when GSC was actually attached — server 500s if marked with nothing committed.
      await this.completeSteps(projectId, 2);
    }

    if (input.ads) {
      const email = pickEmail('ads', input.ads.googleAccount);
      const accounts = await this.listAdsAccounts(email.id, projectId);
      const account = pickAccount(accounts, input.ads.account, 'Ads account');
      await this.attachAds({ campaignId: projectId, email: email.id, account: account.id });
      await this.completeSteps(projectId, 4);
    }

    if (input.ga4) {
      const email = pickEmail('ga4', input.ga4.googleAccount);
      const accounts = await this.listGa4Accounts(email.id);
      const account = pickAccount(accounts, input.ga4.account, 'GA4 account');
      const properties = await this.listGa4Properties(account.id);
      const property = pickAccount(properties, input.ga4.property, 'GA4 property');
      await this.attachGa4({
        campaignId: projectId,
        email: email.id,
        account: account.id,
        property: property.id,
      });
      await this.completeSteps(projectId, 5);
    }

    if (input.gmb) {
      const email = pickEmail('gmb', input.gmb.googleAccount);
      const locations = await this.listGmbAccounts(email.id, projectId);
      // Wizard labels look like "HermesOps (14624712567507918236)". Allow callers
      // to pass either the full label or the bare name (everything before the trailing parens).
      const stripChannelId = (s: string) => s.replace(/\s*\(\d+\)\s*$/, '').trim();
      const picked = input.gmb.locations.map((name) => {
        const wanted = name.toLowerCase();
        const wantedBare = stripChannelId(name).toLowerCase();
        const hit = locations.find((o) => {
          const lbl = o.label.toLowerCase();
          return lbl === wanted || stripChannelId(o.label).toLowerCase() === wantedBare;
        });
        if (!hit) {
          throw new Error(
            `GMB location "${name}" not found. Available: ${locations.map((o) => o.label).join(', ') || '(none)'}`,
          );
        }
        return hit.id;
      });
      await this.attachGmb({ campaignId: projectId, email: email.id, accounts: picked });
      // GMB has no completeSteps in the wizard — ajax_update_gmb_data is the final write.
    }

    const locs = resolved.map((r, i) => ({
      searchLocation: r.searchLocation,
      latitude: r.latitude,
      longitude: r.longitude,
      country: volumeResolved[i].country,
      locationId: volumeResolved[i].locationId,
    }));
    const ignoreLocalListing = SERP_TYPE_TO_FLAG[input.serpType ?? 'local+organic'];
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

  async createCampaignShell(input: StoreProjectInfoInput): Promise<number> {
    const project = await this.storeProjectInfo(input);
    await this.completeSteps(project.last_id, 1);
    return project.last_id;
  }

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

  // All /storeSocialPostContent, /uploadMediaFiles, /removeUploadMediaFiles,
  // /removeDirectoryAndFiles and /get-calendar-social-post-content calls must
  // be referer'd as /social-post/<numericId> — Laravel route protection rejects
  // otherwise with a generic 422 "A server error occurred while posting GMB posts".
  private socialPostReferer(numericId: number): string {
    return `${this.baseUrl}/social-post/${numericId}`;
  }

  async uploadMedia(opts: {
    /** Encrypted Laravel campaignId (form field). */
    campaignId: string;
    /** Numeric campaign id (used for the Referer). */
    numericCampaignId: number;
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
    const res = await this.postMultipart('/uploadMediaFiles', form, {
      referer: this.socialPostReferer(opts.numericCampaignId),
    });
    const json = (await res.json()) as { status: boolean; fileData?: UploadMediaResult };
    if (!json.status || !json.fileData) {
      throw new Error(`uploadMediaFiles failed: ${JSON.stringify(json)}`);
    }
    return json.fileData;
  }

  async storeSocialPost(opts: {
    campaignId: string;
    numericCampaignId: number;
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
    const res = await this.postMultipart('/storeSocialPostContent', form, {
      referer: this.socialPostReferer(opts.numericCampaignId),
    });
    return (await res.json()) as StoreSocialPostResult;
  }

  async cleanupUploadDirectory(campaignId: string): Promise<unknown> {
    const body = new URLSearchParams({ campaignId, _token: this.token });
    return this.postJson('/removeDirectoryAndFiles', body);
  }

  async getCalendarPosts(opts: {
    /** Encrypted Laravel campaignId (form field). */
    campaignId: string;
    /** Numeric campaign id (used for the Referer). */
    numericCampaignId: number;
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
    const numericCampaignId = input.campaignId;
    const encryptedCampaignId = await this.getEncryptedCampaignId(numericCampaignId);
    const datetime = formatLocalDatetime(new Date());
    const cta = input.cta?.action ?? 'none';
    const ctaUrl = input.cta?.url ?? '';

    const imageUrls: string[] = [];
    for (const item of input.images ?? []) {
      if (/^https?:\/\//i.test(item)) {
        imageUrls.push(item);
        continue;
      }
      imageUrls.push(
        await this.uploadLocalImage(encryptedCampaignId, numericCampaignId, item, datetime),
      );
    }

    const sectionType = input.sectionType ?? 'whatsnew';
    const raw = await this.storeSocialPost({
      campaignId: encryptedCampaignId,
      numericCampaignId,
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

    await this.cleanupUploadDirectory(encryptedCampaignId).catch(() => undefined);

    return {
      scheduled: Boolean(input.scheduleTime),
      message: raw.message ?? '',
      imageUrls,
      raw,
    };
  }

  private async uploadLocalImage(
    encryptedCampaignId: string,
    numericCampaignId: number,
    filePath: string,
    datetime: string,
  ): Promise<string> {
    const file = Bun.file(filePath);
    if (!(await file.exists())) throw new Error(`Image not found: ${filePath}`);
    const fileName = filePath.split('/').pop() || 'upload.jpg';
    const mime = file.type || guessMime(fileName);
    const blob = new Blob([await file.arrayBuffer()], { type: mime });
    const uploaded = await this.uploadMedia({
      campaignId: encryptedCampaignId,
      numericCampaignId,
      file: blob,
      fileName,
      datetime,
      type: mime.startsWith('video/') ? 'video' : 'image',
    });
    return uploaded.url;
  }

  // -------- HTTP plumbing --------

  private async postMultipart(path: string, form: FormData, opts: { referer?: string } = {}): Promise<Response> {
    await this.ensurePrimed();
    if (form.has('_token')) form.set('_token', this.token);
    const headers = this.baseHeaders('multipart');
    if (opts.referer) headers.Referer = opts.referer;
    const res = await this.http.fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
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
