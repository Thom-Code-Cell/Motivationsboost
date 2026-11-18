-- Payrexx remains disabled until sandbox payment and entitlement verification.
BEGIN;
CREATE TABLE IF NOT EXISTS payment_orders (
  reference_id uuid PRIMARY KEY,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('weekly', 'monthly', 'yearly')),
  amount integer NOT NULL CHECK (amount > 0),
  currency text NOT NULL CHECK (currency = 'CHF'),
  status text NOT NULL CHECK (status IN ('pending', 'gateway-created', 'gateway-error', 'paid', 'cancelled', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payment_orders_owner_created ON payment_orders (user_id, created_at DESC);
COMMIT;
