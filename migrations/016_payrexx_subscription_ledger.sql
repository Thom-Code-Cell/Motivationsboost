BEGIN;

ALTER TABLE payment_orders ADD COLUMN IF NOT EXISTS subscription_anchor boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_open_subscription_checkout
  ON payment_orders (user_id)
  WHERE NOT sandbox AND subscription_anchor AND status IN ('pending', 'gateway-created');

CREATE TABLE IF NOT EXISTS payrexx_subscriptions (
  reference_id uuid PRIMARY KEY REFERENCES payment_orders(reference_id) ON DELETE CASCADE,
  tokenization_id integer NOT NULL UNIQUE CHECK (tokenization_id > 0),
  renewal_enabled boolean NOT NULL DEFAULT true,
  authorized_at timestamptz NOT NULL DEFAULT now(),
  cancellation_requested_at timestamptz,
  renewal_paused_at timestamptz
);

CREATE TABLE IF NOT EXISTS payrexx_subscription_periods (
  order_reference uuid PRIMARY KEY REFERENCES payment_orders(reference_id) ON DELETE CASCADE,
  subscription_reference uuid NOT NULL REFERENCES payrexx_subscriptions(reference_id) ON DELETE CASCADE,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL CHECK (ends_at > starts_at),
  charge_requested_at timestamptz,
  UNIQUE (subscription_reference, starts_at)
);
CREATE INDEX IF NOT EXISTS payrexx_subscription_periods_latest
  ON payrexx_subscription_periods (subscription_reference, ends_at DESC);

REVOKE ALL ON payrexx_subscriptions, payrexx_subscription_periods FROM PUBLIC;

COMMIT;
