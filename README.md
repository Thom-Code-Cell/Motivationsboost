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

Configure `DATABASE_URL`, a unique `BETTER_AUTH_SECRET` (at least 32 random bytes), `BETTER_AUTH_URL`, and optionally `OPENAI_API_KEY`. The production URL must match the deployed HTTPS origin. Apply migrations to the dedicated Motivationsboost database in this order:

1. `migrations/000_better_auth.sql`
2. `migrations/001_app_data.sql`
3. `migrations/002_payrexx_webhook_events.sql` only if webhook storage is needed
4. `migrations/004_payrexx_orders.sql` only if preparing the disabled checkout

Email verification and password-reset email delivery are not configured yet. Do not use this account system for sensitive production data until an email provider, verification and recovery flow are added.

## Scope

The Google/Firebase dashboard has been removed from the primary app route. The active application does not require Google sign-in, Google Drive, Google Fonts or Firebase. The previous rich dashboard modules remain in the repository as inactive legacy code and are not reachable from the primary route.

See `docs/RELEASE-CHECKLIST.md` before any public launch. A successful build does not establish live database, email, AI-provider, privacy or payment acceptance.
