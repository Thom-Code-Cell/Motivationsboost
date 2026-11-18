-- Store only authenticated, minimal Payrexx event metadata. Never store customer or payment payloads.
BEGIN;
CREATE TABLE IF NOT EXISTS payrexx_webhook_events (
  event_hash char(64) PRIMARY KEY,
  reference_id text,
  resource_type text NOT NULL CHECK (resource_type IN ('transaction', 'subscription', 'unknown')),
  resource_id text,
  resource_status text,
  received_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payrexx_webhook_events_reference_received
  ON payrexx_webhook_events (reference_id, received_at DESC);
COMMIT;
