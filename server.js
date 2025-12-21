import express from 'express';
import { GoogleGenAI, Type } from "@google/genai";
import Database from 'better-sqlite3';
import pg from 'pg';
import mysql from 'mysql2/promise'; // Using promise wrapper
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const DB_TYPE = process.env.DB_TYPE || 'sqlite'; // 'sqlite', 'postgres', 'mysql'

// Validate environment variables
function validateEnv() {
  if (DB_TYPE === 'mysql') {
    if (!process.env.DB_HOST && !process.env.DATABASE_URL) {
      console.error('ERROR: DB_HOST or DATABASE_URL required for MySQL');
      process.exit(1);
    }
  }
  if (DB_TYPE === 'postgres') {
    if (!process.env.DB_HOST && !process.env.DATABASE_URL) {
      console.error('ERROR: DB_HOST or DATABASE_URL required for PostgreSQL');
      process.exit(1);
    }
  }
  console.log('✓ Environment variables validated');
}

validateEnv();

// Middleware
app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

// --- Database Adapter ---
// We create a unified interface for DBs to handle query syntax differences ($1 vs ?)

class DbAdapter {
  constructor() {
    this.type = DB_TYPE;
    console.log(`Initializing Database: ${this.type.toUpperCase()}`);
  }

  async init() {
    if (this.type === 'postgres') {
      const { Pool } = pg;
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      });

