# Motivationsboost release checklist

The current Preview app is designed to run without Google or Firebase. Production remains separate and must not be enabled solely because Preview builds successfully. This checklist is a release gate, not a claim that a production deployment has happened.

## Before accepting real user data

- Create and isolate a Production Neon database. Apply migrations `000`, `001`, `005`; add `002` only for webhook event storage and `004` only while preparing disabled Payrexx checkout.
- Configure a canonical HTTPS `APP_URL`/`BETTER_AUTH_URL`, a unique >=32-byte `BETTER_AUTH_SECRET`, verified Resend credentials (`RESEND_API_KEY`, `EMAIL_FROM`), `BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION=true`, `NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED=true` and `NEXT_PUBLIC_TRANSACTIONAL_EMAIL_ENABLED=true` in Production only.
- Verify email verification, password reset, deletion confirmation, data export, retention/deletion behavior, and Neon cascades.
- Confirm accurate privacy, terms, processor agreements, actual data regions and retention for Neon, Vercel, Resend and (if enabled) OpenAI.
- Test registration, duplicate email, wrong password, session expiry, logout, email verification, password recovery, export, deletion and cross-account isolation.
- Test application create, list, status update, reload, delete and export using fabricated accounts.
- Review the guided letter against fabricated CV and job text. When OpenAI is enabled, confirm the configured model, data terms, CHF 10 monthly cost limit and failure behavior before use.
- Check phone and tablet layouts, keyboard navigation, validation, error messages and network failure.
- Keep Payrexx and Stripe disabled until isolated sandbox payment, signed webhook, entitlement, cancellation and refund flows pass.

## Current Preview configuration

- Vercel Preview URL is protected by Vercel Authentication.
- Better Auth uses a Preview-only secret and E-Mail/Passwort login.
- Neon Preview contains the Better Auth and application tables.
- OpenAI is not configured; the template generator is used, with no provider cost.
- Preview mail delivery is not configured; verification and password-reset email flows can only be accepted after a verified test sender is configured. Preview account deletion instead requires password confirmation and deletes immediately.
- Payrexx checkout remains disabled.

Firebase and Google OAuth, Google Drive, Google Fonts and Google APIs are not part of the current Preview app. Firebase and Google Preview environment entries have been removed from Vercel as well.

## Production gate

Do not point Production at the Preview database or credentials. Prepare Production credentials and database separately, apply reviewed migrations to that dedicated database, complete the acceptance checklist above, and keep Production unchanged until the release has been explicitly approved. `/api/health` returns `503` if required tables, canonical HTTPS auth URL, or production email configuration is missing. It does not verify provider contracts, mail deliverability, AI budget, payment behavior, legal compliance or backups.
