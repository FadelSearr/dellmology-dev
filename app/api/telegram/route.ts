import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { emiten, price, ups, summary, signal, atr, stopLoss, takeProfit } = body;

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json(
        { success: false, error: 'Telegram credentials missing in environment variables.' },
        { status: 500 }
      );
    }

    const signalEmoji = signal === 'buy' || signal === 'strong_buy' ? '🟢' : signal === 'sell' || signal === 'strong_sell' ? '🔴' : '⚪';

    const message = `
*Dellmology Pro Alert* ⚡
*${emiten}* @ Rp ${price.toLocaleString()}

*UPS Score:* ${ups} ${signalEmoji}
*Action:* ${signal.replace('_', ' ').toUpperCase()}

*Risk Management:*
- ATR: Rp ${atr}
- Stop Loss: Rp ${Math.round(stopLoss).toLocaleString()}
- Take Profit: Rp ${Math.round(takeProfit).toLocaleString()}

*AI Narrative:*
_${summary.replace(/\*\*/g, '')}_

_Dispatched from Dellmology Command Center_
    `.trim();

    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.description || 'Failed to send message');
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
