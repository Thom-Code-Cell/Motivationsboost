# Payrexx Production Handover · 18 November 2026

## Current decision

Motivationsboost billing is assigned to the existing TH Analytica Payrexx merchant account. Payrexx live and Stripe checkout remain disabled in Motivationsboost. Its existing Preview webhook is scoped to the Motivationsboost integration. The draft is developed and tested against a separate application database.

## Test provider in the existing account

Keep the shared Payrexx Pay provider in Live mode for other products. The merchant administration showed Vorkasse (PSP 27) already in Test mode on 25 November. Confirm its mode and accepted currency before running any protected preview checkout. Specify only that provider in the Gateway API request. The server binds the order to its provider and accepts an entitlement event only when the signed transaction shows TEST and the same provider. The Vorkasse flow does not validate live card, TWINT or recurring payments.

Use dedicated Preview credentials for the existing Motivationsboost integration and a separate signing key for its Preview webhook. Store the Preview credentials in the protected Preview deployment. Payrexx documents that the selected provider's mode applies at the provider level.

## Required sandbox acceptance

1. Verify both a successful and declined test transaction.
2. Verify a missing, invalid and replayed webhook signature; duplicate events must remain idempotent.
3. Verify the Payrexx reference maps to exactly one internal order and account, with no client-controlled entitlement assignment.
4. Implement and verify payment success, failure, cancellation, refund, retry and subscription-state transitions.
5. Test self-service cancellation, account deletion while subscribed, entitlement expiry, reconciliation and provider downtime.
6. Confirm checkout content shows the final price, currency, renewal interval, cancellation process, taxes and applicable consumer terms before payment.
7. Keep checkout off until tests pass and the application is explicitly approved.

## Release status · 25 November 2026

- The protected Preview Vorkasse simulation verified checkout, provider status reconciliation, weekly access and delivery of one payment confirmation to the test mailbox.
- The Production weekly candidate is separately gated. Synthetic tests verify the protected acceptance account, amount, PSP and gateway binding, duplicate confirmation, seven-day access, full refunds and chargeback. The live Payrexx payment and refund paths still require a provider acceptance test.
- Payrexx ticket 1030301 requests an isolated method for the remaining instruments, renewals and subscriptions. The public offer is limited to FREE and the weekly pass, with separate availability for each.

## Official reference

- [Payrexx Testing](https://docs.payrexx.com/merchant/english/payment/testing): describes test mode and recommends a separate test account when testing while accepting live payments.
- [Payrexx webhook guide](https://docs.payrexx.com/developer/guides/webhook)
- [Payrexx Gateway API reference](https://developers.payrexx.com/reference/create-a-gateway)

## Isolated weekly checkout candidate · 25 November 2026

The signed-in workspace has a weekly-pass sandbox checkout and an account-owned payment status. The checkout uses the existing Payrexx instance with a dedicated Preview integration credential and a single test provider. The one-time CHF 8.90 amount is resolved server-side. The open order can resume only while the validated sandbox URL is current. A browser redirect does not grant the pass. Only a signed matching sandbox confirmation activates it, and a matching full refund revokes it. Monthly and yearly sales remain disabled.

- Apply migrations through `009_payrexx_sandbox_checkout.sql` to the isolated preview database. Keep application migrations and test records on the isolated preview database.
- Configure the shared instance name, the verified Test provider ID, API key, signing key and test terms version using the settings documented in `.env.example`. Connect the integration-filtered transaction webhook to the protected Preview receiver.
- With synthetic user data, verify gateway creation and the visible TEST and Vorkasse labels before submitting a test order. Verify order status on return, signed callback, duplicate handling and seven-day access rules. Check refund support for that provider. Verify card/TWINT and recurring charges separately before activation.
- Payrexx-managed subscriptions require separate settlement and shopper cancellation work. Validate the policy, first payment, recurring charge, failure, shopper notice, operator cancellation, refund, expiry and account deletion coordination before enabling these tariffs.
- A public weekly release additionally requires a separately approved production payment path, fulfilment, approved terms and refund process, customer notification and reconciliation. Test-mode results do not configure or enable a production route.

### Server-to-server status checks for the protected Preview

Payrexx can be polled from the signed-in workspace without opening Vercel access to the app. Apply migration 010 to the isolated Preview database and set `PAYREXX_SANDBOX_STATUS_POLLING=true` on the same Preview branch as the dedicated test API key. Reconciliation reads only a gateway created for the signed-in account, then checks its transaction reference, amount, provider, currency and TEST mode before changing entitlement. A browser redirect alone cannot grant access. This path does not activate LIVE transactions or replace production webhook acceptance.

## Protected production acceptance for the one-time weekly pass

1. Use the dedicated production database and the product domain under existing Vercel protection. Migration 014 adds the isolated live order binding and a durable queue for payment, refund and chargeback notices. Keep Preview and Production credentials separate.
2. Verify the approved Payrexx provider identifier and the dedicated API integration and webhook signing key. The configurator accepts one live PSP and only a verified account. Use `PAYREXX_WEEKLY_LIVE_ACCEPTANCE_EMAIL` to limit protected rehearsal to the synthetic operator account. Leave `PUBLIC_SITE_LAUNCHED`, `PAYREXX_PAYMENTS_ENABLED` and `PAYREXX_BILLING_VALIDATED` off during rehearsal. The additional `PAYREXX_WEEKLY_LIVE_CHECKOUT` switch must stay off until the provider path and any real test payment have been specifically approved. Set an approved version in `PAYREXX_WEEKLY_LIVE_TERMS_VERSION`.
3. Confirm the production Gmail sender, the bounded commercial AI setup and the agreed checkout terms. Inspect the actual provider page before any payment. Confirm CHF 8.90, one-time billing, the payment method and the seven-day, 20-credit offer.
4. Check a provider-authorised acceptance transaction, replay and refusal behavior, the ledger, the signed callback or independently verified polling path, client-facing status and messages. Check expiration and provider-supported refund and chargeback handling. Verify the durable notification backlog can be retried and monitored when the customer closes the app.
5. Validate that the settlement path can be reached without exposing the protected application. The authenticated app can reconcile a known gateway against Payrexx while protection is on. Verify signed webhook delivery separately before relying on it.
6. Remove the acceptance-account setting after rehearsal. Enable the public weekly purchase only when the weekly flow and the final release are approved. Keep credit packs and recurring plans unavailable until their independent acceptance.
