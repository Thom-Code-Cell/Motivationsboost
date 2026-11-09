-- Apply only to a dedicated, empty Motivationsboost database after the
-- Better Auth schema has been generated and applied. Never apply to another app.
BEGIN;
CREATE TABLE IF NOT EXISTS applicant_profiles (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  job_title text NOT NULL,
  company text NOT NULL,
  job_url text,
  status text NOT NULL DEFAULT 'Entwurf',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS applications_owner_created ON applications (user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS ai_entitlements (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('weekly','monthly','yearly')),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('active','cancelled','expired','refunded')),
  CHECK (ends_at > starts_at)
);
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  period_key text NOT NULL,
  actions integer NOT NULL DEFAULT 0 CHECK (actions >= 0),
  PRIMARY KEY (user_id, period_key)
);
COMMIT;
