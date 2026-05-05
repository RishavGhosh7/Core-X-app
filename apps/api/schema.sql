CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS policies (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  max_intent_amount NUMERIC NOT NULL,
  requires_receipt_above NUMERIC NOT NULL
);

CREATE TABLE IF NOT EXISTS transaction_intents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  merchant TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL,
  vertical TEXT NOT NULL,
  domain_json JSONB,
  receipt_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS decisions (
  id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL REFERENCES transaction_intents(id),
  status TEXT NOT NULL,
  violations JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS offers (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  vertical TEXT NOT NULL,
  merchant_pattern TEXT,
  base_boost INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS expense_report_lines (
  id TEXT PRIMARY KEY,
  intent_id TEXT NOT NULL REFERENCES transaction_intents(id),
  merchant TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  vertical TEXT NOT NULL,
  status TEXT NOT NULL,
  decision_id TEXT NOT NULL REFERENCES decisions(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
