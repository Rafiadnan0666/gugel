import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import MidtransService from '@/lib/payments/midtrans';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { order_id, status_code, gross_amount, signature_key, transaction_status } = body;

    if (!order_id || !status_code || !gross_amount) {
      return NextResponse.json({ error: 'Invalid webhook data' }, { status: 400 });
    }

    // Verify signature if present
    if (signature_key) {
      const expectedSignature = MidtransService.generateSignature(
        order_id,
        status_code,
        gross_amount.toString(),
        process.env.MIDTRANS_SERVER_KEY!
      );
      if (signature_key !== expectedSignature) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const supabase = await createSupabaseServerClient();

    // Get payment record using external_payment_id
    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('*, invoices(id, status)')
      .eq('external_payment_id', order_id)
      .single();

    if (!paymentRecord) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 });
    }

    // Handle different transaction statuses
    if (transaction_status === 'capture' || transaction_status === 'settlement') {
      await handlePaymentSuccess(supabase, paymentRecord, body);
    } else if (transaction_status === 'pending') {
      // Payment is pending, no action needed
      console.log(`Payment ${order_id} is pending`);
    } else if (transaction_status === 'deny' || transaction_status === 'cancel') {
      await handlePaymentFailure(supabase, paymentRecord, body, 'failed');
    } else if (transaction_status === 'expire') {
      await handlePaymentFailure(supabase, paymentRecord, body, 'failed');
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Midtrans webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handlePaymentSuccess(supabase: any, paymentRecord: any, webhookData: any) {
  if (paymentRecord.status === 'success') return;

  // Update payment status
  await supabase
    .from('payments')
    .update({
      status: 'success',
      raw_response: webhookData,
      paid_at: new Date().toISOString(),
    })
    .eq('id', paymentRecord.id);

  // Update invoice status
  if (paymentRecord.invoice_id) {
    await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', paymentRecord.invoice_id);
  }

  // Get credits from raw_response
  const credits = paymentRecord.raw_response?.credits || 0;
  if (credits > 0) {
    const userId = paymentRecord.user_id;

    // Get current balance
    const { data: currentCredits } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    const currentBalance = currentCredits?.balance || 0;
    const newBalance = currentBalance + credits;

    // Update balance
    await supabase
      .from('user_credits')
      .upsert({
        user_id: userId,
        balance: newBalance,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    // Create ledger entry
    await supabase
      .from('credit_ledger')
      .insert({
        user_id: userId,
        source: 'payment',
        reference_id: paymentRecord.id,
        amount: credits,
        balance_after: newBalance,
      });

    console.log(`Credits allocated: ${credits} to user ${userId}`);
  }
}

async function handlePaymentFailure(supabase: any, paymentRecord: any, webhookData: any, status: string) {
  await supabase
    .from('payments')
    .update({
      status,
      raw_response: webhookData,
    })
    .eq('id', paymentRecord.id);
}
