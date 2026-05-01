/* ══════════════════════════════════════════════════════════════
   Dellmology Pro — Backtesting Rig
   
   Per roadmap:
   - "Strict Point-in-Time: Only data BEFORE trade date visible"
   - "Slippage Buffer 0.5-1% compensation"
   - "Dead Stock Inclusion: Suspended stocks = 100% loss"
   - "Champion-Challenger Framework for model versioning"
   ══════════════════════════════════════════════════════════════ */

import { calculateUPS, rsi, macd, atr, detectMarketRegime, calculateZScore } from './analysis';
import type { MarketRegime, UPSSignal } from './types';

// ── Types ────────────────────────────────────────────────────
export interface OHLCVBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestTrade {
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  lots: number;
  pnl: number;
  pnlPercent: number;
  signal: UPSSignal;
  upsAtEntry: number;
  regime: MarketRegime;
  slippageCost: number;
  holdDays: number;
}

export interface BacktestResult {
  strategy: string;
  version: string;
  period: string;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnl: number;
  totalPnlPercent: number;
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  avgHoldDays: number;
  trades: BacktestTrade[];
  equity: number[];
  warnings: string[];
}

export interface BacktestConfig {
  strategy: string;
  version: string;
  initialCapital: number;
  upsEntryThreshold: number;       // Min UPS to enter (default 70)
  upsExitThreshold: number;        // Exit below this UPS (default 40)
  maxHoldDays: number;             // Max hold period (default 10)
  slippagePercent: number;         // Slippage buffer per roadmap (default 0.75%)
  maxPositionPercent: number;      // Max % of capital per trade (default 10%)
  stopLossAtrMultiple: number;     // SL at X * ATR (default 2)
  takeProfitAtrMultiple: number;   // TP at X * ATR (default 3)
  cooloffAfterDrawdownPercent: number; // Lock after X% drawdown (default 5%)
}

const DEFAULT_CONFIG: BacktestConfig = {
  strategy: 'ups_momentum',
  version: 'v1.0',
  initialCapital: 100_000_000,
  upsEntryThreshold: 70,
  upsExitThreshold: 40,
  maxHoldDays: 10,
  slippagePercent: 0.75,
  maxPositionPercent: 10,
  stopLossAtrMultiple: 2,
  takeProfitAtrMultiple: 3,
  cooloffAfterDrawdownPercent: 5,
};

