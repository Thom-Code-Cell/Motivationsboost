BEGIN;
CREATE TABLE IF NOT EXISTS payrexx_test_notices (
  order_reference uuid NOT NULL REFERENCES payment_orders(reference_id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('paid', 'refunded')),
  queued_at timestamptz NOT NULL DEFAULT now(),
  retry_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 8),
  sent_at timestamptz,
  PRIMARY KEY (order_reference, kind)
);
REVOKE ALL ON payrexx_test_notices FROM PUBLIC;
COMMIT;
