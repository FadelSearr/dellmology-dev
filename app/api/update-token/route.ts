import { NextRequest, NextResponse } from 'next/server';
import { upsertSession } from '@/lib/supabase';

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  try {
    const { token, expires_at } = await request.json();
    if (!token) {
      return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400, headers: corsHeaders });
    }

    let expiresAtDate: Date | undefined;
    if (expires_at) {
      expiresAtDate = typeof expires_at === 'number' ? new Date(expires_at * 1000) : new Date(expires_at);
    }

    await upsertSession('stockbit_token', token, expiresAtDate);

    return NextResponse.json({ success: true, message: 'Token updated', expires_at: expiresAtDate }, { headers: corsHeaders });
  } catch (error) {
    console.error('Update Token Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to update token' }, { status: 500, headers: corsHeaders });
  }
}