// ── Main Backtest Engine ─────────────────────────────────────
export function runBacktest(
  data: OHLCVBar[],
  brokerData: { netValue: number; consistency: number; hakaRatio: number }[],
  config: Partial<BacktestConfig> = {}
): BacktestResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const warnings: string[] = [];

  if (data.length < 30) {
    return emptyResult(cfg, ['Insufficient data: need at least 30 bars']);
  }

  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);
  const volumes = data.map(d => d.volume);

  const trades: BacktestTrade[] = [];
  let capital = cfg.initialCapital;
  let peakCapital = capital;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  const equity: number[] = [capital];
  let inPosition = false;
  let entryIdx = 0;
  let entryPrice = 0;
  let lots = 0;
  let entryUps = 0;
  let entrySignal: UPSSignal = 'neutral';
  let entryRegime: MarketRegime = 'sideways';
  let coolingOff = false;
  let cooloffUntilIdx = 0;

  // Walk forward — strict Point-in-Time
  // Per roadmap: "Only data BEFORE trade date is visible"
  for (let i = 29; i < data.length; i++) {
    // Point-in-time slice — NO future data
    const sliceCloses = closes.slice(0, i + 1);
    const sliceHighs = highs.slice(0, i + 1);
    const sliceLows = lows.slice(0, i + 1);
    const sliceVolumes = volumes.slice(0, i + 1);

    // Compute indicators on historical-only data
    const rsiValues = rsi(sliceCloses);
    const currentRsi = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 50;
    const macdResult = macd(sliceCloses);
    const currentMacdHist = macdResult.histogram.length > 0 ? macdResult.histogram[macdResult.histogram.length - 1] : 0;
    const atrValues = atr(sliceHighs, sliceLows, sliceCloses);
    const currentAtr = atrValues.length > 0 ? atrValues[atrValues.length - 1] : 0;
    const regime = detectMarketRegime(sliceCloses);
    const zScores = calculateZScore(sliceVolumes.slice(-20));
    const currentZ = zScores.length > 0 ? zScores[zScores.length - 1] : 0;

    const bd = brokerData[Math.min(i, brokerData.length - 1)] || { netValue: 0, consistency: 50, hakaRatio: 0.5 };

    const ups = calculateUPS({
      rsiValue: currentRsi,
      macdHistogram: currentMacdHist,
      trendDirection: regime,
      whaleNetValue: bd.netValue,
      brokerConsistency: bd.consistency,
      zScore: currentZ,
      hakaRatio: bd.hakaRatio,
    });

    // Cooling-off check (per roadmap: 5% drawdown = 24h lock)
    if (coolingOff && i < cooloffUntilIdx) {
      equity.push(capital);
      continue;
    }
    coolingOff = false;

    if (!inPosition) {
      // Entry conditions
      if (ups.total >= cfg.upsEntryThreshold && (ups.signal === 'buy' || ups.signal === 'strong_buy')) {
        // Apply slippage to entry
        entryPrice = Math.round(data[i].close * (1 + cfg.slippagePercent / 100));
        const positionSize = capital * (cfg.maxPositionPercent / 100);
        lots = Math.floor(positionSize / (entryPrice * 100));

        if (lots > 0) {
          inPosition = true;
          entryIdx = i;
          entryUps = ups.total;
          entrySignal = ups.signal;
          entryRegime = regime;
        }
      }
    } else {
      // Exit conditions
      const holdDays = i - entryIdx;
      const slippedClose = Math.round(data[i].close * (1 - cfg.slippagePercent / 100));
      const currentAtrExit = currentAtr || 50;

      const stopLoss = entryPrice - currentAtrExit * cfg.stopLossAtrMultiple;
      const takeProfit = entryPrice + currentAtrExit * cfg.takeProfitAtrMultiple;

      const shouldExit =
        slippedClose <= stopLoss ||
        slippedClose >= takeProfit ||
        ups.total <= cfg.upsExitThreshold ||
        holdDays >= cfg.maxHoldDays;

      if (shouldExit) {
        const exitPrice = slippedClose;
        const pnl = (exitPrice - entryPrice) * lots * 100;
        const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
        const slippageCost = data[i].close * (cfg.slippagePercent / 100) * lots * 100;

        trades.push({
          entryDate: data[entryIdx].date,
          exitDate: data[i].date,
          entryPrice,
          exitPrice,
          lots,
          pnl: Math.round(pnl),
          pnlPercent: Math.round(pnlPercent * 100) / 100,
          signal: entrySignal,
          upsAtEntry: entryUps,
          regime: entryRegime,
          slippageCost: Math.round(slippageCost),
          holdDays,
        });

        capital += pnl;
        inPosition = false;

        // Track drawdown
        if (capital > peakCapital) peakCapital = capital;
        const dd = peakCapital - capital;
        const ddPct = (dd / peakCapital) * 100;
        if (dd > maxDrawdown) maxDrawdown = dd;
        if (ddPct > maxDrawdownPercent) maxDrawdownPercent = ddPct;

        // Cooling off trigger
        if (ddPct >= cfg.cooloffAfterDrawdownPercent) {
          coolingOff = true;
          cooloffUntilIdx = i + 5; // ~1 trading day
          warnings.push(`Cooling-off triggered at ${data[i].date}: drawdown ${ddPct.toFixed(1)}%`);
        }
      }
    }

    equity.push(capital);
  }

  // Close any remaining position
  if (inPosition && data.length > entryIdx) {
    const lastPrice = Math.round(data[data.length - 1].close * (1 - cfg.slippagePercent / 100));
    const pnl = (lastPrice - entryPrice) * lots * 100;
    trades.push({
      entryDate: data[entryIdx].date,
      exitDate: data[data.length - 1].date,
      entryPrice,
      exitPrice: lastPrice,
      lots,
      pnl: Math.round(pnl),
      pnlPercent: Math.round(((lastPrice - entryPrice) / entryPrice) * 10000) / 100,
      signal: entrySignal,
      upsAtEntry: entryUps,
      regime: entryRegime,
      slippageCost: 0,
      holdDays: data.length - 1 - entryIdx,
    });
    capital += pnl;
  }

  const winningTrades = trades.filter(t => t.pnl > 0).length;
  const losingTrades = trades.filter(t => t.pnl <= 0).length;
  const totalPnl = capital - cfg.initialCapital;
  const avgHoldDays = trades.length > 0 ? trades.reduce((s, t) => s + t.holdDays, 0) / trades.length : 0;

  // Sharpe Ratio (simplified)
  const returns = trades.map(t => t.pnlPercent);
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
  const stdReturn = returns.length > 1
    ? Math.sqrt(returns.reduce((s, r) => s + (r - avgReturn) ** 2, 0) / (returns.length - 1))
    : 1;
  const sharpeRatio = stdReturn > 0 ? (avgReturn / stdReturn) * Math.sqrt(252) : 0;

  return {
    strategy: cfg.strategy,
    version: cfg.version,
    period: `${data[0]?.date || ''} → ${data[data.length - 1]?.date || ''}`,
    totalTrades: trades.length,
    winningTrades,
    losingTrades,
    winRate: trades.length > 0 ? Math.round((winningTrades / trades.length) * 10000) / 100 : 0,
    totalPnl: Math.round(totalPnl),
    totalPnlPercent: Math.round((totalPnl / cfg.initialCapital) * 10000) / 100,
    maxDrawdown: Math.round(maxDrawdown),
    maxDrawdownPercent: Math.round(maxDrawdownPercent * 100) / 100,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    avgHoldDays: Math.round(avgHoldDays * 10) / 10,
    trades,
    equity,
    warnings,
  };
}

