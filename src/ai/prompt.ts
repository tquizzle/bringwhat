import type { SuggestInput, SuggestItemInput } from '../validation';

const MAX_FIELD_CHARS = 500;

export function sanitizeForPrompt(value: string): string {
  return value.replace(/["\r\n]+/g, ' ').slice(0, MAX_FIELD_CHARS).trim();
}

function formatItems(items: SuggestItemInput[]): string {
  if (items.length === 0) return 'No items yet.';
  return items
    .map((item) => `- ${sanitizeForPrompt(item.itemName)} (${sanitizeForPrompt(item.guestName)})`)
    .join('\n');
}

export function buildSuggestPrompt(input: SuggestInput): string {
  const { event, items } = input;
  return `
    You are a party planning assistant.
    Event Title: "${sanitizeForPrompt(event.title)}"
    Description: "${sanitizeForPrompt(event.description)}"
    Host: ${sanitizeForPrompt(event.hostName)}

    Current Items:
    ${formatItems(items)}

    Suggest 3 distinct items that are missing.
    Return ONLY a raw JSON array. Do not include markdown formatting like \`\`\`json.
    Format: [{"itemName": "...", "reason": "..."}]
    Keep reasons under 10 words.
  `;
}
