# Motivationsboost: international product and search masterplan

Date: 2026-10-27. Status: DEVELOPMENT BRANCH ONLY, not production-ready. Final name, domain and API keys deferred.

## Existing code and verified boundaries

- Next.js/Firebase application has CV extraction, fact-reviewed motivation-letter drafts, interview training, application tracker, job-search strategy, salary estimates, document uploads, ATS review, and PDF/DOCX export. These are implemented modules, not proof that live providers work.
- Earlier platform reliability branch repaired mock login, server sessions, document flows and private-data isolation. Existing Vercel preview reached READY but live Firebase server, AI and Drive permissions were not completely configured/verified.
- The evidence-first coach branch adds applicant confirmation and draft review before saving and exporting.
- Security issue #6 is a release blocker (2 critical + 2 high npm vulnerabilities at 2026-10-26); no production deploy/merge before compatible dependency and lockfile fixes and complete CI.
- A separate OpenAI draft PR #7 exists but does NOT belong in this phase. The user explicitly deferred API-key integration.

## Implemented on this internationalization branch

- Server-side AI language schema accepts bounded language tags instead of a four-item enum. All 15 text-generation flows resolve requested language labels using Intl; no silent German fallback.
- Applicant can select from 43 document languages and enter a validated custom code; the dashboard persists the applicant’s document-language choice.
- Browser locale is a first-run suggestion only. Independent interface translation remains incomplete, and must not be represented as finished.
- Eight localized, server-rendered marketing pages prepared: de, en, fr, it, es, pt, uk, ar. Arabic has RTL content.
- Page metadata, hreflang, sitemap, robots and WebApplication markup are gated: require PUBLIC_SITE_LAUNCHED=true and a verified HTTPS NEXT_PUBLIC_SITE_URL. Prelaunch robots disallows indexing, sitemap is empty, and JSON-LD is hidden.
- No final name/domain, revenue claims, fabricated reviews or pricing are published.

## Differentiators and research

Competitive suites such as Teal, Simplify, Jobscan, Rezi and Kickresume already combine resumes, ATS feedback, job tracking and interview tools. Generic letter-writing is not a durable advantage.
Source: https://www.jobscan.co/blog/ai-job-search-tools/

Build a candidate-controlled **evidence-first career companion**:

1. Evidence Vault: employment/education claims trace to a source document, location and applicant approval. Show unknowns, never invent.
2. Transferable Skills Graph and Career Pivot Explorer: explain promising new career paths and explicitly identify missing credentials/licensing requirements with country-specific sources.
3. Grounded Job Board: show each live vacancy’s original source, timestamp, source-backed employer and role, legal access basis and verification status. No fabricated job openings or employer claims.
4. Transparent Fit Review: requirement-by-requirement facts and gaps, without claiming actual ATS algorithms/employer probabilities or scoring protected characteristics.
5. Authentic Application Studio: country-specific CV format, sourced company context, concrete impact examples, human edits and explicit approval before any send/export.
6. Interview Lab: job-specific questions and feedback; optional audio only with consent and supported runtime, no emotion/personality inference.
7. Offer Comparison: pay, benefits, workload, employment conditions and location adjustments with source, date and explicit uncertainty.
8. Applicant Organizer: applications, deadlines, replies, interviews, follow-ups, user-controlled reminders, data portability.
9. Data Control Center: download/delete/export personal content, retention schedule, vendor disclosures, per-user usage and cancellation.
10. Accessible International Experience: translated navigation, help/errors, notifications, account onboarding and export for every publicly supported locale.

## International implementation

- Keep interface language, generated document language, input document language, country-specific CV norm, target country and currency separate.
- Test multiple scripts: Latin, Cyrillic, Arabic (RTL), Chinese/Japanese/Korean and Indic languages; do not promise accuracy for every language without evaluation.
- Start country-specific standards with CH, DE, AT, UK, FR, US and IN. Photo, DOB, addresses, references and protected data conventions vary; avoid universal advice.
- Screen-reader navigation, high contrast, touch targets and WCAG 2.2 AA before publication.
- Protect jobseeker data with privacy-by-design, a legally reviewed GDPR/FADP notice and deletion rights.
- EU AI Act high-risk provisions may apply if extending to employer candidate ranking/selection; keep the candidate tool separate unless assessed.
Sources:
https://www.w3.org/WAI/standards-guidelines/wcag/
https://ai-act-service-desk.ec.europa.eu/en/employment-0

## SEO and AI discovery

- Crawlable public pages in each actually supported language, proper server rendering, truthful original content, clean internal links and language alternates.
- Search engines should never index account pages, CVs, saved job applications, API endpoints, draft content or private user data.
- Use structured WebApplication data only with visible true name/features and a genuine offer; no made-up ratings or testimonials. JobPosting markup only for genuine first-party vacancy pages, never for aggregated or AI-suggested jobs.
- Google’s official guidance says special AI text files (including llms.txt) do NOT boost generative-search visibility; SEO fundamentals and useful original information come first.
- After name and domain: configure canonical metadata, reciprocal hreflang, sitemap, Search Console, crawl checks, task-completion metrics and reproducible multi-model GEO benchmarks.
Sources:
https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites
https://developers.google.com/search/docs/appearance/structured-data/software-app

## Hard release gates

P0: Resolve security issue #6 with lockfile updates and strict audit. Run CI including typecheck, unit, privacy rules, Playwright mobile E2E, quality checks and production build.
P0: Verify live account auth/session, Firestore rules/ownership and Google Drive permission/ownership using test accounts and fabricated document samples.
P0: Add real applicant data deletion/export, sensitive document handling and provider-processing transparency.
P1: Translate whole authenticated app (not just generated documents), check native language copy and RTL.
P1: Verify document extraction and PDF/DOCX export with native scripts; human review before any outgoing application.
P2: Implement evidence graphs, verifiable vacancies, pivot explanations, country standards and genuinely sourced salary/offer comparisons.
P2: Introduce transparent opt-in subscriptions with country-specific price, fair limits and cancellation.
P3: Final brand and domain clearance; afterwards provider API-key connection, real budget-limited API validation and financial tests.
P3: Only when checks pass, decide and explicitly authorize production publication.

No production release, secret use, applicant-data migration, purchase or billable AI calls are intended by this branch.

## Automated verification on 27 October 2026

CI run: https://github.com/Thom-Code-Cell/Motivationsboost/actions/runs/40469787075

- Passed: clean npm install, strict TypeScript, Vitest unit tests (including locale tests), letter-quality tests, Firebase emulator rules, Playwright browser E2E, Next.js production build.
- **FAILED REQUIRED RELEASE SECURITY GATE:** production npm audit reported 4 vulnerabilities (2 critical, 2 high). A deliberate continue-on-error permits E2E and build to execute, but the final workflow step fails the overall run if the audit fails. This is not a security pass.
- Specific blocking packages: Next 15.5.27, DOMPurify <=3.4.16, undici <=7.30.0, zod v3 below 4.6.6. Avoid blind force upgrades of Zod because Genkit and React form schema integrations require compatibility review. Update lockfile and re-run all checks.
- Tests use mocks and emulators; they **do not** prove live Firebase login, Google Drive consent, a real model invocation, translation quality in 43 languages, or successful PDF export in every script.
- No live Vercel deployment, production merge, payment, AI credential installation or third-party notification was performed.