      // Test connection
      try {
        await this.pool.query('SELECT NOW()');
        console.log("Connected to PostgreSQL");
      } catch (e) {
        console.error("Postgres Connection Failed:", e);
        process.exit(1);
      }
    } else if (this.type === 'mysql') {
      const connectWithRetry = async (retries = 5, delay = 5000) => {
        for (let i = 0; i < retries; i++) {
          try {
            // mysql2/promise createPool
            this.mysqlPool = mysql.createPool({
              uri: process.env.DATABASE_URL, // Optional URL
              host: process.env.DB_HOST,
              user: process.env.DB_USER,
              password: process.env.DB_PASS,
              database: process.env.DB_NAME,
              port: process.env.DB_PORT || 3306,
              waitForConnections: true,
              connectionLimit: 10,
              queueLimit: 0,
              ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
            });

            // Test connection
            await this.mysqlPool.query('SELECT 1');
            console.log("Connected to MySQL");
            return; // Success
          } catch (e) {
            console.error(`MySQL Connection Failed (Attempt ${i + 1}/${retries}):`, e.message);
            if (i === retries - 1) {
              console.error("Max retries reached. Exiting.");
              process.exit(1);
            }
            await new Promise(res => setTimeout(res, delay));
          }
        }
      };
      await connectWithRetry();
    } else {
      const dbPath = process.env.DB_PATH || join(__dirname, 'bringwhat.db');
      const dbDir = dirname(dbPath);
      if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

      // better-sqlite3 is synchronous (and faster!)
      this.sqliteDb = new Database(dbPath);
      this.sqliteDb.pragma('journal_mode = WAL'); // Recommended for better performance
      console.log(`Using SQLite (better-sqlite3) at: ${dbPath}`);
    }

    await this.createTables();
  }

  async createTables() {
    // Schema definitions
    // MySQL uses slightly different syntax for some things (e.g. TEXT is fine, but ID handling might vary)
    // For simplicity, we stick to generic SQL that usually works across all 3 for simple schemas.
    // Note: 'INTEGER' in MySQL is fine. 'TEXT' is fine.

    // Postgres specific modifiers could be needed if using SERIAL, but we generate IDs manually as strings, which is great for portability.

    const queries = [
      `CREATE TABLE IF NOT EXISTS events (
        id VARCHAR(255) PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        date TEXT,
        time TEXT,
        hostName TEXT,
        createdAt BIGINT
      )`,
      `CREATE TABLE IF NOT EXISTS items (
        id VARCHAR(255) PRIMARY KEY,
        eventId VARCHAR(255),
        guestName TEXT,
        itemName TEXT,
        category TEXT,
        createdAt BIGINT,
        FOREIGN KEY(eventId) REFERENCES events(id) ON DELETE CASCADE
      )`,
      // Add indexes for better query performance
      `CREATE INDEX IF NOT EXISTS idx_items_eventId ON items(eventId)`,
      `CREATE INDEX IF NOT EXISTS idx_events_createdAt ON events(createdAt)`,
      `CREATE INDEX IF NOT EXISTS idx_items_createdAt ON items(createdAt)`
    ];
    // Note: Added ON DELETE CASCADE to items for better cleanup, valid in all 3 usually.
    // Changed INTEGER to BIGINT for createdAt to be safe with JS timestamps (though standard INTEGER often works)
    // Changed ID to VARCHAR(255) for MySQL compatibility (TEXT key issues)

    for (const sql of queries) {
      if (this.type === 'postgres') {
        await this.pool.query(sql);
      } else if (this.type === 'mysql') {
        await this.mysqlPool.query(sql);
      } else {
        // better-sqlite3
        this.sqliteDb.prepare(sql).run();
      }
    }
  }

  // Generic Query Runner
  async run(sql, params = []) {
    if (this.type === 'postgres') {
      // Convert ? to $1, $2, etc for Postgres
      let paramIndex = 1;
      const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
      return this.pool.query(pgSql, params);
    } else if (this.type === 'mysql') {
      // MySQL uses ? just like SQLite!
      const [results] = await this.mysqlPool.execute(sql, params);
      return results;
    } else {
      return new Promise((resolve, reject) => {
        try {
          const stmt = this.sqliteDb.prepare(sql);
          const info = stmt.run(...params);
          resolve(info);
        } catch (err) {
          reject(err);
        }
      });
    }
  }

  // Fetch One
  async get(sql, params = []) {
    if (this.type === 'postgres') {
      let paramIndex = 1;
      const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
      const res = await this.pool.query(pgSql, params);
      return res.rows[0];
    } else if (this.type === 'mysql') {
      const [rows] = await this.mysqlPool.execute(sql, params);
      return rows[0];
    } else {
      return new Promise((resolve, reject) => {
        try {
          const stmt = this.sqliteDb.prepare(sql);
          const row = stmt.get(...params);
          resolve(row);
        } catch (err) {
          reject(err);
        }
      });
    }
  }

  // Fetch All
  async all(sql, params = []) {
    if (this.type === 'postgres') {
      let paramIndex = 1;
      const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
      const res = await this.pool.query(pgSql, params);
      return res.rows;
    } else if (this.type === 'mysql') {
      const [rows] = await this.mysqlPool.execute(sql, params);
      return rows;
    } else {
      return new Promise((resolve, reject) => {
        try {
          const stmt = this.sqliteDb.prepare(sql);
          const rows = stmt.all(...params);
          resolve(rows);
        } catch (err) {
          reject(err);
        }
      });
    }
  }
}

const db = new DbAdapter();
db.init();

const generateId = () => Math.random().toString(36).substring(2, 9);

// --- API Routes ---

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    // Quick DB check
    if (db.type === 'postgres') {
      await db.pool.query('SELECT 1');
    } else if (db.type === 'mysql') {
      await db.mysqlPool.query('SELECT 1');
    } else {
      db.sqliteDb.prepare('SELECT 1').get();
    }
    res.json({
      status: 'healthy',
      database: DB_TYPE,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    res.status(503).json({
      status: 'unhealthy',
      error: e.message,
      database: DB_TYPE
    });
  }
});

