export interface EventRecord {
  id: string;
  title: string;
  description: string | null;
  date: string | null;
  time: string | null;
  hostName: string | null;
  createdAt: number;
}

export interface ItemRecord {
  id: string;
  eventId: string;
  guestName: string | null;
  itemName: string;
  category: string | null;
  createdAt: number;
}

export interface Suggestion {
  itemName: string;
  reason: string;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
