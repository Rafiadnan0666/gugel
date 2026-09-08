import { NextResponse } from 'next/server';

export async function GET() {
  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  const clientKey = process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '';
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

  const result: any = {
    env: {
      MIDTRANS_SERVER_KEY: serverKey ? `Set (${serverKey.substring(0, 6)}...)` : 'NOT SET',
      MIDTRANS_CLIENT_KEY: clientKey ? `Set (${clientKey.substring(0, 6)}...)` : 'NOT SET',
      MIDTRANS_IS_PRODUCTION: isProduction ? 'true' : 'false',
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
      GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
  };

  // Test Midtrans connection
  if (serverKey) {
    try {
      const baseUrl = isProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
      const testRes = await fetch(`${baseUrl}/snap/v1/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(serverKey + ':').toString('base64')}`,
        },
        body: JSON.stringify({
          transaction_details: { order_id: `TEST-${Date.now()}`, gross_amount: 10000 },
        }),
      });
      const testData = await testRes.json();
      result.midtrans_test = {
        status: testRes.ok ? 'OK' : 'ERROR',
        has_token: !!testData.token,
        error: testData.error_code ? (testData.error_messages?.join(', ') || testData.error_code) : null,
      };
    } catch (err) {
      result.midtrans_test = { status: 'ERROR', error: err instanceof Error ? err.message : 'Unknown' };
    }
  } else {
    result.midtrans_test = { status: 'SKIPPED', error: 'No server key' };
  }

  return NextResponse.json(result);
}
