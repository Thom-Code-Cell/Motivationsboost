# Motivationsboost release checklist

Production stays separate from the protected Preview. A successful Preview build establishes only the environment and flows actually tested.

## Gate status checked 18 November 2026

- **Vercel:** Only `motivationsboost-preview` exists for this app. It is not live, has Vercel Authentication enabled, and has no app-specific production domain. The connected Vercel API cannot list environment variables or Marketplace integrations (403); the Vercel CLI is not installed. No Production secrets were written.
- **Neon:** Only `motivationsboost-preview-db` exists in Frankfurt, in a Vercel-managed organization. Its Preview branch has the app schema. The default `main` branch currently has only `payrexx_webhook_events`; do not treat it as a ready production database. Direct project creation was rejected because the organization is managed by Vercel.
- **Email:** No production Resend sender has been verified. Production sender identity, DNS records and delivery/retention remain unverified.
- **OpenAI:** No production API key is configured. Use a dedicated project key only after enforcing a project hard-spend limit with enough CHF/USD exchange-rate margin. OpenAI says hard-limit enforcement is not instantaneous and recorded spend can slightly exceed the configured cap ([spend limits](https://developers.openai.com/api/docs/guides/spend-limits)).
- **Payments:** Payrexx checkout is disabled. Motivationsboost uses the existing TH Analytica merchant account. Keep Payrexx Pay in Live mode. A protected Preview can use only a provider already verified to be in Test mode (see the Payrexx handover). No end-to-end Payrexx sandbox transaction is verified, and entitlement fulfillment/cancellation remains unimplemented.
- **Privacy/legal:** Existing pages name the responsible person and describe current data uses and providers. They do not yet state actual production recipient countries, transfer safeguards or provider-specific retention periods because Production services are not configured. The EDÖB requires privacy information to reflect actual processing and identify relevant recipients, destination countries and duration ([information duty](https://www.edoeb.admin.ch/de/informationspflicht), [online privacy statements](https://www.edoeb.admin.ch/de/datenschutzerklaerungen-im-internet)). Obtain a Swiss privacy/legal review after the final provider configuration.
- **Dependency audit:** `npm audit` reports 21 issues (14 moderate, 7 high); `npm audit --omit=dev` reports 5 high in the Vite/Vitest build/test dependency tree. The current Next.js server file traces contain none of Firebase, Google Cloud, Vite, Vitest or those transitive packages. Resolve or formally risk-accept the findings before release.

This assessment records the state of connected tools and repository files; it is not legal advice or a production approval.

## Before accepting real user data

- Create and isolate a Production Neon database. Apply migrations `000`, `001`, `005`; add `002` only for webhook event storage and `004` only while preparing disabled Payrexx checkout.
- Configure a canonical HTTPS `APP_URL`/`BETTER_AUTH_URL`, a unique >=32-byte `BETTER_AUTH_SECRET`, the separate [Gmail API production transport](../scripts/google-workspace-mail/README.md), `BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION=true`, `NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED=true` and `NEXT_PUBLIC_TRANSACTIONAL_EMAIL_ENABLED=true` in Production only.
- Verify email verification, password reset, deletion confirmation, data export, retention/deletion behavior, and Neon cascades.
- Confirm privacy disclosures, terms, processor agreements, actual processing countries and retention for Neon, Vercel, Google Workspace and any activated OpenAI and Payrexx paths.
- Test registration, duplicate email, wrong password, session expiry, logout, email verification, password recovery, export, deletion and cross-account isolation.
- Test application create, list, status update, reload, delete and export using fabricated accounts.
- Review the guided letter against fabricated CV and job text. When OpenAI is enabled, confirm the configured model, data terms, CHF 10 monthly cost limit and failure behavior before use.
- Check phone and tablet layouts, keyboard navigation, validation, error messages and network failure.
- Keep Payrexx and Stripe disabled until isolated sandbox payment, signed webhook, entitlement, cancellation and refund flows pass.

## Current Preview configuration

- Vercel Preview URL is protected by Vercel Authentication.
- Better Auth uses a Preview-only secret and E-Mail/Passwort login.
- Neon Preview contains the Better Auth and application tables.
- Preview OpenAI acceptance requires its separately approved, capped test environment.
- Preview email delivery for registration, password reset and deletion confirmation passed through Google Workspace on 25 November 2026. The email and reply path passed. See the [Google Workspace test record](../scripts/google-workspace-mail/README.md).
- The Payrexx weekly Vorkasse simulation activated an isolated test entitlement through status reconciliation and triggered a verified email. The supported isolated path for the remaining instruments, renewal, failure, refunds and chargebacks is awaiting Payrexx support ticket 1030301.

Google Workspace is used for transactional email. Login is handled by Better Auth.

## Production gate

Do not point Production at the Preview database or credentials. Prepare Production credentials and database separately, apply reviewed migrations to that dedicated database, complete the acceptance checklist above, and keep Production unchanged until the release has been explicitly approved. `/api/health` returns `503` if required tables, canonical HTTPS auth URL, or production email configuration is missing. It does not verify provider contracts, mail deliverability, AI budget, payment behavior, legal compliance or backups.
