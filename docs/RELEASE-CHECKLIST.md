# Motivationsboost release checklist

The current Preview app is designed to run without Google or Firebase. Production remains separate and must not be enabled solely because Preview builds successfully.

## Before accepting real user data

- Add email verification and password-reset delivery for Better Auth.
- Add account deletion, export, data retention and support contact flows; verify Neon rows cascade on deletion.
- Publish accurate privacy, terms and processor information for Neon and, if enabled, OpenAI.
- Test registration, duplicate email, wrong password, session expiry, logout, password recovery and cross-account isolation.
- Test application create, list, status update, reload, delete and export using fabricated accounts.
- Review the guided letter against fabricated CV and job text. When OpenAI is enabled, confirm the configured model, data terms, CHF 10 monthly cost limit and failure behavior before use.
- Check phone and tablet layouts, keyboard navigation, validation, error messages and network failure.
- Keep Payrexx and Stripe disabled until isolated sandbox payment, signed webhook, entitlement, cancellation and refund flows pass.

## Current Preview configuration

- Vercel Preview URL is protected by Vercel Authentication.
- Better Auth uses a Preview-only secret and E-Mail/Passwort login.
- Neon Preview contains the Better Auth and application tables.
- OpenAI is not configured; the template generator is used, with no provider cost.
- Payrexx checkout remains disabled.

Firebase and Google OAuth, Google Drive, Google Fonts and Google APIs are not part of the current Preview app. Unused Firebase environment entries may remain in Vercel settings; the app does not read them.

## Production gate

Do not point Production at the Preview database or credentials. Prepare Production credentials and database separately, apply reviewed migrations to that dedicated database, complete the acceptance checklist above, and keep Production unchanged until the release has been explicitly approved.
