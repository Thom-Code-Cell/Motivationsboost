BEGIN;

CREATE TABLE IF NOT EXISTS transactional_email_attempts (
  id text PRIMARY KEY CHECK (id ~ '^[0-9a-f]{64}$'),
  attempted_at timestamptz NOT NULL DEFAULT now(),
  sent boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS transactional_email_attempts_at_idx ON transactional_email_attempts (attempted_at);
REVOKE ALL ON transactional_email_attempts FROM PUBLIC;

COMMIT;
