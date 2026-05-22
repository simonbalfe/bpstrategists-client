#!/usr/bin/env bun
import '../env.ts';
import { BpStrategistsClient } from '../client.ts';

const client = new BpStrategistsClient({
  token: process.env.BP_TOKEN!,
  sessionCookie: process.env.BP_SESSION!,
  userId: Number(process.env.BP_USER_ID),
});

for (const id of [32082, 32083, 32084, 32085, 32086, 32087, 32088]) {
  try {
    const r = await client.archiveCampaign(id);
    console.log(`archived ${id}:`, r);
  } catch (e) {
    console.log(`archive ${id} error:`, (e as Error).message);
  }
}
