import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Stripe from 'stripe';

async function getOrCreateGateway(supabase: any, name: string): Promise<string> {
  const { data: existing } = await supabase
    .from('payment_gateways')
    .select('id')
    .eq('name', name)
    .single();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('payment_gateways')
    .insert({ name, active: true })
    .select('id')
    .single();

  if (error || !created) throw new Error(`Failed to create gateway: ${name}`);
  return created.id;
}

export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 503 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-15.clover',
  });

  try {
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

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, credits } = body;

    if (!amount || !credits) {
      return NextResponse.json({ error: 'Amount and credits are required' }, { status: 400 });
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 });
    }

    // Ensure gateway row exists
    const gatewayId = await getOrCreateGateway(supabase, 'stripe');

    // Create invoice
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
      console.error('Invoice creation error:', invoiceError);
      return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
    }

    await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoice.id,
        description: `${credits} Credits Package`,
        quantity: 1,
        unit_price: amount,
        total: amount,
      });

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: {
        userId: user.id,
        invoiceId: invoice.id,
        credits: String(credits),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    // Create payment record
    await supabase
      .from('payments')
      .insert({
        user_id: user.id,
        invoice_id: invoice.id,
        gateway_id: gatewayId,
        amount,
        currency: 'USD',
        status: 'pending',
        external_payment_id: paymentIntent.id,
        raw_response: { payment_intent_id: paymentIntent.id, credits },
      });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      invoiceId: invoice.id,
    });
  } catch (error) {
    console.error('Stripe payment intent error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
