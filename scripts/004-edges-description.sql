-- A relation keeps the words that say why it holds (jgwill/medicine-wheel#150).
ALTER TABLE edges ADD COLUMN IF NOT EXISTS description TEXT;
