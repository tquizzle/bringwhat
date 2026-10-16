import type { Bindings } from '../env';
import type { Suggestion } from '../types';

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENAI_DEFAULT_URL = 'https://api.openai.com/v1';
const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';
const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';

const GEMINI_RESPONSE_SCHEMA = {
  type: 'ARRAY',
  items: {
    type: 'OBJECT',
    properties: {
      itemName: { type: 'STRING' },
      reason: { type: 'STRING' },
    },
    required: ['itemName', 'reason'],
  },
};

interface OpenAiResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
}

function isSuggestion(entry: unknown): entry is Suggestion {
  if (typeof entry !== 'object' || entry === null) return false;
  const candidate = entry as Record<string, unknown>;
  return typeof candidate.itemName === 'string' && typeof candidate.reason === 'string';
}

export function normalizeSuggestions(value: unknown): Suggestion[] {
  if (!Array.isArray(value)) throw new Error('Model response is not a JSON array');
  return value.flatMap((entry: unknown) =>
    isSuggestion(entry) ? [{ itemName: entry.itemName, reason: entry.reason }] : [],
  );
}

export function parseSuggestionText(text: string): Suggestion[] {
  const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return normalizeSuggestions(JSON.parse(cleaned || '[]'));
}

async function requestOpenAi(prompt: string, env: Bindings): Promise<string> {
  const baseUrl = (env.AI_BASE_URL || OPENAI_DEFAULT_URL).replace(/\/$/, '');
  const model = env.AI_MODEL || OPENAI_DEFAULT_MODEL;
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.API_KEY ?? ''}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
    }),
  });
  if (!response.ok) throw new Error(`OpenAI Error: ${response.status} ${response.statusText}`);
  const data = (await response.json()) as OpenAiResponse;
  return data.choices?.[0]?.message?.content ?? '[]';
}

async function requestGemini(prompt: string, env: Bindings): Promise<string> {
  const model = env.AI_MODEL || GEMINI_DEFAULT_MODEL;
  const response = await fetch(`${GEMINI_BASE_URL}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': env.API_KEY ?? '',
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: GEMINI_RESPONSE_SCHEMA,
      },
    }),
  });
  if (!response.ok) throw new Error(`Gemini Error: ${response.status} ${response.statusText}`);
  const data = (await response.json()) as GeminiResponse;
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text ?? '').join('');
}

export async function requestSuggestions(env: Bindings, prompt: string): Promise<Suggestion[]> {
  const text =
    (env.AI_PROVIDER || 'gemini') === 'openai'
      ? await requestOpenAi(prompt, env)
      : await requestGemini(prompt, env);
  return parseSuggestionText(text);
}
