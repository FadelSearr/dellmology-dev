'use client';
import { Search, Zap, Globe2 } from 'lucide-react';
import { mockInfraHealth } from '@/lib/mock-data';
import { useState, useEffect } from 'react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onCombatMode?: () => void;
}

export default function Navbar({ searchQuery, onSearchChange, onCombatMode }: NavbarProps) {
  const health = mockInfraHealth;
  const [macros, setMacros] = useState<any[]>([]);

  useEffect(() => {
    async function fetchMacros() {
      try {
        const res = await fetch('/api/macro');
        const json = await res.json();
        if (json.success) setMacros(json.data);
      } catch (e) {
        console.error("Failed to load macros", e);
      }
    }
    fetchMacros();
  }, []);

  return (
    <nav className="navbar" id="navbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div className="navbar__brand">
          <div className="navbar__brand-icon">⚡</div>
          <span>DELLMOLOGY <span style={{ color: 'var(--accent-cyan)' }}>PRO</span></span>
        </div>

        <div className="navbar__search">
          <Search size={14} className="navbar__search-icon" />
          <input
            id="search-emiten"
            type="text"
            placeholder="Search emiten... (e.g. BBRI)"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            autoComplete="off"
          />
        </div>
      </div>

      {/* Global Macro Ticker */}
      <div className="macro-ticker" style={{ display: 'flex', alignItems: 'center', gap: 15, fontSize: 11, fontFamily: 'var(--font-mono)' }}>
        <Globe2 size={14} color="var(--text-muted)" />
        {macros.length === 0 ? (
          <span style={{ color: 'var(--text-muted)' }}>Loading macro data...</span>
        ) : (
          macros.map(m => (
            <div key={m.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{m.id}</span>
              <span style={{ color: m.percentChange >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)' }}>
                {m.price ? m.price.toLocaleString(undefined, { maximumFractionDigits: 1 }) : '-'} 
                ({m.percentChange > 0 ? '+' : ''}{m.percentChange.toFixed(2)}%)
              </span>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        {onCombatMode && (
          <button
            className="btn btn--ghost btn--sm"
            onClick={onCombatMode}
            id="btn-combat-mode"
            title="Activate Combat Mode"
            style={{ color: 'var(--color-warning)', borderColor: 'rgba(245,158,11,0.3)' }}
          >
            <Zap size={12} /> COMBAT
          </button>
        )}

        <div className="navbar__health">
          <HealthDot label="Engine" status={health.engine} />
          <HealthDot label="DB" status={health.database} />
          <HealthDot label="Token" status={health.token} />
          <HealthDot label="Data" status={health.dataIntegrity} />
        </div>
      </div>
    </nav>
  );
}

function HealthDot({ label, status }: { label: string; status: string }) {
  const cls = status === 'online' ? 'online' : status === 'warning' ? 'warning' : 'offline';
  return (
    <div className="health-dot">
      <div className={`health-dot__indicator health-dot__indicator--${cls}`} />
      <span>{label}</span>
    </div>
  );
}
