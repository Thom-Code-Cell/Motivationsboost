BEGIN;
CREATE TABLE IF NOT EXISTS ai_spend_budget (
  id text PRIMARY KEY CHECK (id = 'internal-test'),
  committed_micros bigint NOT NULL DEFAULT 0 CHECK (committed_micros BETWEEN 0 AND 10000000),
  halted boolean NOT NULL DEFAULT false
);
INSERT INTO ai_spend_budget (id) VALUES ('internal-test') ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS ai_spend_reservations (
  id uuid PRIMARY KEY,
  user_id text REFERENCES "user"(id) ON DELETE SET NULL,
  request_id uuid NOT NULL,
  reserved_micros integer NOT NULL CHECK (reserved_micros > 0),
  actual_micros integer CHECK (actual_micros BETWEEN 0 AND reserved_micros),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, request_id)
);
REVOKE ALL ON ai_spend_budget, ai_spend_reservations FROM PUBLIC;
COMMIT;
