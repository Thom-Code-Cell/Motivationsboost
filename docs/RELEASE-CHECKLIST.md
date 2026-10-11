# Motivationsboost release preparation

## Required live configuration

Configure these directly in the preview project's environment settings. Do not send private keys through chat or commit them.

1. Use the intended Firebase project. Register a web app and set its public config variables from `.env.example`. Enable Google authentication. Add the actual preview hostname to Firebase Authentication's authorized domains.
2. Configure server-only Firebase Admin credentials for that same project, or its workload identity/ADC. Confirm token verification, Firestore access and account isolation. Set admin identities only via `ALLOWED_ADMIN_UIDS` or trusted Firebase custom claims.
3. Deploy `firestore.rules` and `firestore.indexes.json` to that exact project after identifying it. Changes have only been tested against the local demo project; no live rules were changed.
4. Enable Google Drive API and Google Picker API in the associated Cloud project. Set a browser-restricted public Picker API key and project number. The OAuth flow requests only `drive.file`; existing documents must be selected explicitly via Picker before import.
5. Configure a server-only `GOOGLE_API_KEY` with the intended billing/quota and data processing terms. Verify the configured text, image and speech models with fabricated documents before using personal data.
6. Keep `STRIPE_PAYMENTS_ENABLED=false`. Payments and Payrexx are outside this release stage. No existing entitlement was granted, no payment was made, and PR #1 was not merged.

## Live acceptance with a test Google account

- Google login, rejection/cancellation and logout; reload must preserve the account session. Logout must clear the server cookie. After a reload, reconnect Drive explicitly; OAuth access tokens are kept only in memory.
- Read and accept both consent dialogs on a phone. Refresh and confirm consent remains saved.
- Upload a PDF, DOCX, TXT and photograph. Import an existing Drive document through Picker. Verify copies are listed in the app folder and originals are unchanged. Reject an unsupported file and a file over 8 MB.
- Create a CV from an employment certificate. Check that missing contact details remain empty and facts are not invented. Reload, reconnect Drive and verify saved CV is restored.
- Generate a motivation letter from a real accessible advert, then from pasted advert text. Review, edit and save the letter. Check generated keywords match the actual advert.
- Run ATS analysis and refinement. Review changes, explicitly save the reviewed documents, then verify that export and subsequent AI actions use the revised texts. The ATS percentage is a model estimate, not a guaranteed employer score.
- Generate interview questions and analyze a written answer. Test optional speech recognition and audio playback on the intended physical Android device; lack of browser speech support must leave typing available.
- Test LinkedIn summary, writing-style analysis, email templates, CV gap review, salary estimate, job search suggestions, photo creation and required-document checks. Salary/company suggestions are estimates, not live verified offers.
- Create an application, update status, reload and delete it. A different account must be unable to access it or modify privileges.
- Export a multi-page PDF and a Word document from a legitimately provisioned Pro test account. Check page breaks, accents and complete content. Free accounts must not produce a fake successful empty Word ZIP.
- Check 360px, 390px and tablet layouts, all navigation items, error states, network loss and expired Drive authorization.

## Release gate

Production remains blocked until the live configuration, Google authorization and provider tests above are verified and documented for the release commit. After those pass, obtain Thomas's final publication approval. Do not merge or deploy production merely because the preview build is READY.
