# ClarityDoc — Devpost Submission Copy

## Project name

ClarityDoc

## Tagline

Plain-English contract analysis before you sign.

## Short description

ClarityDoc helps small teams understand contracts before they sign. Paste or upload a document and it returns the summary, risky terms, obligations, deadlines, missing pieces, and concrete negotiation actions in a clean report.

## Live demo

https://claritydoc-samfresh.netlify.app/dashboard

## GitHub

https://github.com/Samfresh-ai/claritydoc

## Demo path for judges

1. Open the live dashboard link.
2. Paste a short agreement, or use this sample:

   > SERVICE AGREEMENT. Client pays Vendor $2,000 within 15 days of invoice. Vendor must deliver a prototype by June 30, 2026. Either party may terminate with 5 days notice. Liability is unlimited.

3. Click **Analyze**.
4. Review the verdict, top risks, obligations, deadlines, and before-signing actions.

## What it does

ClarityDoc gives founders, freelancers, clinics, agencies, and small teams a practical first read on business documents.

The app accepts pasted text and `.txt`, `.pdf`, or `.docx` uploads. It extracts document text server-side, sends it to a server-side AI provider, validates the model response against a strict Zod schema, then renders a focused report with verdict, summary, risks, obligations, deadlines, missing terms, and next actions.

The privacy boundary is deliberate: provider keys never reach the browser, full document text is not stored by default, and users must opt in before saving the full text.

## Why I built it

Small teams sign contracts all the time, usually under pressure. The dangerous parts are not always dramatic. They are often ordinary clauses: unlimited liability, unclear deadlines, vague termination rights, missing payment terms, broad indemnity, or renewal language nobody noticed.

ClarityDoc is a fast triage layer before a formal legal review. It helps users slow down, understand what they are looking at, and bring sharper questions to counsel or the other party.

It is informational analysis, not legal advice.

## Built with

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL-ready persistence
- Gemini AI provider on the live demo deploy
- NVIDIA AI provider support
- Zod response validation
- PDF/DOCX extraction
- Vitest + Playwright
- GitHub Actions CI
- Netlify deploy

## What I’m proud of

- The report is useful without digging: verdict, risks, obligations, deadlines, and next actions are all visible.
- The AI layer is bounded. The UI only trusts schema-validated output.
- The privacy posture is clear. Full document text is not stored unless the user chooses it.
- The app has real backend routes, extraction, persistence boundaries, tests, CI, and deploy config.

## Challenges

- Keeping the report dense enough for real contracts without turning the interface into a wall of cards.
- Making model output structured enough to render safely and consistently.
- Supporting a live judging demo without forcing judges through database setup. The deployed demo uses explicit ephemeral storage mode; production mode is ready for PostgreSQL.

## What’s next

- Add real user auth instead of the current local/demo dashboard gate.
- Add production PostgreSQL for durable analysis history.
- Add team workspaces and review queues.
- Add clause-by-clause comparison against preferred contract language.
- Add exportable PDF reports and share links.

## Important caveat for judges

The live Netlify demo is configured for judging speed with `EPHEMERAL_STORAGE=true`. It uses real Gemini analysis, but analysis history is held in process memory and can reset on redeploy/restart. Production deployment should use PostgreSQL with `EPHEMERAL_STORAGE=false`.

## Screenshots

- `docs/devpost-assets/claritydoc-live-home.png`
- `docs/devpost-assets/claritydoc-live-dashboard.png`
- `docs/devpost-assets/claritydoc-live-analysis.png`
