import { Event, Item, Suggestion } from "../types";

export const AIService = {
  getSuggestions: async (event: Event, items: Item[]): Promise<Suggestion[]> => {
    try {
      const response = await fetch('/api/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ event, items }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      return await response.json();
    } catch (error) {
      console.error("AI Service Error:", error);
      // Client-side fallback if server fails completely
      return [
        { itemName: "Napkins", reason: "Always useful." },
        { itemName: "Drinks", reason: "Stay hydrated." }
      ];
    }
  }
};
