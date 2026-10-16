import { Hono, type Context } from 'hono';
import { consumeRateLimit, suggestionCacheKey } from '../ai/cache';
import { buildSuggestPrompt } from '../ai/prompt';
import { requestSuggestions } from '../ai/providers';
import type { AppEnv, Bindings } from '../env';
import { messageOf, readJsonBody } from '../http';
import type { Suggestion } from '../types';
import { parseSuggestInput, type SuggestInput } from '../validation';

const CACHE_TTL_SECONDS = 3600;

const NO_KEY_SUGGESTIONS: Suggestion[] = [
  { itemName: 'Ice', reason: 'AI features require an API Key.' },
  { itemName: 'Cups', reason: 'Standard party necessity.' },
];

const ERROR_SUGGESTIONS: Suggestion[] = [
  { itemName: 'Napkins', reason: 'Always useful.' },
  { itemName: 'Snacks', reason: 'Backup plan.' },
];

export const suggestRoutes = new Hono<AppEnv>();

async function requestWithCache(env: Bindings, input: SuggestInput): Promise<Suggestion[]> {
  const key = `suggest:${await suggestionCacheKey(input)}`;
  const cached = await env.CACHE.get(key);
  if (cached !== null) return JSON.parse(cached) as Suggestion[];

  const suggestions = await requestSuggestions(env, buildSuggestPrompt(input));
  await env.CACHE.put(key, JSON.stringify(suggestions), { expirationTtl: CACHE_TTL_SECONDS });
  return suggestions;
}

async function requestOrFallback(env: Bindings, input: SuggestInput): Promise<Suggestion[]> {
  try {
    return await requestWithCache(env, input);
  } catch (err) {
    console.error('AI Error:', messageOf(err));
    return ERROR_SUGGESTIONS;
  }
}

async function suggest(c: Context<AppEnv>): Promise<Response> {
  const parsed = parseSuggestInput(await readJsonBody(c));
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const env = c.env;
  const provider = env.AI_PROVIDER || 'gemini';
  if (!env.API_KEY && provider === 'gemini') return c.json(NO_KEY_SUGGESTIONS);

  const ip = c.req.header('CF-Connecting-IP') ?? 'unknown';
  if (!(await consumeRateLimit(env.CACHE, ip, Date.now()))) {
    return c.json({ error: 'Too many requests' }, 429);
  }
  return c.json(await requestOrFallback(env, parsed.value));
}

suggestRoutes.post('/api/suggest', suggest);
