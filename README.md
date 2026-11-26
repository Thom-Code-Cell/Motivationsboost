# Motivationsboost

Motivationsboost is a Google-free application for drafting motivation letters and tracking applications. The primary route `/` provides the same app as `/beta`.

## Local internal simulator

The internal simulator runs only on loopback, uses a fake test account, stores applications in the current browser and generates a clearly labelled sample draft. It makes no Google, Firebase, database, payment or AI-provider calls. Use fabricated data only.

```sh
npm ci
npm run dev:internal
```

Open `http://127.0.0.1:3000/`. See [`docs/INTERNAL-TEST-GUIDE.md`](docs/INTERNAL-TEST-GUIDE.md).

## Connected application

The connected app uses Neon/PostgreSQL and Better Auth with email/password accounts. It supports application tracking and editable/downloadable motivation letter drafts. When `OPENAI_API_KEY` is configured it can request a letter from OpenAI; when absent it creates a clearly labelled guided template instead. Payrexx stays disabled until sandbox acceptance.

Configure `DATABASE_URL`, a unique `BETTER_AUTH_SECRET` (at least 32 random bytes), and the canonical production `APP_URL` or `BETTER_AUTH_URL`. Production also requires `RESEND_API_KEY`, a verified `EMAIL_FROM` sender, `BETTER_AUTH_REQUIRE_EMAIL_VERIFICATION=true`, `NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED=true`, and `NEXT_PUBLIC_TRANSACTIONAL_EMAIL_ENABLED=true`. Never reuse Preview credentials or its Neon branch in Production. Apply migrations to the dedicated Motivationsboost database in this order:

1. `migrations/000_better_auth.sql`
2. `migrations/001_app_data.sql`
3. `migrations/002_payrexx_webhook_events.sql` only if webhook storage is needed
4. `migrations/004_payrexx_orders.sql` only if preparing the disabled checkout
5. `migrations/005_better_auth_rate_limit.sql`

The account flow supports email verification, password reset, deletion confirmation, and database-backed auth throttling. Production remains blocked until the separate production database and all required credentials are provisioned and the email sender is verified. The health endpoint checks required tables, canonical HTTPS auth origin, and production email configuration without disclosing credentials.

## Scope

The Google/Firebase dashboard has been removed from the primary app route. The active application does not require Google sign-in, Google Drive, Google Fonts or Firebase. The previous rich dashboard modules remain in the repository as inactive legacy code and are not reachable from the primary route.

See `docs/RELEASE-CHECKLIST.md` before any public launch. A successful build does not establish live database, email, AI-provider, privacy or payment acceptance. Production was not deployed or modified as part of this preparation.

### Motivationsboost acceptance and operations

For the isolated weekly sandbox checkout apply the migrations through 011 in order. Migration 011 queues a single test notice per paid or refunded order. Delivery is confined to Vercel Preview and requires a verified Resend sender plus an explicitly configured operator test address in PAYREXX_SANDBOX_NOTICE_RECIPIENT. Use EMAIL_REPLY_TO for an address the operator receives. The queue records acceptance by the mail provider. Confirm final inbox delivery independently.

The protected synthetic AI acceptance requires the existing synthetic account ID and a time-limited MOTIVATIONS_ACCEPTANCE_APPROVED_UNTIL scoped to the preview branch. It reads the existing CHF-10 ledger. It cannot be enabled on Production. The optional OPENAI_LETTER_MODEL override still requires an approved model and the application spend gate.

Run node scripts/probe-operations.mjs to check the current deployment-protection state. Run scripts/operations-status.sql read-only on the isolated Preview database for the aggregate report. These checks do not send test messages, place orders or call an inference API.