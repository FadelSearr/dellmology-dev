/* ══════════════════════════════════════════════════════════════
   Dellmology Pro — AI Narrative Agent
   
   Per roadmap: "AI reads numerical data and summarizes it into
   human language. Includes Adversarial Prompting — for every
   bullish narrative, auto-generate a bearish counter-argument."
   
   Uses local AI or any OpenAI-compatible endpoint.
   ══════════════════════════════════════════════════════════════ */

import type { AINarrative, ConfidenceLevel, UnifiedPowerScore, BrokerFlowEntry, MarketRegime } from './types';

// ── AI Provider Config ───────────────────────────────────────
// Supports: GPT4All (OpenAI-compatible), Ollama, or any /v1/chat/completions endpoint
const AI_ENDPOINT = process.env.AI_ENDPOINT || 'http://localhost:4891/v1/chat/completions';
const AI_MODEL = process.env.AI_MODEL || 'DeepSeek-R1-Distill-Qwen-1.5B-Q4_0';
const AI_PROVIDER = process.env.AI_PROVIDER || 'gpt4all'; // 'gpt4all' | 'ollama' | 'openai'

interface NarrativeInput {
  emiten: string;
  price: number;
  change: number;
  changePercent: number;
  ups: UnifiedPowerScore;
  regime: MarketRegime;
  topBrokers: BrokerFlowEntry[];
  zScore: number;
  atr: number;
  rsi: number;
}

// ── Pre-Processing Wrapper ───────────────────────────────────
// Per roadmap: "Don't send raw logs to AI. Send JSON Summary."
function buildAnalysisSummary(input: NarrativeInput): string {
  const topBuyer = input.topBrokers.find(b => b.netValue > 0);
  const topSeller = input.topBrokers.find(b => b.netValue < 0);

  return JSON.stringify({
    emiten: input.emiten,
    harga_saat_ini: input.price,
    perubahan_persen: `${input.changePercent.toFixed(2)}%`,
    unified_power_score: input.ups.total,
    sinyal: input.ups.signal,
    confidence: input.ups.confidence,
    market_regime: input.regime,
    teknikal: {
      rsi_14: Math.round(input.rsi),
      atr_14: Math.round(input.atr),
    },
    bandarmology: {
      top_buyer: topBuyer ? {
        broker: topBuyer.brokerCode,
        identity: topBuyer.identity,
        net_value_miliar: Math.round(topBuyer.netValue / 1e9),
        konsistensi: `${topBuyer.consistencyScore}%`,
        hari_beli: `${topBuyer.buyDays}/${topBuyer.totalDays}`,
      } : null,
      top_seller: topSeller ? {
        broker: topSeller.brokerCode,
        identity: topSeller.identity,
        net_value_miliar: Math.round(topSeller.netValue / 1e9),
      } : null,
    },
    anomali_volume: {
      z_score: input.zScore,
      is_anomaly: Math.abs(input.zScore) > 2,
    },
  }, null, 2);
}

// ── Main Narrative Prompt ────────────────────────────────────
// Optimized for DeepSeek-R1 1.5B — keep prompts short and structured
function buildBullishPrompt(summary: string): string {
  return `Analisis saham berdasarkan data ini:

${summary}

Jawab dalam format:
RINGKASAN: (2 kalimat tentang kondisi saham)
POIN: (3 fakta utama, satu per baris)
BULL CASE: (1 kalimat mengapa harga bisa naik)`;
}

// ── Adversarial Prompt ───────────────────────────────────────
function buildBearishPrompt(summary: string, bullCase: string): string {
  return `Data saham:
${summary}

Analisis bullish: ${bullCase}

Berikan 2-3 kalimat: mengapa analisis bullish di atas BISA SALAH dan apa risikonya?`;
}

// ── Call AI Provider ─────────────────────────────────────────
async function callAI(prompt: string): Promise<string> {
  try {
    let body: string;
    
    if (AI_PROVIDER === 'ollama') {
      // Ollama native format
      body = JSON.stringify({
        model: AI_MODEL,
        prompt,
        stream: false,
        options: { temperature: 0.3, num_predict: 300 },
      });
    } else {
      // GPT4All / OpenAI-compatible format (/v1/chat/completions)
      body = JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Kamu adalah analis saham Indonesia profesional. Jawab singkat, padat, dan akurat. Gunakan bahasa Indonesia.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      });
    }

    const response = await fetch(AI_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: AbortSignal.timeout(60000), // 60s for small local models
    });

    if (!response.ok) throw new Error(`AI API: ${response.status}`);

    const json = await response.json();

    // Parse response based on format
    // OpenAI/GPT4All format
    if (json.choices?.[0]?.message?.content) {
      return json.choices[0].message.content;
    }
    // Ollama format
    if (json.response) {
      return json.response;
    }

    return '';
  } catch (error) {
    console.error('AI call failed:', error);
    return '';
  }
}

