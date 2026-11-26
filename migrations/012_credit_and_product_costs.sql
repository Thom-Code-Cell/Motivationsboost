BEGIN;

ALTER TABLE payment_orders DROP CONSTRAINT IF EXISTS payment_orders_plan_check;
ALTER TABLE payment_orders ADD CONSTRAINT payment_orders_plan_check
  CHECK (plan IN ('weekly','monthly','yearly','poweruser','credits_small','credits_large'));
ALTER TABLE ai_entitlements DROP CONSTRAINT IF EXISTS ai_entitlements_plan_check;
ALTER TABLE ai_entitlements ADD CONSTRAINT ai_entitlements_plan_check
  CHECK (plan IN ('weekly','monthly','yearly','poweruser'));

CREATE TABLE IF NOT EXISTS ai_product_spend (
  month date PRIMARY KEY CHECK (EXTRACT(DAY FROM month) = 1),
  committed_micros bigint NOT NULL DEFAULT 0 CHECK (committed_micros >= 0),
  halted boolean NOT NULL DEFAULT false
);
ALTER TABLE ai_spend_reservations ADD COLUMN IF NOT EXISTS product_month date REFERENCES ai_product_spend(month);

CREATE TABLE IF NOT EXISTS ai_credit_usage (
  payment_reference uuid NOT NULL REFERENCES payment_orders(reference_id) ON DELETE CASCADE,
  period integer NOT NULL CHECK (period BETWEEN 0 AND 11),
  spent integer NOT NULL CHECK (spent >= 0),
  PRIMARY KEY (payment_reference, period)
);
CREATE TABLE IF NOT EXISTS ai_credit_debits (
  spend_id uuid NOT NULL REFERENCES ai_spend_reservations(id),
  payment_reference uuid NOT NULL,
  period integer NOT NULL,
  plan text NOT NULL CHECK (plan IN ('weekly','monthly','yearly','poweruser','credits_small','credits_large')),
  credits integer NOT NULL CHECK (credits > 0),
  PRIMARY KEY (spend_id, payment_reference, period)
);

CREATE TABLE IF NOT EXISTS product_economic_postings (
  source_key text PRIMARY KEY CHECK (length(source_key) BETWEEN 1 AND 120),
  month date NOT NULL CHECK (EXTRACT(DAY FROM month) = 1),
  plan text NOT NULL CHECK (plan IN ('free','weekly','monthly','yearly','poweruser','credits_small','credits_large','portfolio')),
  category text NOT NULL CHECK (category IN ('net_sales','refund','chargeback','payment_fee','acquisition','support','operations','shared_fixed','new_paying_customers')),
  amount_micros bigint NOT NULL CHECK (amount_micros >= 0),
  units integer CHECK (units >= 0),
  CHECK (CASE WHEN category = 'new_paying_customers' THEN units IS NOT NULL AND amount_micros = 0 ELSE units IS NULL END),
  recorded_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS product_economic_closes (
  month date PRIMARY KEY CHECK (EXTRACT(DAY FROM month) = 1),
  closed_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON ai_product_spend, ai_credit_usage, ai_credit_debits, product_economic_postings, product_economic_closes FROM PUBLIC;
COMMIT;
