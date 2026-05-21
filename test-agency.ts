import { BpStrategistsClient } from './client.ts';

const token = process.env.BP_TOKEN;
const sessionCookie = process.env.BP_SESSION;
const campaignId = process.env.HERMES_CAMPAIGN_ID;
const channelId = Number(process.env.HERMES_GMB_CHANNEL_ID);

if (!token || !sessionCookie || !campaignId || !Number.isFinite(channelId)) {
  console.error('Missing env. See .env.example. Bun auto-loads .env from the cwd.');
  process.exit(1);
}

const agency = new BpStrategistsClient({ token, sessionCookie, userId: 0 });

function formatLondon(d: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d).reduce<Record<string, string>>((a, p) => ((a[p.type] = p.value), a), {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

const scheduleTime = formatLondon(new Date(Date.now() + 5 * 60_000));
console.log('Scheduling for', scheduleTime, 'Europe/London');

const result = await agency.scheduleGmbPost({
  campaignId,
  channelId,
  text: 'Test post from .env-loaded client.',
  images: [`${process.env.HOME}/Downloads/ring.jpg`],
  scheduleTime,
  timeZone: 'Europe/London',
});

console.log(result);
