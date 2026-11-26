BEGIN;

-- Better Auth stores the user ID in value only for password-reset records.
ALTER TABLE verification
  ADD COLUMN IF NOT EXISTS password_reset_user_id text
  GENERATED ALWAYS AS (CASE WHEN starts_with(identifier, 'reset-password:') THEN value END) STORED;

DELETE FROM verification AS v
WHERE v.password_reset_user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "user" WHERE id = v.password_reset_user_id);

CREATE INDEX IF NOT EXISTS verification_password_reset_user_id_idx
  ON verification (password_reset_user_id) WHERE password_reset_user_id IS NOT NULL;

ALTER TABLE verification DROP CONSTRAINT IF EXISTS verification_password_reset_user_fk;
ALTER TABLE verification ADD CONSTRAINT verification_password_reset_user_fk
  FOREIGN KEY (password_reset_user_id) REFERENCES "user"(id) ON DELETE CASCADE;

COMMIT;
