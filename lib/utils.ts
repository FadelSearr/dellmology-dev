/* ══════════════════════════════════════════════════════════════
   Dellmology Pro — Utility Functions
   ══════════════════════════════════════════════════════════════ */

/**
 * Format number with thousands separator (locale-safe for SSR)
 * Uses manual formatting to avoid hydration mismatch
 */
export function fmt(n: number): string {
  const s = Math.abs(n).toString();
  const parts: string[] = [];
  for (let i = s.length; i > 0; i -= 3) {
    parts.unshift(s.slice(Math.max(0, i - 3), i));
  }
  return (n < 0 ? '-' : '') + parts.join(',');
}

/**
 * Format large numbers in compact form (B, M, K)
 */
export function fmtCompact(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '+';
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(1)}K`;
  return `${sign}${abs}`;
}
