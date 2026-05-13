# ClarityDoc

ClarityDoc is a contract and document intelligence app for SMBs, startups, freelancers, and clinics. It reads business documents and returns a plain-English report covering what the document says, where the risk is, what deadlines matter, and what to negotiate before signing.

It is built as a production-ready MVP, not a static demo.

## What It Does

- Paste contract text or upload `.txt`, `.pdf`, or `.docx` files.
- Extract document text server-side.
- Analyze contracts through server-side AI providers.
- Return structured results validated with Zod.
- Show a clean report with verdict, summary, risks, obligations, deadlines, actions, and document metadata.
- Store only document hash, preview, metadata, and analysis result by default.
- Keep full document text out of storage unless the user explicitly opts in.

ClarityDoc provides informational contract analysis only. It is not legal advice, does not create attorney-client privilege, and does not replace a qualified attorney.

## Tech Stack

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL
- Zod
- NVIDIA AI API as primary provider
- Gemini as server-side fallback provider
- PDF and DOCX text extraction
- Vitest
- Playwright
- Docker Compose

## Quick Start

```bash
cd /home/samfresh22/claritydoc
npm install
cp .env.example .env
docker compose up -d
npm run db:push
npm run dev
```

Open:

```text
http://localhost:3000
```

For deterministic local testing without real AI calls:

```bash
MOCK_AI=true npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the server-side secrets.

| Variable            | Required             | Description                                                                                                                         |
| ------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `APP_URL`           | Production           | Public app URL.                                                                                                                     |
| `DATABASE_URL`      | Production           | PostgreSQL connection string.                                                                                                       |
| `AI_PROVIDER`       | Optional             | `nvidia` or `gemini`. Defaults to `nvidia`.                                                                                         |
| `NVIDIA_API_KEY`    | Live NVIDIA analysis | Server-only NVIDIA API key.                                                                                                         |
| `NVIDIA_BASE_URL`   | Optional             | Defaults to `https://integrate.api.nvidia.com/v1`.                                                                                  |
| `NVIDIA_MODEL`      | Optional             | Defaults to `mistralai/mistral-small-4-119b-2603`.                                                                                  |
| `GEMINI_API_KEY`    | Fallback/live Gemini | Server-only Gemini API key.                                                                                                         |
| `GEMINI_MODEL`      | Optional             | Defaults to `gemini-2.5-flash-lite`.                                                                                                |
| `SESSION_SECRET`    | Production           | At least 32 random characters. Used to sign anonymous session cookies.                                                              |
| `MOCK_AI`           | Optional             | Set `true` for deterministic mock analysis. Use `false` for real providers.                                                         |
| `EPHEMERAL_STORAGE` | Demo only            | Set `true` only for short-lived demos without PostgreSQL. Results are kept in process memory and can disappear on redeploy/restart. |

`AUTH_SECRET` or `NEXTAUTH_SECRET` can also satisfy the production session-secret requirement.

## AI Provider Behavior

Default production behavior:

```text
NVIDIA first -> Gemini fallback when configured
```

When `AI_PROVIDER=nvidia` and `GEMINI_API_KEY` is present, ClarityDoc automatically retries failed provider calls through Gemini. All provider calls happen on the server. API keys are never sent to the browser.

Smoke tests:

```bash
npm run smoke:nvidia
npm run smoke:gemini
```

The smoke scripts analyze the built-in sample contract, validate the result against the Zod schema, and print only a sanitized summary.

## Database

Local PostgreSQL:

```bash
docker compose up -d
npm run db:push
```

Production migrations:

```bash
npm run db:migrate
```

Create a new migration locally:

```bash
npm run db:migrate:dev
```

Main tables:

- `documents`: session id, sanitized filename, document type, text hash, preview, optional full text, created timestamp.
- `analyses`: document id, session id, structured JSON result, model used, usage metadata, created timestamp.

Do not use `prisma db push` against production databases.

## Scripts

```bash
npm run dev           # Start local dev server
npm run build         # Build production bundle
npm run start         # Start standalone production server
npm run lint          # Run ESLint
npm run typecheck     # Run strict TypeScript checks
npm run test          # Run Vitest unit tests
npm run test:e2e      # Run Playwright e2e tests
npm run format        # Format files
npm run format:check  # Check formatting
npm run db:push       # Push Prisma schema locally
npm run db:migrate    # Deploy Prisma migrations
npm run smoke:nvidia  # Real NVIDIA smoke test
npm run smoke:gemini  # Real Gemini smoke test
```

## API Routes

- `GET /api/health`
- `POST /api/documents/extract`
- `POST /api/documents/analyze`
- `GET /api/analyses`
- `GET /api/analyses/:id`
- `DELETE /api/analyses/:id`

`GET /api/health` returns basic service status without exposing secrets, prompts, contract text, or provider responses.

## Security And Privacy

- AI providers are called only from server code.
- Provider keys are never exposed to client code.
- API inputs are validated with Zod.
- LLM responses are validated with Zod before use.
- Document content is treated as untrusted evidence in prompts.
- Uploaded filenames are sanitized.
- Uploads are limited to `.txt`, `.pdf`, and `.docx`.
- File extraction happens server-side.
- Raw contract text, provider keys, prompts, and full provider responses are not logged.
- Full document text is not stored by default.
- Anonymous session cookies are HTTP-only and signed when a session secret is configured.
- The analysis endpoint has basic anonymous-session/IP rate limiting.

For multi-instance production deployments, replace the in-memory rate limiter with Redis, a shared store, or gateway-level rate limiting.

## Testing

Unit tests use deterministic mock analysis and do not require real provider keys.

```bash
npm run lint
npm run typecheck
npm run test
npm run test:e2e
```

Install Playwright browsers if needed:

```bash
npx playwright install chromium
```

## Deployment

### Docker

Build:

```bash
docker build -t claritydoc .
```

Run migrations:

```bash
docker build --target migrator -t claritydoc-migrator .
docker run --rm --env-file .env.production claritydoc-migrator
```

Run app:

```bash
docker run -p 3000:3000 --env-file .env.production claritydoc
```

### Managed Hosting

For Vercel, Render, Railway, Fly, or similar:

1. Provision PostgreSQL.
2. Set `DATABASE_URL`, `APP_URL`, `SESSION_SECRET`, provider keys, and `MOCK_AI=false`.
3. Run `npm run db:migrate` during release.
4. Build with `npm run build`.
5. Start with `npm run start` where standalone output is supported.
6. Check `/api/health`.

### Devpost Demo Deploy

For a short-lived judging demo where the live app only needs to prove the upload, extraction, and analysis flow, ClarityDoc can run without PostgreSQL:

```text
MOCK_AI=true
EPHEMERAL_STORAGE=true
```

This is intentionally marked as demo mode. It keeps analysis history in process memory only, so production customers still need PostgreSQL and `EPHEMERAL_STORAGE=false`.

## Production Checklist

- Use real server-side provider keys.
- Set `MOCK_AI=false`.
- Use a production PostgreSQL database.
- Keep `EPHEMERAL_STORAGE=false` outside short-lived demos.
- Run formal Prisma migrations.
- Set a strong session secret.
- Serve over HTTPS.
- Keep secrets out of logs and source control.
- Define a data retention policy.
- Review legal disclaimer and privacy language with counsel.
- Add shared rate limiting before horizontal scaling.

## Legal Boundary

ClarityDoc is not a law firm, not a lawyer, and does not provide legal advice. It gives informational analysis to help users understand business documents and prepare better questions before consulting a qualified attorney.
