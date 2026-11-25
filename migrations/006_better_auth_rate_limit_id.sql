-- Existing Beta databases keep their rate-limit counters and unique keys.
BEGIN;
ALTER TABLE "rateLimit" ADD COLUMN IF NOT EXISTS id text;
UPDATE "rateLimit" SET id = key WHERE id IS NULL;
ALTER TABLE "rateLimit" ALTER COLUMN id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS rate_limit_id_idx ON "rateLimit" (id);
COMMIT;
