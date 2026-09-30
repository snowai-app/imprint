import type { NextConfig } from 'next';
import { VISITOR_FRAME_ANCESTORS } from './lib/visitor.ts';

/**
 * RUNTIME SETTINGS, COMPILED IN (the family's rule, as in snowai-app/model's
 * next.config.ts). Amplify's environment variables have not dependably
 * reached the running app on the family's apps, so any Imprint reads at
 * runtime is named here and compiled in at build. ONLY A NAME THAT HAS A
 * VALUE IS COMPILED IN: an empty one would be a textual substitution of ""
 * that blinds every process.env read to a real value set beside it (9 Sep
 * 2026). Imprint needs none of them to run (aws/outputs.json holds its
 * identifiers); they are overrides. The capability key itself is never one
 * of them: it is read from Secrets Manager at runtime (lib/capability-key.ts).
 *
 * Every page may be framed only by Imprint itself and HQ, for its Visitor view
 * (the family's contract, lib/visitor.ts).
 */
const RUNTIME = [
  'DATABASE_CLUSTER_ARN',
  'DATABASE_SECRET_ARN',
  'DATABASE_NAME',
  'COGNITO_USER_POOL_ID',
  'COGNITO_APP_CLIENT_ID',
  'NEXT_PUBLIC_FRONT_URL',
  'CAPABILITY_KEY_SECRET',
  'ASK_URL',
  'READER_URL',
  'RENDER_URL',
] as const;

const env: Record<string, string> = {};
for (const name of RUNTIME) {
  const value = process.env[name];
  if (typeof value === 'string' && value.trim() !== '') env[name] = value.trim();
}

const nextConfig: NextConfig = {
  env,
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'Content-Security-Policy', value: `frame-ancestors ${VISITOR_FRAME_ANCESTORS}` }] }];
  },
};

export default nextConfig;
