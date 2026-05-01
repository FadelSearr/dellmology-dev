import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const emiten = searchParams.get('emiten');
  
  if (!emiten) {
    return NextResponse.json({ success: false, error: 'emiten is required' }, { status: 400 });
  }

  try {
    // Fetch from Yahoo Finance (public V8 chart endpoint)
    // Yahoo requires .JK for IDX stocks
    const symbol = `${emiten}.JK`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=6mo&interval=1d`;
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch chart data from Yahoo: ${res.status}`);
    }

    const data = await res.json();
    const result = data.chart?.result?.[0];

    if (!result) {
      throw new Error('No chart data found');
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators.quote[0];

    // Map to Lightweight Charts format
    // Map to Lightweight Charts format
    const chartData = timestamps.map((ts: number, i: number) => ({
      time: ts, // Unix timestamp in seconds
      open: quote.open[i],
      high: quote.high[i],
      low: quote.low[i],
      close: quote.close[i],
      value: quote.volume[i] // Lightweight Charts often uses 'value' for volume histograms
    })).filter((item: any) => item.open !== null && item.close !== null); // Filter out empty days

    // Calculate 14-day ATR (Average True Range)
    let atr = 0;
    if (chartData.length >= 15) {
      const trs = [];
      for (let i = 1; i < chartData.length; i++) {
        const current = chartData[i];
        const prev = chartData[i - 1];
        const tr1 = current.high - current.low;
        const tr2 = Math.abs(current.high - prev.close);
        const tr3 = Math.abs(current.low - prev.close);
        const trueRange = Math.max(tr1, tr2, tr3);
        trs.push(trueRange);
      }
      // Simple 14-day moving average of TR
      const last14Trs = trs.slice(-14);
      atr = last14Trs.reduce((a, b) => a + b, 0) / 14;
    }

    return NextResponse.json({
      success: true,
      data: {
        chartData,
        atr: Math.round(atr)
      }
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
