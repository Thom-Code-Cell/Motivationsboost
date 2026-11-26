BEGIN;
ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS gateway_url text,
  ADD COLUMN IF NOT EXISTS gateway_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS sandbox boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sandbox_psp_id integer;
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_one_open_sandbox_per_user
  ON payment_orders (user_id) WHERE sandbox AND status IN ('pending', 'gateway-created');
COMMIT;
