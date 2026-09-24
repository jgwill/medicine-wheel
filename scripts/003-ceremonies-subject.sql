-- 0.15.5 — a ceremony names the node it is held about (jgwill/medicine-wheel#146).
ALTER TABLE ceremonies ADD COLUMN IF NOT EXISTS subject_id TEXT;
CREATE INDEX IF NOT EXISTS idx_ceremonies_subject_id ON ceremonies(subject_id);
