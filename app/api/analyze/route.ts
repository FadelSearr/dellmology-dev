import { NextRequest, NextResponse } from 'next/server';
import {
  calculateUPS, calculatePositionSize, detectMarketRegime,
  rsi, macd, atr, detectVolumeAnomalies, detectWashSale,
  multiTimeframeValidation, checkRoCKillSwitch, adjustUPSThreshold,
} from '@/lib/analysis';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      closes = [],
      highs = [],
      lows = [],
      volumes = [],
      dates = [],
      brokerData = {},
      ihsgChangePercent = 0,
      portfolioSize = 100000000, // 100M IDR default
    } = body;

    if (closes.length < 15) {
      return NextResponse.json({ success: false, error: 'Need at least 15 data points' }, { status: 400 });
    }

    // Technical Indicators
    const rsiValues = rsi(closes);
    const currentRsi = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1] : 50;
    const macdResult = macd(closes);
    const currentMacdHist = macdResult.histogram.length > 0 ? macdResult.histogram[macdResult.histogram.length - 1] : 0;
    const atrValues = atr(highs, lows, closes);
    const currentAtr = atrValues.length > 0 ? atrValues[atrValues.length - 1] : 0;

    // Market Regime
    const regime = detectMarketRegime(closes);

    // Z-Score Anomalies
    const zScoreData = detectVolumeAnomalies(volumes, dates);
    const currentZScore = zScoreData.length > 0 ? zScoreData[zScoreData.length - 1].zScore : 0;

    // Wash Sale Detection
    const washSale = detectWashSale(
      brokerData.netBuy || 0,
      brokerData.grossTurnover || 0
    );

    // UPS Calculation
    const ups = calculateUPS({
      rsiValue: currentRsi,
      macdHistogram: currentMacdHist,
      trendDirection: regime,
      whaleNetValue: brokerData.whaleNetValue || 0,
      brokerConsistency: brokerData.consistency || 50,
      zScore: currentZScore,
      hakaRatio: brokerData.hakaRatio || 0.5,
    });

    // Adjust threshold if IHSG is crashing
    const upsThreshold = adjustUPSThreshold(ihsgChangePercent);
    const signalMeetsThreshold = ups.total >= upsThreshold;

    // Position Sizing
    const currentPrice = closes[closes.length - 1];
    const position = calculatePositionSize({
      currentPrice,
      atrValue: currentAtr,
      portfolioSize,
    });

    // RoC Kill-Switch check
    const rocCheck = checkRoCKillSwitch(
      closes.slice(-10).map((p: number, i: number) => ({
        time: dates[dates.length - 10 + i] || new Date().toISOString(),
        price: p,
      }))
    );

    return NextResponse.json({
      success: true,
      data: {
        technical: { rsi: currentRsi, macd: currentMacdHist, atr: currentAtr },
        regime,
        zScoreHistory: zScoreData,
        currentZScore,
        washSale,
        ups,
        upsThreshold,
        signalMeetsThreshold,
        position,
        killSwitch: {
          roc: rocCheck,
          ihsgAdjusted: ihsgChangePercent <= -1.5,
        },
      },
    });
  } catch (error: unknown) {
    console.error('Analysis Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Analysis failed' },
      { status: 500 }
    );
  }
}
