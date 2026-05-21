import type { SearchLocation } from './client.ts';

type CountryEntry = {
  aliases: string[];
  /** Canonical country name. Used as the human-facing alias only. */
  canonical: string;
  /**
   * DFS city-level location id used in `location_id[]`. The wizard's
   * `/ajax_store_ranking_details` rejects country-level ids (e.g. UK=2826)
   * with a generic "Error!! Please try again." even though the autocomplete
   * endpoint accepts them. City ids work.
   */
  locationId: number;
  /** DFS city label in `locations[]`, e.g. "London,England,United Kingdom". */
  dfsCityLabel: string;
  /** Google Places-style label for `searchlocations[]`, e.g. "London, UK". */
  searchLocationLabel: string;
  /** Google geocoded lat/lng for the city, full precision. */
  lat: number;
  lng: number;
  /** Default Google domain for this country. */
  searchEngine: string;
  /** Default regional_db code (server ignores for SEO-only campaigns). */
  regionalDb: string;
};

// City-level defaults per country. Confirmed against a working wizard HAR for UK.
// For other countries the city is the most-searched market (capital or biggest city).
const COUNTRIES: CountryEntry[] = [
  {
    aliases: ['united kingdom', 'uk', 'britain', 'great britain', 'england', 'gb', 'london'],
    canonical: 'United Kingdom',
    locationId: 1006886,
    dfsCityLabel: 'London,England,United Kingdom',
    searchLocationLabel: 'London, UK',
    lat: 51.5072178,
    lng: -0.1275862,
    searchEngine: 'google.co.uk',
    regionalDb: 'uk',
  },
  {
    aliases: ['united states', 'usa', 'us', 'america', 'new york'],
    canonical: 'United States',
    locationId: 1023191,
    dfsCityLabel: 'New York,New York,United States',
    searchLocationLabel: 'New York, NY, USA',
    lat: 40.7127753,
    lng: -74.0059728,
    searchEngine: 'google.com',
    regionalDb: 'us',
  },
  {
    aliases: ['canada', 'ca', 'toronto'],
    canonical: 'Canada',
    locationId: 1002021,
    dfsCityLabel: 'Toronto,Ontario,Canada',
    searchLocationLabel: 'Toronto, ON, Canada',
    lat: 43.653226,
    lng: -79.3831843,
    searchEngine: 'google.ca',
    regionalDb: 'ca',
  },
  {
    aliases: ['australia', 'au', 'sydney'],
    canonical: 'Australia',
    locationId: 1000286,
    dfsCityLabel: 'Sydney,New South Wales,Australia',
    searchLocationLabel: 'Sydney, NSW, Australia',
    lat: -33.8688197,
    lng: 151.2092955,
    searchEngine: 'google.com.au',
    regionalDb: 'au',
  },
  {
    aliases: ['ireland', 'ie', 'dublin'],
    canonical: 'Ireland',
    locationId: 1007828,
    dfsCityLabel: 'Dublin,County Dublin,Ireland',
    searchLocationLabel: 'Dublin, Ireland',
    lat: 53.3498053,
    lng: -6.2603097,
    searchEngine: 'google.ie',
    regionalDb: 'ie',
  },
];

export type ResolvedLocation = SearchLocation & {
  searchEngine: string;
  regionalDb: string;
};

export function resolveCountry(name: string): ResolvedLocation {
  const key = name.trim().toLowerCase();
  const hit = COUNTRIES.find((c) => c.aliases.includes(key));
  if (!hit) {
    throw new Error(
      `Unknown location "${name}". Supported: ${COUNTRIES.map((c) => c.canonical).join(', ')}.`,
    );
  }
  return {
    searchLocation: hit.searchLocationLabel,
    latitude: hit.lat,
    longitude: hit.lng,
    country: hit.dfsCityLabel,
    locationId: hit.locationId,
    searchEngine: hit.searchEngine,
    regionalDb: hit.regionalDb,
  };
}

export function listSupportedCountries(): string[] {
  return COUNTRIES.map((c) => c.canonical);
}
