import { NextRequest, NextResponse } from 'next/server';
import { sendSignalAlert, sendCriticalAlert, sendDailySummary } from '@/lib/telegram';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    let success = false;

    switch (type) {
      case 'signal':
        success = await sendSignalAlert(data);
        break;
      case 'critical':
        success = await sendCriticalAlert(data);
        break;
      case 'daily_summary':
        success = await sendDailySummary(data);
        break;
      default:
        return NextResponse.json({ success: false, error: 'Invalid notification type' }, { status: 400 });
    }

    return NextResponse.json({ success, message: success ? 'Notification sent' : 'Failed to send' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Notification error' }, { status: 500 });
  }
}
