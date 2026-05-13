# ClarityDoc — Devpost Submission Draft

## Project name

ClarityDoc

## Tagline

Plain-English contract analysis before you sign.

## Short description

ClarityDoc helps founders, freelancers, clinics, and small teams understand business documents fast. Paste or upload a contract and it returns the summary, risky clauses, obligations, deadlines, and concrete negotiation actions in a clean report.

## Live demo

https://claritydoc-samfresh.netlify.app/dashboard

## GitHub

https://github.com/Samfresh-ai/claritydoc

## Demo path for judges

1. Open the live dashboard link.
2. Paste a short agreement or use this sample:
   > SERVICE AGREEMENT. Client pays Vendor $2,000 within 15 days of invoice. Vendor must deliver a prototype by June 30, 2026. Either party may terminate with 5 days notice. Liability is unlimited.
3. Click **Analyze**.
4. Review the verdict, top risks, obligations, deadlines, and before-signing actions.

## What it does

- Accepts pasted text and `.txt`, `.pdf`, or `.docx` uploads.
- Extracts document text server-side.
- Sends the text to a server-side AI provider; keys never touch the browser.
- Validates the AI response against a strict Zod schema before showing it.
- Produces a report with verdict, summary, risks, obligations, deadlines, actions, missing terms, and metadata.
- Stores only document hash, preview, metadata, and structured analysis by default.
- Lets users opt in before storing full document text.

## Why it matters

Small teams sign contracts constantly, but they usually do not have counsel on standby. ClarityDoc gives them a fast first pass: what the document says, what could hurt, and what to ask before signing. It is not legal advice — it is a practical triage layer before the expensive review.

## Built with

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL-ready persistence
- Gemini AI provider live on the demo deploy
- NVIDIA AI provider support
- Zod response validation
- PDF/DOCX extraction
- Vitest + Playwright
- Netlify deploy

## What I’m proud of

- The report is actually useful: verdict, risks, obligations, and next actions are visible without digging.
- The privacy posture is clear. Full document text is not stored unless the user chooses it.
- The AI layer is not raw prompt output. It is schema-validated before the UI trusts it.
- The app has real backend routes, extraction, persistence boundaries, tests, CI, and deploy config.

## Challenges

- Keeping the UI dense enough for real contracts without turning it into a wall of cards.
- Making the AI output structured, bounded, and safe enough to render reliably.
- Supporting a judging demo without requiring a production PostgreSQL setup. The deployed demo uses explicit ephemeral storage mode; production mode is ready for PostgreSQL.

## What’s next

- Add real user auth instead of the current local/demo dashboard gate.
- Add production PostgreSQL for durable analysis history.
- Add organization workspaces and team review flows.
- Add clause-by-clause comparisons against preferred contract language.
- Add exportable PDF reports and share links.

## Important caveat for judges

The live Netlify demo is configured for judging speed with `EPHEMERAL_STORAGE=true`. It uses real Gemini analysis, but analysis history is held in process memory and can reset on redeploy/restart. Production deployment should use PostgreSQL with `EPHEMERAL_STORAGE=false`.

## Screenshots

- `docs/devpost-assets/claritydoc-live-home.png`
- `docs/devpost-assets/claritydoc-live-dashboard.png`
- `docs/devpost-assets/claritydoc-live-analysis.png`
