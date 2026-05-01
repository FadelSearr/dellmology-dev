/* ══════════════════════════════════════════════════════════════
   Dellmology Pro — Telegram Notification Service
   
   Per roadmap: "Send alerts to phone when important signals appear"
   + Heartbeat monitor ("Ping every 5 minutes")
   ══════════════════════════════════════════════════════════════ */

const TELEGRAM_API = 'https://api.telegram.org/bot';

function getBotConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

async function sendTelegramMessage(text: string, parseMode = 'HTML') {
  const config = getBotConfig();
  if (!config) {
    console.warn('Telegram not configured - skipping notification');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API}${config.token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text,
        parse_mode: parseMode,
        disable_web_page_preview: true,
      }),
    });
    return response.ok;
  } catch (error) {
    console.error('Telegram send failed:', error);
    return false;
  }
}

// ── Signal Alert ─────────────────────────────────────────────
export async function sendSignalAlert(params: {
  emiten: string;
  signal: string;
  ups: number;
  confidence: string;
  topBroker: string;
  netValue: number;
  price: number;
  zScore: number;
}) {
  const emoji = params.ups >= 80 ? '🟢' : params.ups >= 60 ? '🟡' : '🔴';
  const netSign = params.netValue >= 0 ? '+' : '';
  const netFormatted = (Math.abs(params.netValue) / 1e9).toFixed(1);

  const text = `
${emoji} <b>DELLMOLOGY SIGNAL</b> ${emoji}

📊 <b>${params.emiten}</b> — Rp ${params.price.toLocaleString()}
🎯 Signal: <b>${params.signal.toUpperCase()}</b>
⚡ UPS: <b>${params.ups}/100</b> (${params.confidence})

👤 Top Broker: ${params.topBroker} (${netSign}${netFormatted}B)
📈 Z-Score: ${params.zScore.toFixed(1)}

⏰ ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
  `.trim();

  return sendTelegramMessage(text);
}

// ── Critical Alert (Kill-Switch) ─────────────────────────────
export async function sendCriticalAlert(params: {
  emiten: string;
  type: 'ROC_SPIKE' | 'IHSG_CRASH' | 'TOKEN_EXPIRED' | 'ENGINE_OFFLINE';
  details: string;
}) {
  const text = `
🚨🚨 <b>CRITICAL ALERT</b> 🚨🚨

⚠️ Type: <b>${params.type}</b>
${params.emiten ? `📊 Emiten: <b>${params.emiten}</b>` : ''}
📝 ${params.details}

🔒 All buy signals SUSPENDED for this emiten.
⏰ ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
  `.trim();

  return sendTelegramMessage(text);
}

// ── Heartbeat Ping ───────────────────────────────────────────
// Per roadmap: "Send ping every 5 min, if no ping in 10 min, alert OFFLINE"
export async function sendHeartbeat() {
  return sendTelegramMessage('🫀 DELLMOLOGY HEARTBEAT — Engine Online');
}

// ── Engine Offline Alert ─────────────────────────────────────
export async function sendOfflineAlert() {
  return sendTelegramMessage(
    '🔴🔴 <b>DELLMOLOGY OFFLINE</b> 🔴🔴\n\n' +
    '⚠️ Engine has not sent heartbeat in 10 minutes!\n' +
    '📱 CHECK POSITION MANUALLY!\n\n' +
    `⏰ ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
  );
}

// ── Daily Summary ────────────────────────────────────────────
export async function sendDailySummary(params: {
  topSignals: { emiten: string; ups: number; signal: string }[];
  marketRegime: string;
  ihsgChange: number;
}) {
  const signalLines = params.topSignals
    .map((s, i) => `${i + 1}. <b>${s.emiten}</b> — UPS ${s.ups} (${s.signal})`)
    .join('\n');

  const text = `
📋 <b>DELLMOLOGY DAILY SUMMARY</b>

📈 Market: <b>${params.marketRegime}</b>
${params.ihsgChange >= 0 ? '🟢' : '🔴'} IHSG: ${params.ihsgChange >= 0 ? '+' : ''}${params.ihsgChange.toFixed(2)}%

🏆 <b>Top Signals Today:</b>
${signalLines || 'No strong signals detected'}

⏰ ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
  `.trim();

  return sendTelegramMessage(text);
}
