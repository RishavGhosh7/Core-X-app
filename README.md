# Amex-aligned Portfolio Build

JavaScript-only monorepo implementing the plan's MVP story:
- governed agentic spend (intent -> decision),
- automated expense lines,
- real-time ranked offers in a unified 5-tab shell.

## Stack

- `apps/api`: Node.js + Express API (ESM, JS)
- `apps/web`: Vite + React (JSX)
- `docker-compose.yml`: local PostgreSQL for schema alignment

## Run

```bash
npm install
npm run dev
```

App URLs:

- **Live (Vercel):** [https://core-x-app-1.vercel.app/](https://core-x-app-1.vercel.app/)
- Web (local): `http://localhost:5173`
- API (local): `http://localhost:4000`

## PostgreSQL (optional for now)

The API currently runs in-memory for fast demo iteration, while `apps/api/schema.sql` and `docker-compose.yml` align the data model to PostgreSQL from the plan.

```bash
docker compose up -d
```

## OpenRouter concierge replies (optional)

Set these environment variables for LLM-powered concierge responses:

```bash
OPENROUTER_API_KEY=your_key_here
OPENROUTER_MODEL=openai/gpt-4.1-mini
OPENROUTER_SITE_URL=http://localhost:5173
OPENROUTER_APP_NAME=CORE-X Concierge
```

If `OPENROUTER_API_KEY` is missing or the provider call fails, the concierge endpoint automatically falls back to deterministic template replies.

## Key endpoints

- `GET /api/health`
- `GET /api/bootstrap`
- `POST /api/intents`
- `POST /api/receipts` (multipart file: `receipt`)
- `GET /api/offers`
- `GET /api/expenses`
