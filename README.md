# Motivationsboost

Next.js application for creating and managing application documents. The current beta path is `/beta`; most of the wider legacy dashboard still needs separately configured Google/Firebase, Drive, provider and production acceptance.

## Local internal test

Use Node.js 22 or 24. This path needs no `.env.local`, OAuth client, database, Payrexx account, or API key. It only runs on loopback and uses a deterministic local letter response. Enter fabricated applicant and job data.

```sh
npm ci
npm run dev:internal
```

Open `http://127.0.0.1:3000/beta`. See [`docs/INTERNAL-TEST-GUIDE.md`](docs/INTERNAL-TEST-GUIDE.md) for scope and limits.

## Connected development services

The normal `npm run dev` and deployment paths do not enable the local test mode. The wider dashboard still needs its relevant Google/Firebase, Drive, PostgreSQL/Better Auth and AI credentials configured for the specific environment. Use `.env.example` as a variable-name guide only; never commit credentials or use real applicant data in the local simulator.

## Checks

```sh
npm run typecheck
npm test
npm run test:rules
npx playwright install chromium
npm run test:e2e
npm run build
npm audit --omit=dev
```

The rules and browser tests use the demo project `demo-motivationsboost`, isolated Firebase emulators, and fabricated users. Java 21+ is required for Firebase CLI 15. CI provisions Temurin 21 explicitly. AI and Drive unit tests use controlled provider responses. Passing those tests does not verify real Google OAuth, Google Drive permissions, OpenAI model access or deployed Firebase rules.

## Release

Read `docs/RELEASE-CHECKLIST.md` and `docs/IMPLEMENTATION-STATUS.md`. The simulator can run locally or on one SSO-protected Vercel preview branch; it is not a production release. Stripe checkout/portal/webhook endpoints are permanently disabled (HTTP 503). Payrexx API credentials, signed webhook handling and entitlement fulfilment require isolated sandbox acceptance. Keep both `PAYREXX_PAYMENTS_ENABLED` and `PAYREXX_BILLING_VALIDATED` false until end-to-end tests pass. Never use real payment credentials or customer charges for internal testing.
