import { Hono, type Context } from 'hono';
import { eventExists, insertItem, listItemsForEvent } from '../db';
import type { AppEnv } from '../env';
import { readJsonBody, serverError } from '../http';
import { parseItemInput } from '../validation';

export const itemRoutes = new Hono<AppEnv>();

async function listItems(c: Context<AppEnv, '/api/events/:id/items'>): Promise<Response> {
  try {
    const items = await listItemsForEvent(c.env.DB, c.req.param('id'));
    return c.json(items);
  } catch (err) {
    return serverError(c, 'Failed to fetch items', err);
  }
}

async function createItem(c: Context<AppEnv>): Promise<Response> {
  const parsed = parseItemInput(await readJsonBody(c));
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const item = { id: crypto.randomUUID(), ...parsed.value, createdAt: Date.now() };
  try {
    if (!(await eventExists(c.env.DB, item.eventId))) {
      return c.json({ error: 'Event not found' }, 404);
    }
    await insertItem(c.env.DB, item);
    console.log(`Added item to event: ${item.eventId}`);
    return c.json(item);
  } catch (err) {
    return serverError(c, 'Failed to add item', err);
  }
}

itemRoutes.get('/api/events/:id/items', listItems);
itemRoutes.post('/api/items', createItem);
