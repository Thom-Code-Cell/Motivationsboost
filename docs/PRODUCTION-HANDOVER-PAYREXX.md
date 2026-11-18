# Payrexx Production Handover · 18 November 2026

## Current decision

- Payrexx is the intended payment provider. Payrexx and Stripe checkout remain disabled.
- Do not enable checkout by setting environment flags until a separate test account has passed the complete acceptance flow.
- The current verified webhook receiver rejects missing/invalid signatures, limits request size, hashes the raw event, persists only minimal event metadata, and returns `premiumGranted: false`. It does not grant or revoke an entitlement.
- The checkout route returns HTTP 503 while billing is not approved. No real customer charge is enabled by this code.

## Test-account requirement

Payrexx's current merchant documentation describes a provider-level switch between Live and Test. It also recommends creating a second Payrexx account when testing while continuing to accept live payments. Keep the existing TH Analytica merchant account in Live mode; never switch its provider mode for Motivationsboost testing.

Before sandbox acceptance, create or connect a separate Payrexx test account and separate test API credentials. Register only the protected Preview webhook URL. Do not place Live credentials or test credentials in Git, logs, client code or the other environment.

## Required sandbox acceptance

1. Verify both a successful and declined test transaction.
2. Verify a missing, invalid and replayed webhook signature; duplicate events must remain idempotent.
3. Verify the Payrexx reference maps to exactly one internal order and account, with no client-controlled entitlement assignment.
4. Implement and verify payment success, failure, cancellation, refund, retry and subscription-state transitions.
5. Test self-service cancellation, account deletion while subscribed, entitlement expiry, reconciliation and provider downtime.
6. Confirm checkout content shows the final price, currency, renewal interval, cancellation process, taxes and applicable consumer terms before payment.
7. Keep checkout off until tests pass and the application is explicitly approved.

## Not complete

- No Payrexx sandbox account/credentials or end-to-end test transaction has been verified for this release candidate.
- Premium entitlement fulfillment and cancellation are intentionally not implemented.
- Webhook registration at Payrexx and secure Production delivery still depend on Vercel project access and production secrets.

## Official reference

- [Payrexx Testing](https://docs.payrexx.com/merchant/english/payment/testing): describes test mode and recommends a separate test account when testing while accepting live payments.
- [Payrexx webhook guide](https://docs.payrexx.com/developer/guides/webhook)
- [Payrexx Gateway API reference](https://developers.payrexx.com/reference/create-a-gateway)
