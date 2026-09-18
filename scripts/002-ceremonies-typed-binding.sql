-- 0.14.0 — typed episode binding, closing and circle on ceremonies.
-- Before this, the episode binding rode as a JSON string in research_context
-- and a closing named its opening in the same field; both wanted one column.
ALTER TABLE ceremonies ADD COLUMN IF NOT EXISTS relations_honored JSONB;
ALTER TABLE ceremonies ADD COLUMN IF NOT EXISTS episode_path TEXT;
ALTER TABLE ceremonies ADD COLUMN IF NOT EXISTS episode_number INTEGER;
ALTER TABLE ceremonies ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE ceremonies ADD COLUMN IF NOT EXISTS closes TEXT;
ALTER TABLE ceremonies ADD COLUMN IF NOT EXISTS circle_id TEXT;
CREATE INDEX IF NOT EXISTS idx_ceremonies_episode_path ON ceremonies(episode_path);
CREATE INDEX IF NOT EXISTS idx_ceremonies_circle_id ON ceremonies(circle_id);
CREATE INDEX IF NOT EXISTS idx_ceremonies_closes ON ceremonies(closes);

-- A circle of people is a node type (0.14.0).
ALTER TABLE nodes DROP CONSTRAINT IF EXISTS nodes_type_check;
ALTER TABLE nodes ADD CONSTRAINT nodes_type_check CHECK (type IN ('human', 'land', 'spirit', 'ancestor', 'future', 'knowledge', 'circle'));
