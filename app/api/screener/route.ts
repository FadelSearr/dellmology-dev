import { NextRequest, NextResponse } from 'next/server';
import { fetchWatchlistGroups, fetchWatchlist, fetchOrderbook, fetchMarketDetector } from '@/lib/stockbit';
import type { ScreenerMode } from '@/lib/types';
import { IDX_TICKERS } from '@/lib/idx-tickers';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = (searchParams.get('mode') || 'daytrade') as ScreenerMode;
  const minPrice = Number(searchParams.get('minPrice') || 0);
  const maxPrice = Number(searchParams.get('maxPrice') || 999999);

  try {
    // Get all watchlists to maximize price coverage
    const groups = await fetchWatchlistGroups();
    
    const allWatchlistItems: any[] = [];
    if (groups && groups.length > 0) {
      await Promise.all(
        groups.map(async (g: any) => {
          const wData = await fetchWatchlist(g.watchlist_id).catch(() => null);
          if (wData?.data?.result) {
            allWatchlistItems.push(...wData.data.result);
          }
        })
      );
    }

    // Map the fetched watchlist items to an easy lookup map
    const watchlistMap = new Map();
    allWatchlistItems.forEach((item: any) => {
      const code = item.symbol || item.company_code;
      if (code && !watchlistMap.has(code)) {
        watchlistMap.set(code, item);
      }
    });

    // Create a combined list using all IDX tickers
    let combinedResults = IDX_TICKERS.map(code => {
      const item = watchlistMap.get(code);
      return {
        id: code,
        code: code,
        emiten: code,
        name: item?.company_name || code,
        price: item?.last_price || 0,
        change: item?.change_point || 0,
        changePercent: parseFloat(item?.percent || '0'),
        volume: item?.volume || 0,
        frequency: item?.frequency || 0,
        ups: 50,
      };
    });

    // Apply Price Filter if Custom mode
    if (mode === 'custom') {
      combinedResults = combinedResults.filter(item => {
        // Exclude missing prices from filtered results if a valid minPrice is requested
        if (item.price === 0 && minPrice > 0) return false;
        return item.price >= minPrice && item.price <= maxPrice;
      });
    }

    // Sort based on mode
    const sorted = combinedResults.sort((a, b) => {
      if (mode === 'daytrade') return b.volume - a.volume; // Highest volume
      if (mode === 'swing') return b.changePercent - a.changePercent; // Highest gainers
      return a.code.localeCompare(b.code); // Alphabetical fallback for custom
    });

    return NextResponse.json({
      success: true,
      data: {
        mode,
        count: sorted.length,
        results: sorted, // Return all matching
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Screener failed';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
