import { NextResponse } from 'next/server';

const SYMBOLS = [
  { id: 'IHSG', ticker: '^JKSE' },
  { id: 'DJI', ticker: '^DJI' },
  { id: 'GOLD', ticker: 'GC=F' },
  { id: 'OIL', ticker: 'CL=F' }
];

export async function GET() {
  try {
    const results = await Promise.all(
      SYMBOLS.map(async (s) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s.ticker}?range=2d&interval=1d`;
          const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            next: { revalidate: 300 } // Cache for 5 minutes
          });
          const data = await res.json();
          const quote = data.chart?.result?.[0]?.indicators?.quote?.[0];
          if (!quote) return { ...s, price: 0, change: 0, percentChange: 0 };
          
          const closes = quote.close.filter((c: number) => c !== null);
          if (closes.length < 2) return { ...s, price: closes[0] || 0, change: 0, percentChange: 0 };
          
          const currentPrice = closes[closes.length - 1];
          const previousPrice = closes[closes.length - 2];
          const change = currentPrice - previousPrice;
          const percentChange = (change / previousPrice) * 100;
          
          return {
            id: s.id,
            price: currentPrice,
            change,
            percentChange
          };
        } catch (e) {
          return { ...s, price: 0, change: 0, percentChange: 0 };
        }
      })
    );

    return NextResponse.json({ success: true, data: results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