// Create Event
app.post('/api/events', async (req, res) => {
  const { title, description, date, time, hostName } = req.body;
  const id = generateId();
  const createdAt = Date.now();

  try {
    await db.run(
      `INSERT INTO events (id, title, description, date, time, hostName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, title, description, date, time, hostName, createdAt]
    );
    console.log(`Created event: ${title} (${id})`);
    res.json({ id, title, description, date, time, hostName, createdAt });
  } catch (err) {
    console.error("Error creating event:", err);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Get Event
app.get('/api/events/:id', async (req, res) => {
  try {
    const event = await db.get(`SELECT * FROM events WHERE id = ?`, [req.params.id]);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    console.error("Error fetching event:", err);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Get Items for Event
app.get('/api/events/:id/items', async (req, res) => {
  try {
    const items = await db.all(`SELECT * FROM items WHERE eventId = ? ORDER BY createdAt ASC`, [req.params.id]);
    res.json(items);
  } catch (err) {
    console.error("Error fetching items:", err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Add Item
app.post('/api/items', async (req, res) => {
  const { eventId, guestName, itemName, category } = req.body;
  const id = generateId();
  const createdAt = Date.now();

  try {
    await db.run(
      `INSERT INTO items (id, eventId, guestName, itemName, category, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, eventId, guestName, itemName, category, createdAt]
    );
    console.log(`Added item: ${itemName} for event ${eventId}`);
    res.json({ id, eventId, guestName, itemName, category, createdAt });
  } catch (err) {
    console.error("Error adding item:", err);
    res.status(500).json({ error: 'Failed to add item' });
  }
});

// --- AI Logic ---
app.post('/api/suggest', async (req, res) => {
  const { event, items } = req.body;
  const apiKey = process.env.API_KEY || '';
  const provider = process.env.AI_PROVIDER || 'gemini';
  const baseUrl = process.env.AI_BASE_URL;
  const customModel = process.env.AI_MODEL;

  if (!apiKey && provider === 'gemini') {
    return res.json([
      { itemName: "Ice", reason: "AI features require an API Key." },
      { itemName: "Cups", reason: "Standard party necessity." }
    ]);
  }

  const systemPrompt = `
    You are a party planning assistant.
    Event Title: "${event.title}"
    Description: "${event.description}"
    Host: ${event.hostName}
    
    Current Items:
    ${items.length === 0 ? "No items yet." : items.map(i => `- ${i.itemName} (${i.guestName})`).join('\n')}
    
    Suggest 3 distinct items that are missing.
    Return ONLY a raw JSON array. Do not include markdown formatting like \`\`\`json.
    Format: [{"itemName": "...", "reason": "..."}]
    Keep reasons under 10 words.
  `;

  try {
    if (provider === 'openai') {
      const url = baseUrl || 'https://api.openai.com/v1';
      const model = customModel || 'gpt-4o-mini';
      const targetUrl = `${url.replace(/\/$/, '')}/chat/completions`;

      console.log(`[AI] Using Provider: OpenAI-compat`);
      console.log(`[AI] URL: ${targetUrl}`);
      console.log(`[AI] Model: ${model}`);

      const aiRes = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: systemPrompt }],
          temperature: 0.7
        })
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.error(`[AI] Error Response: ${errText}`);
        throw new Error(`OpenAI Error: ${aiRes.status} ${aiRes.statusText}`);
      }

      const data = await aiRes.json();
      let content = data.choices[0]?.message?.content || '[]';
      content = content.replace(/```json/g, '').replace(/```/g, '').trim();
      res.json(JSON.parse(content));

    } else {
      // Gemini
      const ai = new GoogleGenAI({ apiKey });
      const modelName = customModel || 'gemini-2.5-flash';

      const response = await ai.models.generateContent({
        model: modelName,
        contents: systemPrompt,
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
      const text = response.text;
      res.json(text ? JSON.parse(text) : []);
    }
  } catch (error) {
    console.error("AI Error:", error);
    res.json([
      { itemName: "Napkins", reason: "Always useful." },
      { itemName: "Snacks", reason: "Backup plan." }
    ]);
  }
});

// Catch-all for client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Initialize DB and then start server
db.init().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n--- BringWhat Server ---`);
    console.log(`Server running on port ${PORT}`);
    console.log(`Database Type: ${DB_TYPE}`);
    console.log(`Gemini API Key: ${process.env.API_KEY ? 'Provided (***)' : 'Not Provided'}`);
    console.log(`------------------------\n`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});