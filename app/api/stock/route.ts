import { NextRequest, NextResponse } from 'next/server';
import { fetchMarketDetector, fetchOrderbook, fetchEmitenInfo } from '@/lib/stockbit';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const emiten = searchParams.get('emiten');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  if (!emiten) {
    return NextResponse.json({ success: false, error: 'emiten is required' }, { status: 400 });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const fromDate = from || today;
    const toDate = to || today;

    const [marketDetector, orderbook, emitenInfo] = await Promise.allSettled([
      fetchMarketDetector(emiten, fromDate, toDate),
      fetchOrderbook(emiten),
      fetchEmitenInfo(emiten),
    ]);

    // Check if any promises rejected (e.g. token expired)
    const rejected = [marketDetector, orderbook, emitenInfo].find(p => p.status === 'rejected');
    if (rejected && rejected.status === 'rejected') {
      throw rejected.reason; // Throws the TokenExpiredError
    }

    const mdData = marketDetector.status === 'fulfilled' ? marketDetector.value : null;
    const obData = orderbook.status === 'fulfilled' ? orderbook.value : null;
    const infoData = emitenInfo.status === 'fulfilled' ? emitenInfo.value : null;

    // Extract top broker
    const topBuyers = mdData?.data?.broker_summary?.brokers_buy?.slice(0, 5) || [];
    const topSellers = mdData?.data?.broker_summary?.brokers_sell?.slice(0, 5) || [];
    const detector = mdData?.data?.bandar_detector;

    // Extract market data
    const price = obData?.data?.lastprice || obData?.data?.close || 0;
    const previousClose = obData?.data?.previousclose || 0;
    const change = price && previousClose ? price - previousClose : 0;
    const changePercent = price && previousClose ? (change / previousClose) * 100 : 0;
    const high = obData?.data?.high || 0;
    const ara = obData?.data?.ara?.value ? Number(obData.data.ara.value) : 0;
    const arb = obData?.data?.arb?.value ? Number(obData.data.arb.value) : 0;
    const totalBid = obData?.data?.total_bid_offer?.bid?.lot ? Number(obData.data.total_bid_offer.bid.lot.replace(/,/g, '')) : 0;
    const totalOffer = obData?.data?.total_bid_offer?.offer?.lot ? Number(obData.data.total_bid_offer.offer.lot.replace(/,/g, '')) : 0;

    // Calculate Unified Power Score (UPS)
    let ups = 50;
    // 1. Bandarmology Influence (±20 points)
    if (detector?.top1?.accdist?.includes('Accum')) ups += 5;
    else if (detector?.top1?.accdist?.includes('Dist')) ups -= 5;
    if (detector?.top3?.accdist?.includes('Accum')) ups += 5;
    else if (detector?.top3?.accdist?.includes('Dist')) ups -= 5;
    if (detector?.top5?.accdist?.includes('Accum')) ups += 10;
    else if (detector?.top5?.accdist?.includes('Dist')) ups -= 10;

    // 2. Orderbook Pressure (±15 points) - More Bids = Bullish
    if (totalBid > 0 && totalOffer > 0) {
      const bidRatio = totalBid / (totalBid + totalOffer);
      if (bidRatio > 0.6) ups += 15;
      else if (bidRatio > 0.5) ups += 5;
      else if (bidRatio < 0.4) ups -= 15;
      else if (bidRatio < 0.5) ups -= 5;
    }

    // 3. Price Momentum (±15 points)
    if (changePercent > 3) ups += 15;
    else if (changePercent > 0) ups += 5;
    else if (changePercent < -3) ups -= 15;
    else if (changePercent < 0) ups -= 5;

    // --- ADVANCED ANALYTICS ENGINE ---

    // 4. Whale Z-Score Calculation (Anomaly Detection)
    // We calculate how many standard deviations the Top 1 Buyer's volume is compared to the rest of the Top 5
    let zScore = 0;
    if (topBuyers.length > 1) {
      const bvals = topBuyers.map((b: any) => parseFloat(b.bval || '0'));
      const mean = bvals.reduce((a: number, b: number) => a + b, 0) / bvals.length;
      const stdDev = Math.sqrt(bvals.map((v: number) => Math.pow(v - mean, 2)).reduce((a: number, b: number) => a + b, 0) / bvals.length) || 1;
      zScore = (bvals[0] - mean) / stdDev;
    }
    
    // 5. Spoofing / Phantom Liquidity Detection (Dark Pool Discovery)
    // If bids are massive (>5x offers) but the price is going down, it's a fake wall to trap retail.
    let spoofingAlert = false;
    if (totalBid > totalOffer * 5 && changePercent < 0) {
      spoofingAlert = true;
      ups -= 20; // Penalize UPS heavily due to manipulation
    }

    // 6. Wash Sale / Circular Trade Detection
    // If the Top 1 Buyer and Top 1 Seller control > 40% of total volume and the price is completely flat
    let washSaleAlert = false;
    const top1BuyerVol = detector?.top1?.vol || 0;
    const totalMarketVol = detector?.volume || 1;
    if (top1BuyerVol / totalMarketVol > 0.4 && Math.abs(changePercent) < 0.5) {
      washSaleAlert = true;
      ups -= 15; // Penalize UPS (fake volume)
    }

    ups = Math.min(Math.max(Math.round(ups), 5), 95);

    return NextResponse.json({
      success: true,
      data: {
        emiten,
        sector: infoData?.data?.sector || '',
        name: infoData?.data?.name || emiten,
        price,
        change,
        changePercent,
        high,
        ara,
        arb,
        totalBid,
        totalOffer,
        topBuyers,
        topSellers,
        detector,
        ups,
        zScore: parseFloat(zScore.toFixed(2)),
        spoofingAlert,
        washSaleAlert,
        fromDate,
        toDate,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isTokenError = message.includes('Token expired') || message.includes('401');
    return NextResponse.json(
      { success: false, error: message, isTokenError },
      { status: isTokenError ? 401 : 500 }
    );
  }
}
