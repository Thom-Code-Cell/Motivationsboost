# Release handover · Motivationsboost · 27 October 2026

## Branding and operator
- Internal name remains Motivationsboost until trademark and domain clearance.
- Public legal support email is `thomas@th-analytica.com`.
- Development relationship with https://th-analytica.com is disclosed without asserting a separate legal entity.
- Reciprocal link lives on TH Analytica /referenzen under 'Eigene Entwicklung · geschützte Beta' and the shared site footer.
- A restricted Vercel preview is **not** an indexed public consumer product.

## Billing decision: Payrexx ONLY
- Old Stripe endpoints return HTTP 503 and never charge anyone, independently of historic Stripe secrets.
- Payrexx Gateway API scaffold, monthly/yearly plan display and signed webhook receiver exist. Direct API signing uses server-only X-API-KEY. Hosted Payrexx payment pages keep credit card data off our site.
- Payrexx is **OFF by default**. Both `PAYREXX_PAYMENTS_ENABLED` and `PAYREXX_BILLING_VALIDATED` must be true *after* approved payment tests and fulfillment logic. No environment secrets in Git. No prices invented.
- **Critical incomplete part:** signed webhook receipts are stored idempotently, but user premium entitlements are deliberately **not** automatically granted. It would be unsafe to charge users now. Validate current gateway and subscription payload shapes using real Payrexx test events, map order reference to owner safely, reconcile success/failure/refunds/retries, implement transparent self-service cancellation, and verify tax/legal disclosures before enabling payment.
- Official docs: https://developers.payrexx.com/reference/create-a-gateway and https://docs.payrexx.com/developer/guides/webhook

## Legal & privacy
- Mobile-optimized imprint, privacy and terms use identical reusable content in public pages and mandatory consent dialogs; update date and consent versions aligned.
- Statements about Stripe charging, CHF 39, configured Gemini, zero cookies and 'only technical metadata in Firestore' were removed because they were misleading or premature.
- Professional legal review remains required before international launch, especially GDPR/FADP, account deletion, data processors and retention schedules.

## Technical gates
- Code uses Next.js/Firebase; secure App Router pages and eight localized marketing routes are behind noindex until final brand/domain release.
- Need real Firebase OAuth, Google Drive, data deletion, PDF/DOCX multi-script, billing and AI-provider acceptance tests, not just mocks/emulators.
- Do not transfer applicant documents or billing credentials during beta.
- Clear all GitHub CI steps including npm security audit, desktop/mobile browser tests, and live preview smoke tests before any production merge.
- Secure the final public domain and activate indexability only after legal, privacy, availability and customer support acceptance.

This branch does not purchase domains, publish production, configure keys or activate payments.
