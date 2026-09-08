import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, credits, paymentType, bank } = body;

    if (!amount || !credits) {
      return NextResponse.json({ error: 'Missing required fields: amount, credits' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check Midtrans server key
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      console.error('[Payment] MIDTRANS_SERVER_KEY is not set');
      return NextResponse.json({ error: 'Payment gateway not configured. Contact admin.' }, { status: 500 });
    }

    const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
    const baseUrl = isProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com';
    const orderId = `CRED-${user.id.substring(0, 8)}-${Date.now()}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Build Snap API request
    const snapPayload: any = {
      transaction_details: {
        order_id: orderId,
        gross_amount: amount,
      },
      item_details: [{
        id: orderId,
        price: amount,
        quantity: 1,
        name: `${credits} Credits Purchase`,
      }],
      customer_details: {
        first_name: profile.full_name?.split(' ')[0] || 'User',
        last_name: profile.full_name?.split(' ').slice(1).join(' ') || '-',
        email: profile.email || 'user@example.com',
        phone: '081234567890',
      },
      callbacks: {
        finish: `${appUrl}/credits`,
        unfinish: `${appUrl}/credits`,
        error: `${appUrl}/credits`,
      },
    };

    console.log('[Payment] Creating Midtrans transaction:', { orderId, amount, credits, baseUrl });

    const midtransResponse = await fetch(`${baseUrl}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(serverKey + ':').toString('base64')}`,
      },
      body: JSON.stringify(snapPayload),
    });

    const midtransData = await midtransResponse.json();
    console.log('[Payment] Midtrans response:', JSON.stringify(midtransData).substring(0, 500));

    if (midtransData.error_code) {
      const errorMsg = midtransData.error_messages?.join(', ') || midtransData.error_message || midtransData.error_code;
      console.error('[Payment] Midtrans API error:', errorMsg);
      return NextResponse.json({ error: `Payment gateway error: ${errorMsg}` }, { status: 400 });
    }

    if (!midtransData.token) {
      console.error('[Payment] No token in Midtrans response:', midtransData);
      return NextResponse.json({ error: 'No payment token received from gateway' }, { status: 500 });
    }

    // Ensure gateway row exists
    let gatewayId: string | null = null;
    const { data: gw } = await supabase.from('payment_gateways').select('id').eq('name', 'midtrans').single();
    if (gw) {
      gatewayId = gw.id;
    } else {
      const { data: newGw } = await supabase.from('payment_gateways').insert({ name: 'midtrans', active: true }).select('id').single();
      gatewayId = newGw?.id || null;
    }

    // Create invoice
    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert({
        user_id: user.id,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        subtotal: amount,
        status: 'draft',
      })
      .select()
      .single();

    if (invErr || !invoice) {
      console.error('[Payment] Invoice creation error:', invErr);
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    await supabase.from('invoice_items').insert({
      invoice_id: invoice.id,
      description: `${credits} Credits Package`,
      quantity: 1,
      unit_price: amount,
      total: amount,
    });

    // Create payment record
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        invoice_id: invoice.id,
        gateway_id: gatewayId,
        amount,
        currency: 'IDR',
        status: 'pending',
        external_payment_id: orderId,
        raw_response: { token: midtransData.token, credits, order_id: orderId },
      })
      .select()
      .single();

    if (payErr) {
      console.error('[Payment] Payment record error:', payErr);
      return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 });
    }

    console.log('[Payment] Success:', { orderId, token: midtransData.token?.substring(0, 20) + '...' });

    return NextResponse.json({
      success: true,
      snapToken: midtransData.token,
      paymentUrl: midtransData.redirect_url,
      transactionId: orderId,
      paymentId: payment.id,
    });

  } catch (error) {
    console.error('[Payment] Unexpected error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}
