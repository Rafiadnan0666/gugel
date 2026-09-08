import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import MidtransService from '@/lib/payments/midtrans';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, credits, paymentType } = body;

    if (!amount || !credits) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const midtransService = new MidtransService();
    let result;

    if (paymentType === 'bank_transfer') {
      result = await midtransService.createBankTransfer({
        userId: user.id,
        credits,
        amount,
        userEmail: profile.email || '',
        userName: profile.full_name || 'User',
        bank: body.bank || 'bca',
      });
    } else {
      result = await midtransService.createCreditTransaction({
        userId: user.id,
        credits,
        amount,
        userEmail: profile.email || '',
        userName: profile.full_name || 'User',
        userPhone: body.userPhone || '0812345678',
      });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Get the Midtrans gateway ID from payment_gateways table
    const { data: gatewayData } = await supabase
      .from('payment_gateways')
      .select('id')
      .eq('name', 'midtrans')
      .single();

    // Create invoice first (required by schema)
    const { data: invoice, error: invoiceError } = await supabase
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

    if (invoiceError || !invoice) {
      console.error('Error creating invoice:', invoiceError);
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    // Create invoice item
    await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoice.id,
        description: `${credits} Credits Package`,
        quantity: 1,
        unit_price: amount,
        total: amount,
      });

    // Create payment record with correct schema columns
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        invoice_id: invoice.id,
        gateway_id: gatewayData?.id || 'midtrans',
        amount,
        currency: 'IDR',
        status: 'pending',
        external_payment_id: result.data?.transaction_id,
        raw_response: { ...result.data, credits },
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error('Error creating payment record:', paymentError);
      return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      snapToken: result.data?.token,
      redirectUrl: result.data?.redirect_url,
      transactionId: result.data?.transaction_id,
      paymentId: payment.id,
    });

  } catch (error) {
    console.error('Midtrans payment creation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Payment creation failed'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      paymentMethods: [
        { type: 'credit_card', name: 'Credit Card', description: 'VISA, Mastercard, JCB' },
        { type: 'bank_transfer', name: 'Bank Transfer', description: 'BCA, Mandiri, BNI, BRI' },
        { type: 'echannel', name: 'E-wallet', description: 'GoPay, OVO, Dana, ShopeePay' },
      ],
    },
  });
}
