export const projectSchema = `
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  title TEXT,
  time TIMESTAMP,
  updated_at TIMESTAMP,
  pinned BOOLEAN,
  healthy BOOLEAN,
  version INTEGER
);

CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  parent_id TEXT,
  position INTEGER NOT NULL,
  type TEXT NOT NULL,
  props JSON,
  content JSON
);

CREATE TABLE IF NOT EXISTS annotations (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  text TEXT NOT NULL,
  actor TEXT NOT NULL,
  color TEXT NOT NULL,
  reason TEXT,
  code_id TEXT,
  confidence TEXT
);
`
