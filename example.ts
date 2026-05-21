import { BpStrategistsClient } from './client.ts';

const token = process.env.BP_TOKEN;
const sessionCookie = process.env.BP_SESSION;
const userId = Number(process.env.BP_USER_ID);
if (!token || !sessionCookie || !Number.isFinite(userId)) {
  console.error('Set BP_TOKEN, BP_SESSION, BP_USER_ID.');
  process.exit(1);
}

const client = new BpStrategistsClient({ token, sessionCookie, userId });

const result = await client.createCampaign({
  domain: 'simonbalfe.com',
  keywords: ['simon balfe', 'simonbalfe seo'],
  locations: ['United Kingdom'],
});

console.log('Created campaign', result);
