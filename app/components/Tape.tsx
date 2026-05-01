'use client';
import { Users, Activity, AlertTriangle } from 'lucide-react';
import { mockZScores } from '@/lib/mock-data';
import { fmtCompact } from '@/lib/utils';

interface BrokerData {
  netbs_broker_code: string;
  type?: string;
  bvalv?: number | string;
  svalv?: number | string;
}

interface TapeProps {
  selectedEmiten: string;
  topBuyers: BrokerData[];
  topSellers: BrokerData[];
  zScore?: number;
  spoofingAlert?: boolean;
  washSaleAlert?: boolean;
}

export default function Tape({ selectedEmiten, topBuyers, topSellers, zScore = 0, spoofingAlert = false, washSaleAlert = false }: TapeProps) {
  // Combine top buyers and sellers into a unified list
  const flow = [
    ...topBuyers.map(b => ({ code: b.netbs_broker_code, type: b.type || 'Unknown', netValue: Number(b.bvalv || 0) })),
    ...topSellers.map(s => ({ code: s.netbs_broker_code, type: s.type || 'Unknown', netValue: -Number(s.svalv || 0) }))
  ].sort((a, b) => Math.abs(b.netValue) - Math.abs(a.netValue)).slice(0, 8);

  // Inject real live zScore into the end of the visual sparkline
  const liveZScores = [...mockZScores.slice(1), { date: 'Today', zScore: zScore, volume: 0, isAnomaly: Math.abs(zScore) > 1.5 }];

  return (
    <aside className="tape" id="tape">
      {/* Broker Flow Table */}
      <div className="section-header">
        <div className="section-header__title"><Users size={14} /> Deep Broker Flow</div>
        <span className="tag tag--info">{selectedEmiten}</span>
      </div>
      <div style={{ padding: '8px 12px', overflowX: 'auto' }}>
        <table className="broker-table">
          <thead>
            <tr>
              <th>Broker</th>
              <th>Type</th>
              <th>Net Val</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {flow.length > 0 ? flow.map(b => (
              <tr key={b.code}>
                <td style={{ fontWeight: 700 }}>{b.code}</td>
                <td>
                  <span className={`broker-badge broker-badge--${b.type === 'Asing' ? 'whale' : 'retail'}`}>
                    {b.type === 'Asing' ? 'Whale' : b.type}
                  </span>
                </td>
                <td style={{ color: b.netValue >= 0 ? 'var(--color-bullish)' : 'var(--color-bearish)', fontWeight: 600 }}>
                  {fmtCompact(b.netValue)}
                </td>
                <td>
                  <span className={b.netValue >= 0 ? 'ups--high' : 'ups--low'}
                    style={{ padding: '1px 4px', borderRadius: 3, fontSize: 10, fontWeight: 700 }}>
                    {b.netValue >= 0 ? 'Accum' : 'Dist'}
                  </span>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '10px', color: 'var(--text-muted)' }}>No Broker Data</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Z-Score Section */}
      <div className="section-header">
        <div className="section-header__title"><Activity size={14} /> Whale Z-Score</div>
      </div>
      <div style={{ padding: '8px 14px' }}>
        <div className="zscore-chart">
          {liveZScores.map((z, i) => {
            const h = Math.min(Math.abs(z.zScore) * 30, 96);
            const color = z.isAnomaly
              ? (z.zScore > 0 ? 'var(--color-bullish)' : 'var(--color-bearish)')
              : 'var(--text-muted)';
            return <div key={i} className="zscore-bar" style={{ height: `${h}px`, background: color, opacity: z.isAnomaly ? 1 : 0.4 }} title={`Z-Score: ${z.zScore}`} />;
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <span>-20d</span><span>Z: {zScore.toFixed(2)}</span>
        </div>
      </div>

      {/* Wash Sale Alerts */}
      <div className="section-header">
        <div className="section-header__title"><AlertTriangle size={14} /> Live Alerts</div>
      </div>
      <div style={{ padding: '8px 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {washSaleAlert && (
            <div className="tag tag--warning" style={{ fontSize: 10, padding: '4px 8px', display: 'block' }}>
              ⚠️ Wash Sale Detected — Flat price with massive volume cross
            </div>
          )}
          {spoofingAlert && (
            <div className="tag tag--bearish" style={{ fontSize: 10, padding: '4px 8px', display: 'block' }}>
              🚨 Spoofing Alert — Fake Bid Wall detected during drop
            </div>
          )}
          {Math.abs(zScore) > 2.0 && (
            <div className="tag tag--info" style={{ fontSize: 10, padding: '4px 8px', display: 'block' }}>
              🐋 Massive Whale {zScore > 0 ? 'Accumulation' : 'Distribution'} (Z &gt; 2.0)
            </div>
          )}
          {!washSaleAlert && !spoofingAlert && Math.abs(zScore) <= 2.0 && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>No critical anomalies detected today.</div>
          )}
        </div>
      </div>
    </aside>
  );
}
