-- Sort project and task names alphabetically regardless of case ("alpha" next to "Alpha").
-- The default "C" collation orders by byte value, putting every uppercase letter first.
-- "und-x-icu" is deterministic, so equality, unique checks and ILIKE search keep working.
ALTER TABLE "projects" ALTER COLUMN "name" TYPE VARCHAR(120) COLLATE "und-x-icu";
ALTER TABLE "tasks" ALTER COLUMN "name" TYPE VARCHAR(160) COLLATE "und-x-icu";
