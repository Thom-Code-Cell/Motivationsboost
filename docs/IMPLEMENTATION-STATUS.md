# Motivationsboost implementation status

Updated 18 November 2026 on branch `codex/internal-test-readiness-20261118`.

## Release decision

**Production release is not approved yet.** This change prepares the application and release controls; it does not deploy to or modify Production. The Preview and Production databases and credentials must remain separate.

## Release candidate changes · 25 November 2026

Application records, documents and the draft use account-scoped IndexedDB. Records from the previous local format are migrated when read. The old application API is read-only. Its owner-scoped import is issued only when requested, validates the records and preserves local edits if an ID already exists. The server originals remain available in the account export. The browser offers an optional encrypted workspace backup and transaction-based restore or deletion of the browser records. Moving to a different browser requires a transfer of the backup. Browser storage uses the device's normal browser protections.

The paid letter path is off by default. It requires an explicit environment flag, a time-limited price approval, the approved model, a working database and the new spend-reservation migration. The database holds a shared cumulative internal envelope of CHF 10, including uncertain attempts. The letter route reserves before sending, refuses duplicates, and reconciles validated standard-rate provider usage. Unknown outcomes keep their reservation pending reconciliation. Admin approval and actual provider/price verification remain separate.

| Data | Path and retention | Release evidence or open point |
| --- | --- | --- |
| New application records | Browser storage under the account ID. Retained until local deletion or browser data removal. JSON backup stays wherever the user saves it. | Synthetic Chromium test covers persistence, rejection of central writes, owner-scoped import and repeat import. |
| Older applications and applicant profiles | Existing Neon tables. Applications are accessible to their owner through export and optional import. The profile is included in account export. | No backfill or purge. Confirm historical retention, legacy provider copies and cutover before release. |
| Cover letter input and output | Browser draft and local download. The guided fallback runs in the browser. A specifically selected external request sends redacted fields through Vercel. | No durable write in the letter route. Confirm production provider settings and log retention. |
| Identity and billing | Better Auth and server-side Neon. Resend for configured transactional email and Payrexx for configured payment flows. | Preview and production isolation, retention and provider contracts still require target-environment evidence. |
| Older Firebase and Drive paths | Legacy code lives outside the active account flow. | Independently inventory older deploys and any historical cloud documents before removing dependencies or retiring data. |

## Preview snapshot of 18 November

- The primary route `/` and `/beta` use the same application flow.
- Account registration and login use Better Auth email/password with Neon PostgreSQL. No Google or Firebase account is needed.
- Application records persist in Neon and are scoped to the signed-in user.
- A motivation letter can be generated from the submitted details, edited and downloaded. Without an OpenAI key, the app returns a clearly labelled guided template. OpenAI is not configured in Preview, so the generator makes no AI-provider calls and incurs no AI cost.
- Preview database tables for Better Auth, applicant profiles, applications and AI quotas exist on the Neon branch `preview/codex/internal-test-readiness-20261118`.
- Preview uses a separate Better Auth secret and a branch-scoped PostgreSQL connection. The deployment is protected by Vercel Authentication.
- Payrexx remains disabled. No live charges are enabled.
- Added email-verification, password-reset, deletion-confirmation email flows and a data export endpoint. Production requires a verified Resend sender; health reports degraded until email and the required schema are present.
- Better Auth rate limits now use PostgreSQL in production and require migration `005_better_auth_rate_limit.sql`.
- The privacy and terms pages now describe the actual reduced application, Neon storage and optional OpenAI processing. They still require an operator/legal review of production provider contracts, locations and retention before launch.

## Verification performed

- Earlier Preview checks passed for health, email/password signup and login, and rejection of unauthenticated application data requests. Test accounts were deleted after the smoke check.
- Release-preparation checks passed: `npm run typecheck`, `npm test` (122 tests), `npm run test:quality` (5 tests), and `npm run build`.
- The full `npm audit` reports 21 findings (14 moderate, 7 high). They are in the Firebase CLI/Google Cloud development tooling and the Vite/Vitest test/build toolchain; `npm audit --omit=dev` still reports 5 high findings in the latter dependency tree. The Next.js production file traces contain no Firebase, Firebase Admin or Google Cloud packages, and the active app routes do not import Vite/Vitest. Resolve the findings or record a formal, scoped risk acceptance before final production approval.
- The deployed Preview `/api/health` returned HTTP 200 with PostgreSQL and email/password auth configured. The Better Auth session endpoint returned HTTP 200 with no active session.
- The root page returned HTTP 200. Synthetic account registration and password login both succeeded through the deployed Preview API; the temporary test accounts were deleted. The unauthenticated application endpoint returned HTTP 401. Application create/update/delete, mobile layout and letter review have not yet been exercised through an interactive signed-in session.

## Remaining before public launch

- Create a separate Production Neon database/branch, apply and verify all required migrations there, and add Production-only environment secrets: `DATABASE_URL`, `BETTER_AUTH_SECRET` (unique, >=32 bytes), `APP_URL`/`BETTER_AUTH_URL` (canonical HTTPS origin), `RESEND_API_KEY`, `EMAIL_FROM`, `BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION=true`, `NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED=true`, and `NEXT_PUBLIC_TRANSACTIONAL_EMAIL_ENABLED=true`.
- Confirm the production email sender/domain is verified, then run signup, verification, login/logout, reset, deletion confirmation, export, cross-account isolation and CRUD acceptance checks with synthetic accounts.
- Confirm legal disclosures, processor agreements, locations and retention schedules for Vercel, Neon, Resend and (if enabled) OpenAI. Production data region is not set by this code and must be explicitly confirmed.
- Configure an AI provider only after confirming account access, provider data terms and the CHF 10 monthly ceiling. The application quota is a request count, not a billing cap; set a matching provider-side budget before enabling calls. Until then the guided template is the working fallback.
- Keep payment checkout disabled until Payrexx sandbox transactions, signed events, cancellations and refunds are verified.
- Keep Production unchanged until these checks pass and a release is explicitly approved.

## Legacy code

The former Firebase/Google dashboard and its services remain as inactive legacy source files. They are not imported by `/` or `/beta`; the new Preview app does not need Firebase, Google OAuth, Drive or Google Fonts. The old dashboard should be removed or migrated before it is exposed as a product route again.

## Production setup check · 18 November 2026

- Vercel has only the protected project `motivationsboost-preview`; project metadata reports `live: false`, SSO protection enabled, and no custom production domain.
- The Vercel integration returned HTTP 403 for environment-variable and Marketplace configuration reads. The mapped Vercel CLI fallback is unavailable in this environment. No Production environment variable was created or read.
- Neon lists only `motivationsboost-preview-db` in a Vercel-managed organization. Direct creation of a second Neon project was rejected by the organization policy. The default branch contains only `payrexx_webhook_events`; the app tables are in the separate Preview branch. Do not connect the default branch to the app as Production until the Vercel integration and target environment are verified.
- Consequently no distinct Production database/credential set, verified Resend sender, OpenAI project hard-spend cap, Payrexx sandbox transaction or legal sign-off is claimed. Details and source-backed release gates are in `docs/RELEASE-CHECKLIST.md` and `docs/PRODUCTION-HANDOVER-PAYREXX.md`.
