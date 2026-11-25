-- An edge may name its governed kinship type and carry the context that bounds
-- it (rispecs/agent-kinship.spec.md). An edge that names a kinship type is
-- identified by its two ends and that name, so an agent can come from a person
-- and also serve that person. Every existing row keeps kinship_type = '' and
-- stays identified by its two ends, as before.
--
-- Not run by the session that wrote it: no Postgres store was at hand. Run it
-- on a copy first.
ALTER TABLE edges ADD COLUMN IF NOT EXISTS kinship_type TEXT NOT NULL DEFAULT '';
ALTER TABLE edges ADD COLUMN IF NOT EXISTS context JSONB;
ALTER TABLE edges DROP CONSTRAINT IF EXISTS edges_pkey;
ALTER TABLE edges ADD PRIMARY KEY (from_id, to_id, kinship_type);
