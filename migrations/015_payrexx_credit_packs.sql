BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_open_live_credit_pack
  ON payment_orders (user_id, plan)
  WHERE NOT sandbox AND plan IN ('credits_small', 'credits_large')
    AND status IN ('pending', 'gateway-created');
CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_live_one_time_transaction
  ON payment_orders (payrexx_transaction_id)
  WHERE NOT sandbox AND plan IN ('weekly', 'credits_small', 'credits_large') AND live_psp_id IS NOT NULL;

COMMIT;