// ── Champion-Challenger Framework ────────────────────────────
// Per roadmap: "Run two versions simultaneously, compare monthly"
export function compareStrategies(
  champion: BacktestResult,
  challenger: BacktestResult
): {
  winner: 'champion' | 'challenger';
  reason: string;
  shouldSwap: boolean;
  comparison: Record<string, { champion: number; challenger: number }>;
} {
  const comparison = {
    winRate: { champion: champion.winRate, challenger: challenger.winRate },
    totalPnlPercent: { champion: champion.totalPnlPercent, challenger: challenger.totalPnlPercent },
    sharpeRatio: { champion: champion.sharpeRatio, challenger: challenger.sharpeRatio },
    maxDrawdownPercent: { champion: champion.maxDrawdownPercent, challenger: challenger.maxDrawdownPercent },
  };

  // Score each metric
  let championScore = 0;
  let challengerScore = 0;

  if (challenger.winRate > champion.winRate + 2) challengerScore++;
  else championScore++;

  if (challenger.totalPnlPercent > champion.totalPnlPercent * 1.1) challengerScore++;
  else championScore++;

  if (challenger.sharpeRatio > champion.sharpeRatio + 0.1) challengerScore++;
  else championScore++;

  if (challenger.maxDrawdownPercent < champion.maxDrawdownPercent * 0.9) challengerScore++;
  else championScore++;

  const winner = challengerScore > championScore ? 'challenger' : 'champion';
  const shouldSwap = challengerScore >= 3;

  return {
    winner,
    reason: shouldSwap
      ? `Challenger beats champion in ${challengerScore}/4 metrics — SWAP recommended`
      : `Champion holds with ${championScore}/4 metrics advantage`,
    shouldSwap,
    comparison,
  };
}

function emptyResult(cfg: BacktestConfig, warnings: string[]): BacktestResult {
  return {
    strategy: cfg.strategy, version: cfg.version, period: '', totalTrades: 0,
    winningTrades: 0, losingTrades: 0, winRate: 0, totalPnl: 0, totalPnlPercent: 0,
    maxDrawdown: 0, maxDrawdownPercent: 0, sharpeRatio: 0, avgHoldDays: 0,
    trades: [], equity: [cfg.initialCapital], warnings,
  };
}
