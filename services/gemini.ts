import { GoogleGenAI, Type } from "@google/genai";
import { Event, Item, Suggestion } from "../types";

// Note: In a real production app, you might proxy these requests through your backend 
// to keep the API key secret, or use a restricted key.
const apiKey = process.env.API_KEY || ''; 

export const GeminiService = {
  /**
   * Analyzes the current list and suggests what is missing.
   */
  getSuggestions: async (event: Event, items: Item[]): Promise<Suggestion[]> => {
    if (!apiKey) {
      console.warn("No API Key provided for Gemini.");
      return [
        { itemName: "Ice", reason: "AI features require an API Key." },
        { itemName: "Cups", reason: "Standard party necessity." }
      ];
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        I am planning a party/event.
        Event Title: "${event.title}"
        Event Description: "${event.description}"
        Host: ${event.hostName}
        
        Here is the list of items guests are already bringing:
        ${items.length === 0 ? "No items yet." : items.map(i => `- ${i.itemName} (${i.guestName})`).join('\n')}
        
        Based on the event details and what is already on the list, suggest 3 distinct items that are missing or would be great additions.
        Keep the reason short and fun (under 10 words).
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                itemName: { type: Type.STRING },
                reason: { type: Type.STRING }
              },
              required: ['itemName', 'reason']
            }
          }
        }
      });

      const jsonStr = response.text;
      if (!jsonStr) return [];
      
      return JSON.parse(jsonStr) as Suggestion[];

    } catch (error) {
      console.error("Gemini API Error:", error);
      return [
        { itemName: "Napkins", reason: "Always useful to have more." },
        { itemName: "Music Playlist", reason: "To set the mood." }
      ];
    }
  },

  /**
   * Generates a fun welcome message for the party invite.
   */
  generateWelcomeMessage: async (title: string): Promise<string> => {
    if (!apiKey) return "Let's get this party started!";
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Write a very short, exciting, one-sentence subtitle for a party invitation called "${title}". No quotes.`,
      });
      return response.text?.trim() || "Join us!";
    } catch (e) {
      return "Join the celebration!";
    }
  }
};