-- Medicine Wheel Storage Schema
-- Run this migration to set up Neon/Postgres tables

-- Nodes table (relational entities)
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('human', 'land', 'spirit', 'ancestor', 'future', 'knowledge')),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  direction TEXT CHECK (direction IN ('east', 'south', 'west', 'north', NULL)),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Edges table (relationships between nodes)
CREATE TABLE IF NOT EXISTS edges (
  from_id TEXT NOT NULL,
  to_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  strength REAL DEFAULT 1.0,
  ceremony_honored BOOLEAN DEFAULT FALSE,
  last_ceremony TEXT,
  obligations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (from_id, to_id)
);

-- Ceremonies table
CREATE TABLE IF NOT EXISTS ceremonies (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('smudging', 'talking_circle', 'spirit_feeding', 'opening', 'closing')),
  direction TEXT NOT NULL CHECK (direction IN ('east', 'south', 'west', 'north')),
  participants JSONB DEFAULT '[]',
  medicines_used JSONB DEFAULT '[]',
  intentions JSONB DEFAULT '[]',
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  research_context TEXT
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_nodes_type ON nodes(type);
CREATE INDEX IF NOT EXISTS idx_nodes_direction ON nodes(direction);
CREATE INDEX IF NOT EXISTS idx_ceremonies_direction ON ceremonies(direction);
CREATE INDEX IF NOT EXISTS idx_ceremonies_type ON ceremonies(type);
CREATE INDEX IF NOT EXISTS idx_ceremonies_timestamp ON ceremonies(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_edges_from ON edges(from_id);
CREATE INDEX IF NOT EXISTS idx_edges_to ON edges(to_id);

-- Updated_at trigger for nodes
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_nodes_updated_at ON nodes;
CREATE TRIGGER update_nodes_updated_at
  BEFORE UPDATE ON nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
