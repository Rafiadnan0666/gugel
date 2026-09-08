import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover',
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const sig = request.headers.get('stripe-signature');

    if (!sig) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const { userId, invoiceId, credits } = paymentIntent.metadata;

        if (userId) {
          // Update payment record
          const { data: payment } = await supabase
            .from('payments')
            .select('*, invoices(id)')
            .eq('external_payment_id', paymentIntent.id)
            .single();

          if (payment && payment.status !== 'success') {
            // Update payment status
            await supabase
              .from('payments')
              .update({
                status: 'success',
                raw_response: { stripe_payment_intent: paymentIntent.id, ...paymentIntent.metadata },
                paid_at: new Date().toISOString(),
              })
              .eq('id', payment.id);

            // Update invoice status
            if (payment.invoice_id) {
              await supabase
                .from('invoices')
                .update({ status: 'paid' })
                .eq('id', payment.invoice_id);
            }

            // Allocate credits
            const creditAmount = parseInt(credits || '0');
            if (creditAmount > 0) {
              const { data: currentCredits } = await supabase
                .from('user_credits')
                .select('balance')
                .eq('user_id', userId)
                .single();

              const currentBalance = currentCredits?.balance || 0;
              const newBalance = currentBalance + creditAmount;

              await supabase
                .from('user_credits')
                .upsert({
                  user_id: userId,
                  balance: newBalance,
                  updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });

              await supabase
                .from('credit_ledger')
                .insert({
                  user_id: userId,
                  source: 'payment',
                  reference_id: payment.id,
                  amount: creditAmount,
                  balance_after: newBalance,
                });

              console.log(`Payment succeeded for user ${userId}, credits added: ${creditAmount}`);
            }
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await supabase
          .from('payments')
          .update({
            status: 'failed',
            raw_response: { error: paymentIntent.last_payment_error?.message },
          })
          .eq('external_payment_id', paymentIntent.id);

        console.log(`Payment failed: ${paymentIntent.id}`);
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        console.log(`Charge disputed: ${dispute.charge}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
