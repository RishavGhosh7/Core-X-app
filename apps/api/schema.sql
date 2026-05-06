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

CREATE TABLE IF NOT EXISTS reward_accounts (
  user_id TEXT PRIMARY KEY,
  points_balance INTEGER NOT NULL DEFAULT 0,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS concierge_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  status TEXT NOT NULL,
  opening_message TEXT NOT NULL,
  suggested_prompts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'custom',
  last_four TEXT NOT NULL,
  balance BIGINT NOT NULL,
  card_limit BIGINT NOT NULL,
  color TEXT,
  gradient TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  offer_id TEXT NOT NULL,
  points_spent INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
