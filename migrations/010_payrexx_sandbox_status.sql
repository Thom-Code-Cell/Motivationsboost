BEGIN;
ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS payrexx_gateway_id integer,
  ADD COLUMN IF NOT EXISTS payrexx_status_checked_at timestamptz;
COMMIT;
