import type { Result } from './types';

const MAX_TITLE = 200;
const MAX_SHORT = 200;
const MAX_DESCRIPTION = 5000;
const MAX_ID = 100;
const MAX_CATEGORY = 50;
const MAX_ITEMS_PER_REQUEST = 200;

export interface EventInput {
  title: string;
  description: string | null;
  date: string | null;
  time: string | null;
  hostName: string | null;
}

export interface ItemInput {
  eventId: string;
  guestName: string | null;
  itemName: string;
  category: string | null;
}

export interface SuggestItemInput {
  itemName: string;
  guestName: string;
}

export interface SuggestInput {
  event: { title: string; description: string; hostName: string };
  items: SuggestItemInput[];
}

type Fields = Record<string, unknown>;

function fail<T>(error: string): Result<T> {
  return { ok: false, error };
}

function asRecord(value: unknown): Fields | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  return value as Fields;
}

function requiredText(value: unknown, field: string, max: number): Result<string> {
  if (typeof value !== 'string' || value.trim() === '') return fail(`${field} is required`);
  if (value.length > max) return fail(`${field} must be at most ${max} characters`);
  return { ok: true, value };
}

function optionalText(value: unknown, field: string, max: number): Result<string | null> {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (typeof value !== 'string') return fail(`${field} must be a string`);
  if (value.length > max) return fail(`${field} must be at most ${max} characters`);
  return { ok: true, value };
}

export function parseEventInput(body: unknown): Result<EventInput> {
  const fields = asRecord(body);
  if (!fields) return fail('Request body must be a JSON object');

  const title = requiredText(fields.title, 'title', MAX_TITLE);
  if (!title.ok) return title;
  const description = optionalText(fields.description, 'description', MAX_DESCRIPTION);
  if (!description.ok) return description;
  const date = optionalText(fields.date, 'date', MAX_SHORT);
  if (!date.ok) return date;
  const time = optionalText(fields.time, 'time', MAX_SHORT);
  if (!time.ok) return time;
  const hostName = optionalText(fields.hostName, 'hostName', MAX_SHORT);
  if (!hostName.ok) return hostName;

  return {
    ok: true,
    value: {
      title: title.value,
      description: description.value,
      date: date.value,
      time: time.value,
      hostName: hostName.value,
    },
  };
}

export function parseItemInput(body: unknown): Result<ItemInput> {
  const fields = asRecord(body);
  if (!fields) return fail('Request body must be a JSON object');

  const eventId = requiredText(fields.eventId, 'eventId', MAX_ID);
  if (!eventId.ok) return eventId;
  const itemName = requiredText(fields.itemName, 'itemName', MAX_SHORT);
  if (!itemName.ok) return itemName;
  const guestName = optionalText(fields.guestName, 'guestName', MAX_SHORT);
  if (!guestName.ok) return guestName;
  const category = optionalText(fields.category, 'category', MAX_CATEGORY);
  if (!category.ok) return category;

  return {
    ok: true,
    value: {
      eventId: eventId.value,
      guestName: guestName.value,
      itemName: itemName.value,
      category: category.value,
    },
  };
}

function parseSuggestItem(value: unknown): Result<SuggestItemInput> {
  const fields = asRecord(value);
  if (!fields) return fail('items must be an array of objects');
  const itemName = requiredText(fields.itemName, 'itemName', MAX_SHORT);
  if (!itemName.ok) return itemName;
  const guestName = optionalText(fields.guestName, 'guestName', MAX_SHORT);
  if (!guestName.ok) return guestName;
  return { ok: true, value: { itemName: itemName.value, guestName: guestName.value ?? '' } };
}

function parseSuggestItems(value: unknown): Result<SuggestItemInput[]> {
  if (value === undefined || value === null) return { ok: true, value: [] };
  if (!Array.isArray(value)) return fail('items must be an array');
  if (value.length > MAX_ITEMS_PER_REQUEST) return fail(`items must have at most ${MAX_ITEMS_PER_REQUEST} entries`);
  const parsed: SuggestItemInput[] = [];
  for (const entry of value) {
    const item = parseSuggestItem(entry);
    if (!item.ok) return item;
    parsed.push(item.value);
  }
  return { ok: true, value: parsed };
}

export function parseSuggestInput(body: unknown): Result<SuggestInput> {
  const fields = asRecord(body);
  if (!fields) return fail('Request body must be a JSON object');
  const event = asRecord(fields.event);
  if (!event) return fail('event is required');

  const title = requiredText(event.title, 'event.title', MAX_TITLE);
  if (!title.ok) return title;
  const description = optionalText(event.description, 'event.description', MAX_DESCRIPTION);
  if (!description.ok) return description;
  const hostName = optionalText(event.hostName, 'event.hostName', MAX_SHORT);
  if (!hostName.ok) return hostName;
  const items = parseSuggestItems(fields.items);
  if (!items.ok) return items;

  return {
    ok: true,
    value: {
      event: { title: title.value, description: description.value ?? '', hostName: hostName.value ?? '' },
      items: items.value,
    },
  };
}