// ── Generate Full Narrative ──────────────────────────────────
export async function generateNarrative(input: NarrativeInput): Promise<AINarrative> {
  const summary = buildAnalysisSummary(input);

  // Step 1: Generate bullish analysis
  const bullishPrompt = buildBullishPrompt(summary);
  const bullishResponse = await callAI(bullishPrompt);

  // Step 2: Adversarial prompting — generate bear case
  const bearishPrompt = buildBearishPrompt(summary, bullishResponse);
  const bearishResponse = await callAI(bearishPrompt);

  // Parse key points from bullish response
  const keyPoints = extractKeyPoints(bullishResponse);

  // Determine confidence
  const confidence = determineConfidence(input);

  return {
    summary: bullishResponse || buildFallbackSummary(input),
    bullCase: extractSection(bullishResponse, 'BULL CASE') || buildFallbackBullCase(input),
    bearCase: bearishResponse || buildFallbackBearCase(input),
    confidence,
    timestamp: new Date().toISOString(),
    keyPoints: keyPoints.length > 0 ? keyPoints : buildFallbackKeyPoints(input),
  };
}

// ── Fallback Narratives (when AI is offline) ─────────────────
function buildFallbackSummary(input: NarrativeInput): string {
  const topBuyer = input.topBrokers.find(b => b.netValue > 0);
  const direction = input.change >= 0 ? 'menguat' : 'melemah';
  const brokerInfo = topBuyer
    ? `Broker ${topBuyer.brokerCode} (${topBuyer.identity}) melakukan akumulasi konsisten ${topBuyer.buyDays}/${topBuyer.totalDays} hari.`
    : '';

  return `${input.emiten} ${direction} ${Math.abs(input.changePercent).toFixed(2)}% ke Rp ${input.price.toLocaleString()}. ` +
    `RSI di ${Math.round(input.rsi)}, regime ${input.regime}. ${brokerInfo} ` +
    `UPS: ${input.ups.total}/100 (${input.ups.signal.replace('_', ' ')}).`;
}

function buildFallbackBullCase(input: NarrativeInput): string {
  const topBuyer = input.topBrokers.find(b => b.netValue > 0);
  if (!topBuyer) return 'Tidak ada sinyal akumulasi kuat terdeteksi.';
  return `Akumulasi oleh ${topBuyer.identity} (${topBuyer.brokerCode}) dengan konsistensi ${topBuyer.consistencyScore}%. ` +
    `Z-Score ${input.zScore.toFixed(1)} menandakan volume di atas rata-rata.`;
}

function buildFallbackBearCase(input: NarrativeInput): string {
  const topSeller = input.topBrokers.find(b => b.netValue < 0);
  const risks: string[] = [];
  if (topSeller) risks.push(`Distribusi oleh ${topSeller.brokerCode} (-${Math.abs(Math.round(topSeller.netValue / 1e9))}B)`);
  if (input.rsi > 70) risks.push('RSI overbought (>70)');
  if (input.regime === 'downtrend') risks.push('Market regime masih downtrend');
  return risks.length > 0 ? risks.join('. ') + '.' : 'Perhatikan perubahan sentimen global.';
}

function buildFallbackKeyPoints(input: NarrativeInput): string[] {
  const points: string[] = [];
  const topBuyer = input.topBrokers.find(b => b.netValue > 0);
  if (topBuyer) points.push(`${topBuyer.identity}: ${topBuyer.brokerCode} +${Math.round(topBuyer.netLot / 1000)}K lot`);
  points.push(`Z-Score: ${input.zScore.toFixed(1)}${Math.abs(input.zScore) > 2 ? ' (Anomali)' : ''}`);
  points.push(`Regime: ${input.regime}, RSI: ${Math.round(input.rsi)}`);
  points.push(`UPS: ${input.ups.total}/100`);
  return points;
}

// ── Helpers ──────────────────────────────────────────────────
function extractKeyPoints(text: string): string[] {
  const lines = text.split('\n').filter(l => l.trim().startsWith('-') || l.trim().startsWith('•'));
  return lines.map(l => l.replace(/^[\s\-•]+/, '').trim()).filter(Boolean).slice(0, 5);
}

function extractSection(text: string, header: string): string {
  const regex = new RegExp(`${header}[:\\s]*(.+?)(?=\\n\\d\\.|$)`, 'is');
  const match = text.match(regex);
  return match ? match[1].trim() : '';
}

function determineConfidence(input: NarrativeInput): ConfidenceLevel {
  let score = 0;
  if (input.topBrokers.length >= 3) score++;
  if (Math.abs(input.zScore) > 1.5) score++;
  if (input.ups.total > 70 || input.ups.total < 30) score++;
  if (input.topBrokers.some(b => b.consistencyScore > 70)) score++;
  if (score >= 3) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}
