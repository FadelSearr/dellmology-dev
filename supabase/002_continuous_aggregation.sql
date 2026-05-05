-- ══════════════════════════════════════════════════════════════
-- Dellmology Pro — Continuous Aggregation (TimescaleDB Alternative)
-- Gunakan script ini pada Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

-- 1. Mengaktifkan ekstensi pg_cron (untuk penjadwalan otomatis)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Membuat Materialized View untuk Agregasi 1-Menit (Candlestick + Volume Analysis)
CREATE MATERIALIZED VIEW IF NOT EXISTS running_trades_1m_agg AS
SELECT
    date_trunc('minute', timestamp) AS time_bucket,
    emiten,
    -- Open: harga dari transaksi pertama pada menit tersebut
    (array_agg(price ORDER BY timestamp ASC))[1] AS open_price,
    -- High: harga tertinggi pada menit tersebut
    MAX(price) AS high_price,
    -- Low: harga terendah pada menit tersebut
    MIN(price) AS low_price,
    -- Close: harga dari transaksi terakhir pada menit tersebut
    (array_agg(price ORDER BY timestamp DESC))[1] AS close_price,
    -- Volume HAKA (Aggressive Buy / Akumulasi Bandar)
    SUM(CASE WHEN type = 'haka' THEN volume ELSE 0 END) AS haka_volume,
    -- Volume HAKI (Aggressive Sell / Distribusi Bandar)
    SUM(CASE WHEN type = 'haki' THEN volume ELSE 0 END) AS haki_volume,
    -- Total Volume pada menit tersebut
    SUM(volume) AS total_volume
FROM
    running_trades
GROUP BY
    time_bucket, emiten;

-- Membuat unique index wajib agar bisa direfresh secara efisien tanpa mengunci database (CONCURRENTLY)
CREATE UNIQUE INDEX IF NOT EXISTS idx_running_trades_1m_agg_unique ON running_trades_1m_agg(time_bucket, emiten);

-- 3. Fungsi untuk Refresh Materialized View
CREATE OR REPLACE FUNCTION refresh_running_trades_1m_agg()
RETURNS void AS $$
BEGIN
    -- CONCURRENTLY memastikan aplikasi Vercel tetap bisa membaca data selagi view ini di-refresh
    REFRESH MATERIALIZED VIEW CONCURRENTLY running_trades_1m_agg;
END;
$$ LANGUAGE plpgsql;

-- 4. Fungsi Pembersihan Data Mentah (Data Retention > 7 Hari)
-- Menghemat kuota database Supabase Anda agar tidak bloat!
CREATE OR REPLACE FUNCTION cleanup_old_running_trades()
RETURNS void AS $$
BEGIN
    DELETE FROM running_trades
    WHERE timestamp < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- 5. Mendaftarkan Penjadwalan Job (Cron Jobs)
-- Catatan: Fungsi `cron.schedule` dijalankan oleh database

-- A. Me-refresh grafik (Materialized View) secara otomatis setiap 1 menit
SELECT cron.schedule(
    'refresh_trades_1m',
    '* * * * *',
    $$ SELECT refresh_running_trades_1m_agg(); $$
);

-- B. Menjalankan fungsi penghapusan data lama setiap jam 00:00 (tengah malam)
SELECT cron.schedule(
    'cleanup_old_trades',
    '0 0 * * *',
    $$ SELECT cleanup_old_running_trades(); $$
);
