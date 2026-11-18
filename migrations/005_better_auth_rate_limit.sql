-- Persistent Better Auth rate limiting for serverless production instances.
BEGIN;
CREATE TABLE IF NOT EXISTS "rateLimit" (
  key text PRIMARY KEY,
  count integer NOT NULL CHECK (count >= 0),
  "lastRequest" bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limit_last_request_idx ON "rateLimit" ("lastRequest");
COMMIT;
