/* ══════════════════════════════════════════════════════════════
   Dellmology Pro — Yahoo Finance Fallback Adapter
   
   Per roadmap "Graceful Degradation": If Stockbit token dies,
   system auto-switches to Yahoo Finance for basic price data.
   ══════════════════════════════════════════════════════════════ */

const YF_BASE = 'https://query1.finance.yahoo.com/v8/finance';

/**
 * Fetch basic quote data from Yahoo Finance (IDX stocks)
 * Yahoo uses .JK suffix for IDX stocks (e.g., BBRI.JK)
 */
export async function fetchYahooQuote(emiten: string) {
  const symbol = `${emiten}.JK`;
  const url = `${YF_BASE}/chart/${symbol}?range=1d&interval=1m`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    if (!response.ok) throw new Error(`Yahoo Finance: ${response.status}`);

    const json = await response.json();
    const result = json.chart?.result?.[0];
    if (!result) throw new Error('No data from Yahoo Finance');

    const meta = result.meta;
    return {
      emiten,
      price: meta.regularMarketPrice,
      previousClose: meta.previousClose,
      change: meta.regularMarketPrice - meta.previousClose,
      changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      volume: meta.regularMarketVolume,
      high: meta.regularMarketDayHigh,
      low: meta.regularMarketDayLow,
      open: meta.regularMarketOpen,
      source: 'yahoo_finance',
      isDelayed: true,
    };
  } catch (error) {
    console.error(`Yahoo Finance fallback failed for ${emiten}:`, error);
    return null;
  }
}

/**
 * Fetch historical OHLCV data from Yahoo Finance
 */
export async function fetchYahooHistory(
  emiten: string,
  range = '3mo',
  interval = '1d'
) {
  const symbol = `${emiten}.JK`;
  const url = `${YF_BASE}/chart/${symbol}?range=${range}&interval=${interval}`;

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (!response.ok) throw new Error(`Yahoo Finance history: ${response.status}`);

    const json = await response.json();
    const result = json.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};

    return timestamps.map((ts: number, i: number) => ({
      time: new Date(ts * 1000).toISOString().split('T')[0],
      open: quotes.open?.[i] || 0,
      high: quotes.high?.[i] || 0,
      low: quotes.low?.[i] || 0,
      close: quotes.close?.[i] || 0,
      volume: quotes.volume?.[i] || 0,
    })).filter((d: { close: number }) => d.close > 0);
  } catch (error) {
    console.error(`Yahoo Finance history failed for ${emiten}:`, error);
    return [];
  }
}

/**
 * Fetch global macro data (commodities, indices) for Command Bar
 * Per roadmap §4: "Context for market analysis"
 */
export async function fetchGlobalMacro() {
  const symbols = [
    { symbol: '^JKSE', name: 'IHSG' },
    { symbol: '^DJI', name: 'Dow Jones' },
    { symbol: 'GC=F', name: 'Gold' },
    { symbol: 'CL=F', name: 'Oil' },
  ];

  const results = await Promise.allSettled(
    symbols.map(async ({ symbol, name }) => {
      const url = `${YF_BASE}/chart/${symbol}?range=1d&interval=1m`;
      const response = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (!response.ok) throw new Error(`${symbol}: ${response.status}`);
      const json = await response.json();
      const meta = json.chart?.result?.[0]?.meta;
      if (!meta) throw new Error(`No data for ${symbol}`);

      return {
        name,
        symbol,
        price: meta.regularMarketPrice,
        change: meta.regularMarketPrice - meta.previousClose,
        changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
      };
    })
  );

  return results
    .filter((r): r is PromiseFulfilledResult<{
      name: string; symbol: string; price: number; change: number; changePercent: number;
    }> => r.status === 'fulfilled')
    .map(r => r.value);
}
