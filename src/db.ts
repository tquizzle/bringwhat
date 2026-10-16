import type { EventRecord, ItemRecord } from './types';

export async function pingDatabase(db: D1Database): Promise<void> {
  await db.prepare('SELECT 1').first();
}

export async function insertEvent(db: D1Database, event: EventRecord): Promise<void> {
  await db
    .prepare(
      'INSERT INTO events (id, title, description, date, time, hostName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(event.id, event.title, event.description, event.date, event.time, event.hostName, event.createdAt)
    .run();
}

export async function findEventById(db: D1Database, id: string): Promise<EventRecord | null> {
  return db.prepare('SELECT * FROM events WHERE id = ?').bind(id).first<EventRecord>();
}

export async function eventExists(db: D1Database, id: string): Promise<boolean> {
  const row = await db.prepare('SELECT id FROM events WHERE id = ?').bind(id).first<{ id: string }>();
  return row !== null;
}

export async function listItemsForEvent(db: D1Database, eventId: string): Promise<ItemRecord[]> {
  const result = await db
    .prepare('SELECT * FROM items WHERE eventId = ? ORDER BY createdAt ASC')
    .bind(eventId)
    .all<ItemRecord>();
  return result.results;
}

export async function insertItem(db: D1Database, item: ItemRecord): Promise<void> {
  await db
    .prepare('INSERT INTO items (id, eventId, guestName, itemName, category, createdAt) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(item.id, item.eventId, item.guestName, item.itemName, item.category, item.createdAt)
    .run();
}
