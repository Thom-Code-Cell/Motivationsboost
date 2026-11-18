# Payrexx webhook-only service

This small Next.js project exists only to receive signed Payrexx webhooks. It does not serve the Motivationsboost application or grant premium entitlements.

## Vercel project

- Project name: `motivationsboost-payrexx-webhook-preview`
- Root directory: `webhook-only`
- Expose Preview deployments so Payrexx can reach this service. Keep the main `motivationsboost-preview` project behind SSO.
- Connect the `motivationsboost-preview-db` Neon database to this project for **Preview only**. The integration supplies `DATABASE_URL` as an encrypted environment variable.

## Preview environment variables

- `PAYREXX_WEBHOOK_ENABLED=true`
- `PAYREXX_WEBHOOK_SIGNING_KEY=<signing secret generated for the Payrexx webhook>`
- `DATABASE_URL=<supplied by the Neon integration>`

Set the first two variables as encrypted Preview values. Never use these settings in Production.

## Payrexx webhook

Configure the webhook URL as `https://<preview-deployment-host>/api/payrexx/webhook`, content type JSON, and select only Transaction and Subscription events filtered to the Motivationsboost API integration. Do not configure payouts or another merchant integration. Copy the generated Payrexx signing secret to `PAYREXX_WEBHOOK_SIGNING_KEY` before enabling delivery.

The receiver verifies `X-Webhook-Signature` against the untouched request bytes and stores only an event hash, reference ID, resource type, resource ID, status, and receive timestamp. Raw webhook bodies and customer data are not persisted. Duplicate deliveries are acknowledged idempotently. It never grants premium access.
