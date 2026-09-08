import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { billingService } from '@/lib/billing';

export async function GET(request: Request) {
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

    const billingInfo = await billingService.getUserBillingInfo(user.id);
    return NextResponse.json(billingInfo);
  } catch (error) {
    console.error('Error fetching billing info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch billing info' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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
    const { action, ...params } = body;

    switch (action) {
      case 'create_payment_intent':
        const { planId, gateway = 'stripe' } = params;
        const paymentIntent = await billingService.createPaymentIntent(
          user.id,
          planId,
          gateway
        );
        return NextResponse.json(paymentIntent);

      case 'process_successful_payment':
        await billingService.processSuccessfulPayment({
          ...params,
          userId: user.id
        });
        return NextResponse.json({ success: true });

      case 'get_invoice':
        const { invoiceId } = params;
        const invoice = await billingService.getInvoiceDetails(invoiceId, user.id);
        return NextResponse.json(invoice);

      case 'get_payment_history':
        const { limit = 20 } = params;
        const paymentHistory = await billingService.getPaymentHistory(user.id, limit);
        return NextResponse.json(paymentHistory);

      case 'refund_payment':
        const { paymentId, amount } = params;
        await billingService.refundPayment(paymentId, user.id, amount);
        return NextResponse.json({ success: true });

      case 'generate_invoice_pdf':
        const { invoiceId: pdfInvoiceId } = params;
        const pdfUrl = await billingService.generateInvoicePDF(pdfInvoiceId, user.id);
        return NextResponse.json({ pdfUrl });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error processing billing request:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}