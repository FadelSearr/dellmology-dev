'use client';
import { useEffect, useRef } from 'react';
import { BarChart3, TrendingUp, Layers } from 'lucide-react';
import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import type { WatchlistItem } from '@/lib/types';
import { fmt } from '@/lib/utils';
import { useChartData } from '@/app/hooks/useData';

interface CanvasProps {
  selectedEmiten: string;
  selectedStock: WatchlistItem;
  stockData?: any;
  chartData?: any[];
  chartLoading?: boolean;
}

export default function Canvas({ selectedEmiten, selectedStock, stockData, chartData, chartLoading }: CanvasProps) {
  const detector = stockData?.detector;
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !chartData || chartData.length === 0) return;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.6)',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: 320,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#2ebd85',
      downColor: '#e0294a',
      borderVisible: false,
      wickUpColor: '#2ebd85',
      wickDownColor: '#e0294a'
    });

    candlestickSeries.setData(chartData);
    chart.timeScale().fitContent();

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [chartData]);
  const ups = {
    total: selectedStock.ups,
    technical: 50, // To be implemented with indicators
    bandarmology: detector?.top1?.accdist?.includes('Accum') ? 80 : detector?.top1?.accdist?.includes('Dist') ? 20 : 50,
    volumeFlow: 50,
    sentiment: 50,
    signal: selectedStock.ups >= 70 ? 'strong_buy' : selectedStock.ups <= 30 ? 'strong_sell' : 'neutral',
    confidence: 'high'
  };

  const upsClass = ups.total >= 70 ? 'bullish' : ups.total >= 40 ? 'neutral' : 'bearish';
  const regime = ups.total >= 60 ? 'uptrend' : ups.total <= 40 ? 'downtrend' : 'sideways';

  return (
    <main className="canvas" id="canvas">
      {/* Emiten Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-default)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'var(--font-mono)', letterSpacing: -1 }}>{selectedEmiten}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selectedStock.name}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'var(--font-mono)', color: selectedStock.change >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)' }}>
              Rp {fmt(selectedStock.price)}
            </div>
            <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: selectedStock.change >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)' }}>
              {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change} ({selectedStock.changePercent.toFixed(2)}%)
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`regime-indicator regime-indicator--${regime}`}>
            <TrendingUp size={12} /> {regime.toUpperCase()}
          </span>
          <span className={`confidence-badge confidence-badge--${ups.confidence}`}>
            Confidence: {ups.confidence.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Chart Area */}
      <div style={{ padding: '0 20px', flex: 1 }}>
        <div className="section-header" style={{ padding: '10px 0' }}>
          <div className="section-header__title"><BarChart3 size={14} /> Advanced Chart — CNN Technical Overlay</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {['1m', '5m', '15m', '1H', '4H', '1D'].map(tf => (
              <button key={tf} className="btn btn--ghost btn--sm" style={{ padding: '3px 8px', fontSize: 10 }}>{tf}</button>
            ))}
          </div>
        </div>

        {/* Candlestick Chart Visualization */}
        <div 
          ref={chartContainerRef} 
          className="chart-container" 
          style={{ height: 320, width: '100%', position: 'relative' }}
        >
          {chartLoading && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', color: 'var(--text-muted)' }}>
              Loading chart data...
            </div>
          )}
        </div>
      </div>

      {/* Unified Power Score */}
      <div style={{ padding: '12px 20px 16px' }}>
        <div className="section-header" style={{ padding: '8px 0' }}>
          <div className="section-header__title"><Layers size={14} /> Unified Power Score</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Tech:{ups.technical} · Broker:{ups.bandarmology} · Vol:{ups.volumeFlow} · Sent:{ups.sentiment}
          </div>
        </div>
        <div className="ups-bar">
          <div className={`ups-bar__fill ups-bar__fill--${upsClass}`} style={{ width: `${ups.total}%` }} />
          <div className="ups-bar__label">{ups.total} / 100 — {ups.signal.replace('_', ' ').toUpperCase()}</div>
        </div>
      </div>
    </main>
  );
}
