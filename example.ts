import { BpStrategistsClient } from './client.ts';

const token = process.env.BP_TOKEN;
const sessionCookie = process.env.BP_SESSION;
if (!token || !sessionCookie) {
  console.error('Set BP_TOKEN and BP_SESSION.');
  process.exit(1);
}

const client = new BpStrategistsClient({ token, sessionCookie });

const result = await client.createCampaign({
  domain: 'simonbalfe.com',
  keywords: ['simon balfe', 'simonbalfe seo'],
  locations: ['United Kingdom'],
});

console.log('Created campaign', result);
