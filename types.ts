export interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  hostName: string;
  createdAt: number;
}

export interface Item {
  id: string;
  eventId: string;
  guestName: string;
  itemName: string;
  category?: 'food' | 'drink' | 'supplies' | 'other';
  createdAt: number;
}

export interface Suggestion {
  itemName: string;
  reason: string;
}

export type ViewState = 
  | { type: 'HOME' }
  | { type: 'CREATE_EVENT' }
  | { type: 'EVENT_DETAILS'; eventId: string };
