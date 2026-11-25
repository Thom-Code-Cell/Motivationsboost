BEGIN;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS payrexx_transaction_id text;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS accepted_terms_version text;
ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS accepted_terms_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_payrexx_transaction_unique
  ON payment_orders (payrexx_transaction_id) WHERE payrexx_transaction_id IS NOT NULL;
ALTER TABLE ai_entitlements ADD COLUMN IF NOT EXISTS payment_reference uuid
  REFERENCES payment_orders(reference_id) ON DELETE SET NULL;
COMMIT;
