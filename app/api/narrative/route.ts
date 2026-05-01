import { NextRequest, NextResponse } from 'next/server';
import { generateNarrative } from '@/lib/ai-narrative';
import type { BrokerFlowEntry, MarketRegime, UnifiedPowerScore } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emiten, price, change, changePercent, ups, regime, topBrokers, zScore, atr: atrVal, rsi: rsiVal } = body;

    if (!emiten) {
      return NextResponse.json({ success: false, error: 'emiten is required' }, { status: 400 });
    }

    const narrative = await generateNarrative({
      emiten,
      price: price || 0,
      change: change || 0,
      changePercent: changePercent || 0,
      ups: ups || { total: 50, technical: 50, bandarmology: 50, volumeFlow: 50, sentiment: 50, signal: 'neutral', confidence: 'medium' },
      regime: regime || 'sideways',
      topBrokers: topBrokers || [],
      zScore: zScore || 0,
      atr: atrVal || 0,
      rsi: rsiVal || 50,
    });

    return NextResponse.json({ success: true, data: narrative });
  } catch (error) {
    console.error('Narrative Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Narrative generation failed' },
      { status: 500 }
    );
  }
}
