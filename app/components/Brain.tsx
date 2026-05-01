'use client';
import { Brain as BrainIcon, Calculator, Send, Play } from 'lucide-react';
import { fmt } from '@/lib/utils';

interface BrainProps {
  selectedEmiten: string;
  narrativeData?: any;
  loading?: boolean;
  price?: number;
  atr?: number;
  ups?: number;
  signal?: string;
  onRunBacktest?: () => void;
}

export default function Brain({ selectedEmiten, narrativeData, loading, price, atr = 0, ups = 50, signal = 'neutral', onRunBacktest }: BrainProps) {
  const n = narrativeData?.data || {
    confidence: 'medium',
    summary: loading ? 'Analyzing market structure with local LLM...' : 'No AI narrative available.',
    bullCase: loading ? '...' : '-',
    bearCase: loading ? '...' : '-',
  };

  const p = price || 0;
  const stopLoss = p - atr * 1.5;
  const takeProfit = p + atr * 2;

  return (
    <div className="brain" id="brain">
      {/* AI Narrative */}
      <div className="brain__narrative">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)' }}>
            <BrainIcon size={13} color={loading ? 'var(--text-muted)' : 'var(--accent-cyan)'} /> AI Narrative — {selectedEmiten}
          </div>
          <span className={`confidence-badge confidence-badge--${n.confidence}`}>
            {n.confidence.toUpperCase()}
          </span>
        </div>
        <div className="brain__narrative-text" dangerouslySetInnerHTML={{
          __html: n.summary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        }} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
          <div style={{ padding: 8, background: 'var(--color-bullish-glow)', borderRadius: 6, fontSize: 11 }}>
            <div style={{ fontWeight: 700, color: 'var(--color-bullish)', marginBottom: 4 }}>🐂 Bull Case</div>
            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.bullCase}</div>
          </div>
          <div style={{ padding: 8, background: 'var(--color-bearish-glow)', borderRadius: 6, fontSize: 11 }}>
            <div style={{ fontWeight: 700, color: 'var(--color-bearish)', marginBottom: 4 }}>🐻 Bear Case</div>
            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>{n.bearCase}</div>
          </div>
        </div>
      </div>

      {/* Position Sizing */}
      <div className="brain__sizing">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)' }}>
          <Calculator size={13} color="var(--accent-primary)" /> Position Sizer
        </div>
        <div className="position-sizer">
          <div className="position-sizer__row">
            <span className="position-sizer__label">Est. ATR</span>
            <span className="position-sizer__value">Rp {atr}</span>
          </div>
          <div className="position-sizer__row">
            <span className="position-sizer__label">Suggested Max Lot</span>
            <span className="position-sizer__value" style={{ color: 'var(--accent-cyan)' }}>
              {Math.max(1, Math.floor(1000000 / (Math.max(p - stopLoss, 1) * 100))).toLocaleString()} lot
            </span>
          </div>
          <div className="position-sizer__row">
            <span className="position-sizer__label">Stop Loss</span>
            <span className="position-sizer__value" style={{ color: 'var(--color-bearish)' }}>Rp {fmt(stopLoss)}</span>
          </div>
          <div className="position-sizer__row">
            <span className="position-sizer__label">Take Profit</span>
            <span className="position-sizer__value" style={{ color: 'var(--color-bullish)' }}>Rp {fmt(takeProfit)}</span>
          </div>
          <div className="position-sizer__row">
            <span className="position-sizer__label">R:R Ratio</span>
            <span className="position-sizer__value">1:2.0</span>
          </div>
          <div className="position-sizer__row">
            <span className="position-sizer__label">Slippage</span>
            <span className="position-sizer__value">1%</span>
          </div>
        </div>
      </div>

      {/* Action Dock */}
      <div className="brain__actions">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-secondary)' }}>
          Action Dock
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button 
            className="btn btn--primary" 
            id="btn-telegram"
            onClick={async (e) => {
              const btn = e.currentTarget;
              const originalText = btn.innerHTML;
              btn.innerHTML = 'Sending...';
              try {
                const res = await fetch('/api/telegram', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    emiten: selectedEmiten,
                    price: p,
                    ups,
                    summary: n.summary,
                    signal,
                    atr,
                    stopLoss,
                    takeProfit
                  })
                });
                if (res.ok) btn.innerHTML = '✅ Sent to Telegram';
                else btn.innerHTML = '❌ Failed';
              } catch (err) {
                btn.innerHTML = '❌ Error';
              }
              setTimeout(() => { btn.innerHTML = originalText; }, 3000);
            }}
          >
            <Send size={13} /> Send to Telegram
          </button>
          <button className="btn btn--ghost" id="btn-backtest" onClick={onRunBacktest}>
            <Play size={13} /> Run Backtest
          </button>
        </div>
      </div>
    </div>
  );
}
