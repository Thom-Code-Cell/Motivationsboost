# Motivationsboost

Next.js application for creating and managing application documents with Google login, Firebase, a private Google Drive folder and GPT through the OpenAI Responses API.

## Local development

Use Node.js 22 or 24. Copy `.env.example` to `.env.local` and configure the app's own Firebase project and server credentials. Enable Google sign-in in Firebase and add the development/deployment host to authorized domains. Never commit credentials.

```sh
npm ci
npm run dev
```

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

The rules and browser tests use the demo project `demo-motivationsboost`, isolated Firebase emulators, and fabricated users. Java 21+ is required for Firebase CLI 15. CI provisions Temurin 21 explicitly. AI and Drive unit tests use controlled OpenAI-compatible mock responses. Passing those tests does not verify real Google OAuth, Google Drive permissions, Gemini availability or deployed Firebase rules.

## Release

Read `docs/RELEASE-CHECKLIST.md` and `docs/IMPLEMENTATION-STATUS.md`. Only preview deployment is authorized. Main is unchanged. Stripe is disabled by default; Payrexx migration follows technical acceptance. Do not enable the old Stripe routes.
