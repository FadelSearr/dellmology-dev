-- ══════════════════════════════════════════════════════════════
-- Dellmology Pro — Supabase Schema
-- Run this in the Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Session table (token storage)
CREATE TABLE IF NOT EXISTS session (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  is_valid BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 1.5. Running Trades (Tick-by-Tick)
CREATE TABLE IF NOT EXISTS running_trades (
  id BIGSERIAL PRIMARY KEY,
  emiten TEXT NOT NULL,
  price BIGINT,
  volume BIGINT,
  type TEXT, -- 'haka', 'haki', 'neutral'
  broker_buy TEXT,
  broker_sell TEXT,
  timestamp TIMESTAMPTZ DEFAULT now()
);

-- 2. Stock queries (analysis results)
CREATE TABLE IF NOT EXISTS stock_queries (
  id BIGSERIAL PRIMARY KEY,
  emiten TEXT NOT NULL,
  sector TEXT,
  from_date DATE NOT NULL,
  to_date DATE NOT NULL,
  bandar TEXT,
  barang_bandar BIGINT,
  rata_rata_bandar BIGINT,
  harga BIGINT,
  ara BIGINT,
  arb BIGINT,
  fraksi INT,
  total_bid BIGINT,
  total_offer BIGINT,
  total_papan BIGINT,
  rata_rata_bid_ofer BIGINT,
  a NUMERIC,
  p NUMERIC,
  target_realistis BIGINT,
  target_max BIGINT,
  real_harga BIGINT,
  max_harga BIGINT,
  status TEXT DEFAULT 'success',
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(from_date, emiten)
);

-- 3. Broker flow data
CREATE TABLE IF NOT EXISTS broker_flow (
  id BIGSERIAL PRIMARY KEY,
  emiten TEXT NOT NULL,
  broker_code TEXT NOT NULL,
  identity TEXT, -- 'Whale', 'Retail', 'Bandar', 'Mix'
  net_value BIGINT,
  net_lot BIGINT,
  avg_price BIGINT,
  consistency_score NUMERIC,
  buy_days INT,
  total_days INT,
  daily_data JSONB,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, emiten, broker_code)
);

-- 4. Z-Score history
CREATE TABLE IF NOT EXISTS zscore_history (
  id BIGSERIAL PRIMARY KEY,
  emiten TEXT NOT NULL,
  date DATE NOT NULL,
  z_score NUMERIC,
  volume BIGINT,
  is_anomaly BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(date, emiten)
);

-- 5. AI narratives
CREATE TABLE IF NOT EXISTS ai_narratives (
  id BIGSERIAL PRIMARY KEY,
  emiten TEXT NOT NULL,
  summary TEXT,
  bull_case TEXT,
  bear_case TEXT,
  confidence TEXT,
  key_points JSONB,
  ups_total NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Background job logs
CREATE TABLE IF NOT EXISTS background_job_logs (
  id BIGSERIAL PRIMARY KEY,
  job_name TEXT NOT NULL,
  status TEXT DEFAULT 'running',
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  success_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  total_items INT DEFAULT 0,
  log_entries JSONB DEFAULT '[]',
  error_message TEXT,
  metadata JSONB
);

-- 7. Watchlist groups cache
CREATE TABLE IF NOT EXISTS watchlist_groups (
  watchlist_id INT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_favorite BOOLEAN DEFAULT false,
  emoji TEXT,
  category_type TEXT,
  total_items INT DEFAULT 0,
  synced_at TIMESTAMPTZ DEFAULT now()
);

-- 8. Profile settings
CREATE TABLE IF NOT EXISTS profile (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stock_queries_emiten ON stock_queries(emiten);
CREATE INDEX IF NOT EXISTS idx_stock_queries_date ON stock_queries(from_date DESC);
CREATE INDEX IF NOT EXISTS idx_broker_flow_emiten_date ON broker_flow(emiten, date DESC);
CREATE INDEX IF NOT EXISTS idx_zscore_emiten_date ON zscore_history(emiten, date DESC);
CREATE INDEX IF NOT EXISTS idx_ai_narratives_emiten ON ai_narratives(emiten, created_at DESC);

-- RLS policies (allow all for service role, restrict for anon)
ALTER TABLE session ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_flow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for anon" ON session FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON stock_queries FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON broker_flow FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON zscore_history FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON ai_narratives FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON background_job_logs FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON watchlist_groups FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON profile FOR ALL USING (true);
