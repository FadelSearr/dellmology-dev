import { NextResponse } from 'next/server';
import { getTokenStatus } from '@/lib/supabase';

export async function GET() {
  try {
    const status = await getTokenStatus();
    return NextResponse.json({ success: true, data: status });
  } catch (error) {
    console.error('Token Status Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to get token status' }, { status: 500 });
  }
}
