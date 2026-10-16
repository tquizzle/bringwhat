import type { SuggestInput } from '../validation';

const RATE_LIMIT_PER_MINUTE = 10;
const RATE_LIMIT_TTL_SECONDS = 120;
const MINUTE_MS = 60_000;

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function suggestionCacheKey(input: SuggestInput): Promise<string> {
  const material = JSON.stringify([
    input.event.title,
    input.event.description,
    input.event.hostName,
    input.items.map((item) => item.itemName),
  ]);
  return sha256Hex(material);
}

/** Returns false when the client has exhausted its per-minute budget. KV is eventually consistent, so the limit is approximate. */
export async function consumeRateLimit(kv: KVNamespace, ip: string, now: number): Promise<boolean> {
  const minute = Math.floor(now / MINUTE_MS);
  const key = `rl:${ip}:${minute}`;
  const current = Number((await kv.get(key)) ?? 0);
  if (current >= RATE_LIMIT_PER_MINUTE) return false;
  await kv.put(key, String(current + 1), { expirationTtl: RATE_LIMIT_TTL_SECONDS });
  return true;
}
