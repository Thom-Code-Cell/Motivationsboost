WITH current_paid AS (
  SELECT DISTINCT ON (user_id) user_id, reference_id, plan, updated_at
  FROM payment_orders
  WHERE sandbox AND status = 'paid'
  ORDER BY user_id, updated_at DESC
)
SELECT
  budget.halted AS ai_halted,
  budget.committed_micros AS ai_committed_micros,
  (SELECT count(*) FROM ai_spend_reservations
     WHERE actual_micros IS NULL AND created_at > TIMESTAMPTZ '2026-11-25 12:35:10+00'
       AND created_at < now() - interval '15 minutes') AS ai_new_stale_reservations,
  (SELECT count(*) FROM payment_orders
     WHERE sandbox AND status = 'gateway-error' AND updated_at >= now() - interval '4 hours') AS sandbox_gateway_errors,
  (SELECT count(*) FROM current_paid orders
     WHERE orders.plan = 'weekly' AND orders.updated_at >= now() - interval '6 days'
       AND NOT EXISTS (
         SELECT FROM ai_entitlements entitlement
         WHERE entitlement.user_id = orders.user_id AND entitlement.payment_reference = orders.reference_id
           AND entitlement.status = 'active' AND entitlement.ends_at > now()
       )) AS sandbox_recent_paid_without_access,
  (SELECT count(*) FROM payrexx_test_notices
     WHERE sent_at IS NULL AND queued_at < now() - interval '4 hours') AS sandbox_notices_waiting,
  (SELECT count(*) FROM payrexx_test_notices
     WHERE sent_at IS NULL AND attempts >= 8) AS sandbox_notices_exhausted
FROM ai_spend_budget budget WHERE budget.id = 'internal-test';
