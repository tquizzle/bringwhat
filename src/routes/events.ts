import { Hono, type Context } from 'hono';
import { findEventById, insertEvent } from '../db';
import type { AppEnv } from '../env';
import { readJsonBody, serverError } from '../http';
import { parseEventInput } from '../validation';

export const eventRoutes = new Hono<AppEnv>();

async function createEvent(c: Context<AppEnv>): Promise<Response> {
  const parsed = parseEventInput(await readJsonBody(c));
  if (!parsed.ok) return c.json({ error: parsed.error }, 400);

  const event = { id: crypto.randomUUID(), ...parsed.value, createdAt: Date.now() };
  try {
    await insertEvent(c.env.DB, event);
    console.log(`Created event: ${event.id}`);
    return c.json(event);
  } catch (err) {
    return serverError(c, 'Failed to create event', err);
  }
}

async function getEvent(c: Context<AppEnv, '/api/events/:id'>): Promise<Response> {
  try {
    const event = await findEventById(c.env.DB, c.req.param('id'));
    if (!event) return c.json({ error: 'Event not found' }, 404);
    return c.json(event);
  } catch (err) {
    return serverError(c, 'Failed to fetch event', err);
  }
}

eventRoutes.post('/api/events', createEvent);
eventRoutes.get('/api/events/:id', getEvent);
