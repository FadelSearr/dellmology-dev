'use client';

import { useState, useEffect } from 'react';
import { Zap, X, AlertTriangle, Shield, BarChart3, TrendingUp, TrendingDown } from 'lucide-react';

interface CombatModeProps {
  emiten: string;
  price: number;
  ups: number;
  signal: string;
  regime: string;
  atr: number;
  stopLoss: number;
  takeProfit: number;
  killSwitch: boolean;
  onClose: () => void;
}

export default function CombatMode({
  emiten, price, ups, signal, regime, atr,
  stopLoss, takeProfit, killSwitch, onClose,
}: CombatModeProps) {
  const [pulseClass, setPulseClass] = useState('');

  useEffect(() => {
    setPulseClass('combat-pulse');
    const t = setTimeout(() => setPulseClass(''), 1000);
    return () => clearTimeout(t);
  }, [price]);

  const upsColor = ups >= 70 ? 'var(--color-bullish)' : ups >= 40 ? 'var(--color-warning)' : 'var(--color-bearish)';
  const signalEmoji = signal.includes('buy') ? '🟢' : signal.includes('sell') ? '🔴' : '⚪';

  return (
    <div className="combat-overlay">
      {/* Header */}
      <div className="combat-header">
        <div className="combat-header__left">
          <Zap size={20} color="var(--color-warning)" />
          <span className="combat-header__title">COMBAT MODE</span>
          <span className="combat-header__subtitle">High Volatility — Simplified View</span>
        </div>
        <button className="combat-close" onClick={onClose} title="Exit Combat Mode">
          <X size={18} />
        </button>
      </div>

      {/* Kill-Switch Banner */}
      {killSwitch && (
        <div className="combat-killswitch">
          <AlertTriangle size={16} />
          <span>KILL-SWITCH ACTIVE — ALL BUY SIGNALS SUSPENDED</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="combat-grid">
        {/* Emiten + Price */}
        <div className="combat-cell combat-cell--price">
          <div className="combat-cell__label">EMITEN</div>
          <div className={`combat-cell__value combat-cell__value--huge ${pulseClass}`}>
            {emiten}
          </div>
          <div className="combat-cell__price" style={{ color: upsColor }}>
            Rp {price.toLocaleString()}
          </div>
        </div>

        {/* UPS */}
        <div className="combat-cell">
          <div className="combat-cell__label">UPS</div>
          <div className="combat-cell__value" style={{ color: upsColor, fontSize: 48 }}>
            {ups}
          </div>
          <div className="combat-cell__sub">
            {signalEmoji} {signal.replace('_', ' ').toUpperCase()}
          </div>
        </div>

        {/* Regime */}
        <div className="combat-cell">
          <div className="combat-cell__label">REGIME</div>
          <div className="combat-cell__value" style={{ fontSize: 28 }}>
            {regime === 'uptrend' ? <TrendingUp size={32} color="var(--color-bullish)" /> :
             regime === 'downtrend' ? <TrendingDown size={32} color="var(--color-bearish)" /> :
             <BarChart3 size={32} color="var(--color-warning)" />}
          </div>
          <div className="combat-cell__sub">{regime.toUpperCase()}</div>
        </div>

        {/* ATR */}
        <div className="combat-cell">
          <div className="combat-cell__label">ATR (14)</div>
          <div className="combat-cell__value">Rp {atr}</div>
        </div>

        {/* Stop Loss */}
        <div className="combat-cell combat-cell--danger">
          <div className="combat-cell__label">
            <Shield size={14} /> STOP LOSS (1.5x ATR)
          </div>
          <div className="combat-cell__value" style={{ color: 'var(--color-bearish)' }}>
            Rp {Math.round(stopLoss).toLocaleString()}
          </div>
        </div>

        {/* Take Profit */}
        <div className="combat-cell combat-cell--success">
          <div className="combat-cell__label">TAKE PROFIT (2x ATR)</div>
          <div className="combat-cell__value" style={{ color: 'var(--color-bullish)' }}>
            Rp {Math.round(takeProfit).toLocaleString()}
          </div>
        </div>

        {/* Smart Position Sizing */}
        <div className="combat-cell" style={{ gridColumn: 'span 2' }}>
          <div className="combat-cell__label">SMART POSITION SIZING (Max 1% Risk of Rp 100M)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12 }}>
            <div className="combat-cell__value" style={{ fontSize: 36, color: 'var(--color-primary)' }}>
              {Math.max(1, Math.floor(1000000 / (Math.max(price - stopLoss, 1) * 100))).toLocaleString()}
            </div>
            <div className="combat-cell__sub" style={{ paddingBottom: 6 }}>MAX LOTS</div>
          </div>
        </div>
      </div>
    </div>
  );
}
