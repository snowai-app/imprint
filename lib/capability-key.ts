import { timingSafeEqual } from 'node:crypto';

/**
 * Who may call this service: any of our own products and capabilities, and
 * nobody else. They prove it with one shared key, `Authorization: Bearer`.
 *
 * THE KEY IS NOT AN ENVIRONMENT VARIABLE. It lives in Secrets Manager under
 * one name (aws/outputs.json → capabilities.keySecret), read by the compute
 * role at runtime — the same key every family capability checks. Until
 * 11 September 2026 this service wanted EXTRACT_KEY set in the Amplify
 * console, and that value never reached the running function (the morning
 * of 9 September). EXTRACT_KEY is still honoured when present, so nothing
 * that already presents it breaks; production needs neither variable.
 *
 * Fail closed: no key readable, no way in.
 */
const TTL_MS = 5 * 60 * 1000;
let cached: { value: string; at: number } | null = null;

async function secretName(): Promise<string> {
  const env = (process.env.CAPABILITY_KEY_SECRET ?? '').trim();
  if (env) return env;
  try {
    const outputs = (await import('@/aws/outputs.json')).default as { capabilities?: { keySecret?: string } };
    return outputs.capabilities?.keySecret ?? '';
  } catch {
    return '';
  }
}

export async function capabilityKey(): Promise<string> {
  const local = (process.env.CAPABILITY_KEY ?? '').trim();
  if (local) return local;
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value;
  const name = await secretName();
  if (!name) return '';
  try {
    const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
    const out = await new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' }).send(new GetSecretValueCommand({ SecretId: name }));
    const value = (out.SecretString ?? '').trim();
    if (value) cached = { value, at: Date.now() };
    return value;
  } catch {
    return '';
  }
}

function matches(header: string | null, secret: string): boolean {
  if (!secret) return false;
  const provided = Buffer.from(header ?? '', 'utf8');
  const expected = Buffer.from(`Bearer ${secret}`, 'utf8');
  if (provided.length !== expected.length) return false;
  return timingSafeEqual(provided, expected);
}

/** True when the request carries the shared key — or, for a caller not yet
 *  moved over, the legacy EXTRACT_KEY this deployment may still hold. */
export async function isAuthorized(header: string | null): Promise<boolean> {
  const legacy = process.env.EXTRACT_KEY ?? '';
  if (legacy && matches(header, legacy)) return true;
  return matches(header, await capabilityKey());
}

/** Whether any key is readable at all — reported by /api/health. */
export async function keyReadable(): Promise<boolean> {
  return Boolean(process.env.EXTRACT_KEY || (await capabilityKey()));
}
