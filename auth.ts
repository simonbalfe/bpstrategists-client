import { join } from 'node:path';
import { writeEnvVars } from './env.ts';

const DASHBOARD = 'https://bpstrategists.agencydashboard.io/dashboard';
const ENV_PATH = join(import.meta.dir, '.env');

export type AuthResult = {
  session: string;
  token: string;
  envPath: string;
};

export async function setAuthFromCookie(rawCookie: string): Promise<AuthResult> {
  const trimmed = rawCookie.trim();
  if (!trimmed) {
    throw new Error('Empty cookie value. Paste the value of agency_dashboard_session.');
  }
  const sessionValue = trimmed.startsWith('agency_dashboard_session=')
    ? trimmed.slice('agency_dashboard_session='.length)
    : trimmed;
  const session = `agency_dashboard_session=${sessionValue}`;

  const res = await fetch(DASHBOARD, {
    headers: { Cookie: session },
    redirect: 'manual',
  });
  if (res.status !== 200) {
    const loc = res.headers.get('location');
    throw new Error(
      `Cookie rejected by dashboard (HTTP ${res.status}${loc ? ` -> ${loc}` : ''}). ` +
        `It is likely expired. Grab a fresh agency_dashboard_session value from DevTools ` +
        `-> Application -> Cookies on https://bpstrategists.agencydashboard.io.`,
    );
  }
  const html = await res.text();
  const match = html.match(/<meta\s+name="csrf-token"\s+content="([^"]+)"/i);
  if (!match) {
    throw new Error('Loaded /dashboard but could not find <meta name="csrf-token">. Site shape changed?');
  }
  const token = match[1];

  writeEnvVars(ENV_PATH, { BP_CSRF_TOKEN: token, BP_AGENCY_SESSION: session });

  process.env.BP_CSRF_TOKEN = token;
  process.env.BP_AGENCY_SESSION = session;

  return { session, token, envPath: ENV_PATH };
}
