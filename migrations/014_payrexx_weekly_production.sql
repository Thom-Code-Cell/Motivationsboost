BEGIN;

ALTER TABLE payment_orders
  ADD COLUMN IF NOT EXISTS live_psp_id integer CHECK (live_psp_id > 0),
  ADD COLUMN IF NOT EXISTS customer_locale text CHECK (customer_locale IN ('de', 'en', 'fr', 'it')),
  ADD COLUMN IF NOT EXISTS provider_confirmed_at timestamptz;
ALTER TABLE payment_orders DROP CONSTRAINT IF EXISTS payment_orders_status_check;
ALTER TABLE payment_orders ADD CONSTRAINT payment_orders_status_check
  CHECK (status IN ('pending', 'gateway-created', 'gateway-error', 'paid', 'cancelled', 'refunded', 'chargeback'));
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_one_open_live_weekly_per_user
  ON payment_orders (user_id) WHERE NOT sandbox AND plan = 'weekly' AND status IN ('pending', 'gateway-created');
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_live_weekly_transaction
  ON payment_orders (payrexx_transaction_id) WHERE NOT sandbox AND plan = 'weekly' AND live_psp_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS payrexx_weekly_notices (
  order_reference uuid NOT NULL REFERENCES payment_orders(reference_id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('paid', 'refunded', 'chargeback')),
  queued_at timestamptz NOT NULL DEFAULT now(),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 8),
  sent_at timestamptz,
  PRIMARY KEY (order_reference, kind)
);
REVOKE ALL ON payrexx_weekly_notices FROM PUBLIC;

COMMIT;
