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
- Web: `http://localhost:5173`
- API: `http://localhost:4000`

## PostgreSQL (optional for now)

The API currently runs in-memory for fast demo iteration, while `apps/api/schema.sql` and `docker-compose.yml` align the data model to PostgreSQL from the plan.

```bash
docker compose up -d
```

## Key endpoints

- `GET /api/health`
- `GET /api/bootstrap`
- `POST /api/intents`
- `POST /api/receipts` (multipart file: `receipt`)
- `GET /api/offers`
- `GET /api/expenses`
