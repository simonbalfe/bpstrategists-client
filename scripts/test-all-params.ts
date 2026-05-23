import '../env.ts';
import { BpStrategistsClient } from '../client.ts';

const token = process.env.BP_TOKEN!;
const sessionCookie = process.env.BP_SESSION!;
const userId = Number(process.env.BP_USER_ID);
const client = new BpStrategistsClient({ token, sessionCookie, userId });

const result = await client.createCampaign({
  domain: 'simonbalfe.com',
  projectName: 'simonbalfe-fully-customised',
  urlType: 'Root Domain',
  regionalDb: 'uk',
  dashboards: ['SEO', 'ADS', 'GMB', 'SOCIAL', 'REPUTO', 'AI'],
  keywords: [
    'simon balfe',
    'ai consultant london',
    'automation engineer',
    'claude code expert',
    'mcp server developer',
  ],
  keywordTag: 'simonbalfe-launch-keywords',
  locations: ['United Kingdom'],
  volumeLocations: ['United Kingdom'],
  language: 'English',
  searchEngine: 'google.co.uk',
  serpType: 'local+organic',
  device: 'mobile',
  searchConsole: {
    googleAccount: 'bpstrategicmanagement@gmail.com',
    property: 'sc-domain:bpstrategists.com',
  },
  ga4: {
    googleAccount: 'bpstrategicmanagement@gmail.com',
    account: 'BP Strategists',
    property: 'BP Strategists',
  },
  ads: {
    googleAccount: 'info@bpstrategists.com',
    account: 'SPS MOBILE Ltd',
  },
  gmb: {
    googleAccount: 'simon@simonbalfe.com',
    locations: ['HermesOps'],
  },
});

console.log('CREATED', result);
