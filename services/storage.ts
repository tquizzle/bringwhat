import { Event, Item } from '../types';

const API_BASE = '/api';

export const StorageService = {
  // Events
  createEvent: async (event: Omit<Event, 'id' | 'createdAt'>): Promise<Event> => {
    const response = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    if (!response.ok) throw new Error('Failed to create event');
    return response.json();
  },

  getEvents: async (): Promise<Event[]> => {
    // Note: We haven't implemented getEvents in backend yet as it wasn't strictly used in the UI flow, 
    // but good to have for completeness if needed later.
    return []; 
  },

  getEventById: async (id: string): Promise<Event | undefined> => {
    const response = await fetch(`${API_BASE}/events/${id}`);
    if (!response.ok) return undefined;
    return response.json();
  },

  // Items
  addItem: async (item: Omit<Item, 'id' | 'createdAt'>): Promise<Item> => {
    const response = await fetch(`${API_BASE}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!response.ok) throw new Error('Failed to add item');
    return response.json();
  },

  getItemsByEventId: async (eventId: string): Promise<Item[]> => {
    const response = await fetch(`${API_BASE}/events/${eventId}/items`);
    if (!response.ok) return [];
    return response.json();
  },

  getAllItems: async (): Promise<Item[]> => {
    return [];
  },

  removeItem: async (_itemId: string) => {
    // Implementation pending backend support
  }
};