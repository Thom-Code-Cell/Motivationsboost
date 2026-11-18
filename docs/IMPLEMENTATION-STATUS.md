# Motivationsboost implementation status

Updated 18 November 2026 on branch `codex/internal-test-readiness-20261118`.

## Current Preview app

- The primary route `/` and `/beta` use the same application flow.
- Account registration and login use Better Auth email/password with Neon PostgreSQL. No Google or Firebase account is needed.
- Application records persist in Neon and are scoped to the signed-in user.
- A motivation letter can be generated from the submitted details, edited and downloaded. Without an OpenAI key, the app returns a clearly labelled guided template. OpenAI is not configured in Preview, so the generator makes no AI-provider calls and incurs no AI cost.
- Preview database tables for Better Auth, applicant profiles, applications and AI quotas exist on the Neon branch `preview/codex/internal-test-readiness-20261118`.
- Preview uses a separate Better Auth secret and a branch-scoped PostgreSQL connection. The deployment is protected by Vercel Authentication.
- Payrexx remains disabled. No live charges are enabled.

## Verification performed

- `npm run typecheck` passed.
- `npm run build` passed locally before the final health-check adjustment; a subsequent Vercel Preview build reached READY for commit `4cb0dfd317bf3f733e0e156b42d34d458bc5cfc4`.
- The deployed Preview `/api/health` returned HTTP 200 with PostgreSQL and email/password auth configured. The Better Auth session endpoint returned HTTP 200 with no active session.
- The root page returned HTTP 200. Synthetic account registration and password login both succeeded through the deployed Preview API; the temporary test accounts were deleted. The unauthenticated application endpoint returned HTTP 401. Application create/update/delete, mobile layout and letter review have not yet been exercised through an interactive signed-in session.

## Remaining before public launch

- Add email verification and password reset delivery. Until then, users who lose their password cannot recover it by email.
- Exercise signup, login/logout, user-isolated application CRUD and guided letter flow with synthetic accounts on Preview.
- Complete privacy disclosures and retention/deletion controls before entering personal CV or job-application data.
- Configure an AI provider only after confirming account access, data terms and the CHF 10 monthly ceiling. Until then the guided template is the working fallback.
- Keep payment checkout disabled until Payrexx sandbox transactions, signed events, cancellations and refunds are verified.
- Keep Production unchanged until these checks pass and a release is explicitly approved.

## Legacy code

The former Firebase/Google dashboard and its services remain as inactive legacy source files. They are not imported by `/` or `/beta`; the new Preview app does not need Firebase, Google OAuth, Drive or Google Fonts. The old dashboard should be removed or migrated before it is exposed as a product route again.
