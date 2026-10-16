CREATE TABLE events (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  date TEXT,
  time TEXT,
  hostName TEXT,
  createdAt INTEGER
);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  eventId TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  guestName TEXT,
  itemName TEXT,
  category TEXT,
  createdAt INTEGER
);

CREATE INDEX idx_items_eventId ON items(eventId);
CREATE INDEX idx_events_createdAt ON events(createdAt);
CREATE INDEX idx_items_createdAt ON items(createdAt);
