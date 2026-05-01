'use client';
import { useState } from 'react';
import { Eye, Crosshair, SlidersHorizontal, Star, TrendingUp } from 'lucide-react';
import type { WatchlistItem, ScreenerMode } from '@/lib/types';
import { fmt } from '@/lib/utils';

interface SidebarProps {
  watchlist: WatchlistItem[];
  selectedEmiten: string;
  onSelectEmiten: (code: string) => void;
  screenerMode: ScreenerMode;
  onScreenerModeChange: (mode: ScreenerMode) => void;
  searchQuery: string;
  minPrice: number;
  maxPrice: number;
  setMinPrice: (price: number) => void;
  setMaxPrice: (price: number) => void;
}

export default function Sidebar({ watchlist, selectedEmiten, onSelectEmiten, screenerMode, onScreenerModeChange, searchQuery, minPrice, maxPrice, setMinPrice, setMaxPrice }: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'watchlist' | 'screener'>('watchlist');
  const filtered = watchlist.filter(w =>
    (w.code || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (w.name || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  return (
    <aside className="sidebar" id="sidebar">
      {/* Tab Switcher */}
      <div className="sidebar__section" style={{ paddingBottom: 8 }}>
        <div className="screener-tabs">
          <button className={`screener-tab ${activeTab === 'watchlist' ? 'screener-tab--active' : ''}`} onClick={() => setActiveTab('watchlist')}>
            <Eye size={11} style={{ marginRight: 4, verticalAlign: -1 }} />Watchlist
          </button>
          <button className={`screener-tab ${activeTab === 'screener' ? 'screener-tab--active' : ''}`} onClick={() => setActiveTab('screener')}>
            <Crosshair size={11} style={{ marginRight: 4, verticalAlign: -1 }} />Screener
          </button>
        </div>
      </div>

      {activeTab === 'screener' && (
        <div className="sidebar__section">
          <div className="sidebar__section-title">Mode</div>
          <div className="screener-tabs">
            {(['daytrade', 'swing', 'custom'] as ScreenerMode[]).map(m => (
              <button key={m} className={`screener-tab ${screenerMode === m ? 'screener-tab--active' : ''}`} onClick={() => onScreenerModeChange(m)}>
                {m === 'daytrade' ? '⚡ Day' : m === 'swing' ? '📈 Swing' : '🎯 Custom'}
              </button>
            ))}
          </div>
          
          {screenerMode === 'custom' && (
            <div style={{ marginTop: 12, padding: 8, background: 'var(--bg-canvas)', borderRadius: 4 }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>PRICE RANGE FILTER</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input 
                  type="number" 
                  value={minPrice} 
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  style={{ width: '100%', padding: '4px 8px', fontSize: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-main)', borderRadius: 2 }}
                />
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>-</span>
                <input 
                  type="number" 
                  value={maxPrice} 
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  style={{ width: '100%', padding: '4px 8px', fontSize: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-main)', borderRadius: 2 }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* List */}
      <div className="sidebar__section" style={{ borderBottom: 'none', flex: 1, overflowY: 'auto' }}>
        <div className="sidebar__section-title">
          {activeTab === 'watchlist' ? `Watchlist (${filtered.length})` : `Results (${filtered.length})`}
        </div>

        {filtered.map(item => (
          <div
            key={item.id || item.code}
            id={`watchlist-${item.code}`}
            className={`watchlist-item ${selectedEmiten === item.code ? 'watchlist-item--selected' : ''}`}
            onClick={() => onSelectEmiten(item.code)}
          >
            <div>
              <div className="watchlist-item__code">{item.code}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{item.sector || 'IDX'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="watchlist-item__price" style={{ color: item.price > 0 ? (item.change >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)') : 'var(--text-muted)' }}>
                {item.price > 0 ? fmt(item.price) : '-'}
              </div>
              <span className={`watchlist-item__ups ${item.price > 0 ? (item.ups >= 70 ? 'ups--high' : item.ups >= 40 ? 'ups--medium' : 'ups--low') : ''}`} style={{ opacity: item.price > 0 ? 1 : 0.5 }}>
                {item.price > 0 ? `UPS ${item.ups || 50}` : 'UPS -'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
