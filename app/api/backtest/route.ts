import { NextRequest, NextResponse } from 'next/server';
import { runBacktest, compareStrategies } from '@/lib/backtest';
import type { BacktestConfig } from '@/lib/backtest';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, brokerData, config, challengerConfig } = body;

    if (!data || !Array.isArray(data) || data.length < 30) {
      return NextResponse.json(
        { success: false, error: 'Need at least 30 OHLCV bars in "data" array' },
        { status: 400 }
      );
    }

    const brokers = brokerData || data.map(() => ({ netValue: 0, consistency: 50, hakaRatio: 0.5 }));

    // Run champion backtest
    const champion = runBacktest(data, brokers, config);

    // If challenger config provided, run comparison
    let comparison = null;
    if (challengerConfig) {
      const challenger = runBacktest(data, brokers, challengerConfig);
      comparison = compareStrategies(champion, challenger);
    }

    return NextResponse.json({
      success: true,
      data: {
        result: champion,
        comparison,
      },
    });
  } catch (error) {
    console.error('Backtest Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Backtest failed' },
      { status: 500 }
    );
  }
}
