WITH months AS (
  SELECT period::date AS month
  FROM generate_series(
    date_trunc('month', now() AT TIME ZONE 'Europe/Zurich') - interval '1 month',
    date_trunc('month', now() AT TIME ZONE 'Europe/Zurich'), interval '1 month'
  ) AS period
), offers(plan) AS (
  VALUES ('free'), ('weekly'), ('monthly'), ('yearly'), ('poweruser'), ('credits_small'), ('credits_large'), ('portfolio')
), debit_totals AS (
  SELECT s.id, s.product_month AS month, s.actual_micros, s.reserved_micros,
    sum(d.credits) AS credits
  FROM ai_spend_reservations s JOIN ai_credit_debits d ON d.spend_id = s.id
  WHERE s.product_month IN (SELECT month FROM months)
  GROUP BY s.id
), text_costs AS (
  SELECT t.month, d.plan,
    sum(coalesce(t.actual_micros, 0)::numeric * d.credits / t.credits) AS paid,
    sum(CASE WHEN t.actual_micros IS NULL THEN t.reserved_micros::numeric * d.credits / t.credits ELSE 0 END) AS unresolved
  FROM debit_totals t JOIN ai_credit_debits d ON d.spend_id = t.id
  GROUP BY t.month, d.plan
), totals AS (
  SELECT m.month, o.plan,
    coalesce(sum(p.amount_micros) FILTER (WHERE p.category = 'net_sales'), 0) AS sales,
    coalesce(sum(p.amount_micros) FILTER (WHERE p.category IN ('refund', 'chargeback')), 0) AS reversals,
    coalesce(sum(p.amount_micros) FILTER (WHERE p.category = 'payment_fee'), 0) AS payment_fees,
    coalesce(sum(p.amount_micros) FILTER (WHERE p.category = 'acquisition'), 0) AS acquisition,
    coalesce(sum(p.amount_micros) FILTER (WHERE p.category = 'support'), 0) AS support,
    coalesce(sum(p.amount_micros) FILTER (WHERE p.category = 'operations'), 0) AS operations,
    coalesce(sum(p.amount_micros) FILTER (WHERE p.category = 'shared_fixed'), 0) AS shared,
    sum(p.units) FILTER (WHERE p.category = 'new_paying_customers') AS new_paying_customers,
    count(p.source_key) AS postings
  FROM months m CROSS JOIN offers o
  LEFT JOIN product_economic_postings p ON p.month = m.month AND p.plan = o.plan
  GROUP BY m.month, o.plan
), by_plan AS (
  SELECT t.*, coalesce(c.paid, 0) AS ai, coalesce(c.unresolved, 0) AS ai_unresolved
  FROM totals t LEFT JOIN text_costs c USING (month, plan)
), combined AS (
  SELECT * FROM by_plan WHERE plan <> 'portfolio'
  UNION ALL
  SELECT month, 'portfolio', sum(sales), sum(reversals), sum(payment_fees), sum(acquisition), sum(support),
    sum(operations), sum(shared), sum(new_paying_customers), sum(postings), sum(ai), sum(ai_unresolved)
  FROM by_plan GROUP BY month
), margins AS (
  SELECT *, sales - reversals AS net_revenue,
    sales - reversals - payment_fees - acquisition - support - operations - ai AS operating_result
  FROM combined
)
SELECT m.month, plan, postings, net_revenue AS revenue_chf_micros, payment_fees AS payment_fee_chf_micros,
  acquisition AS acquisition_chf_micros, support AS support_chf_micros, operations AS operations_chf_micros,
  new_paying_customers, round(acquisition / nullif(new_paying_customers, 0)) AS acquisition_per_new_payer_chf_micros,
  shared AS shared_chf_micros, round(ai) AS ai_chf_micros, round(ai_unresolved) AS ai_unresolved_chf_micros,
  CASE WHEN net_revenue > 0 THEN round(100 * operating_result / net_revenue, 2) END AS operating_margin_pct,
  round(operating_result - shared) AS result_after_shared_chf_micros,
  CASE
    WHEN ai_unresolved > 0 THEN 'incomplete_ai_cost'
    WHEN postings = 0 AND ai = 0 THEN 'no_commercial_data'
    WHEN net_revenue <= 0 THEN 'no_positive_net_revenue'
    WHEN operating_result < net_revenue * 0.80 THEN 'below_80_percent'
    WHEN c.month IS NULL THEN 'provisional'
    ELSE 'closed'
  END AS status,
  acquisition > new_paying_customers * 1000000 AS acquisition_above_start_scenario,
  c.month IS NOT NULL AS operator_closed
FROM margins m LEFT JOIN product_economic_closes c ON c.month = m.month
ORDER BY m.month DESC, CASE WHEN plan = 'portfolio' THEN 0 ELSE 1 END, plan;
