import { createClient } from '@/utils/supabase/client';
import type { 
  Payment, 
  Invoice, 
  InvoiceItem, 
  UserCredit, 
  CreditLedger, 
  PaymentGateway,
  PaymentCustomer 
} from '@/types/main.db';

export interface BillingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  credits: number;
  tokenLimit: number;
  features: string[];
  popular?: boolean;
  interval: 'monthly' | 'yearly';
}

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  clientSecret?: string;
  gateway: 'stripe' | 'midtrans';
  paymentUrl?: string;
  expiresAt: Date;
}

export interface InvoiceData extends Invoice {
  items: InvoiceItem[];
  payment?: Payment;
}

export class BillingService {
  private supabase = createClient();

  private readonly PLANS: BillingPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      description: 'Perfect for individual researchers',
      price: 9.99,
      currency: 'USD',
      credits: 100,
      tokenLimit: 50000,
      features: [
        '50,000 AI tokens per month',
        'Basic research tools',
        'Email support',
        'Export to PDF'
      ],
      interval: 'monthly'
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'For serious research projects',
      price: 29.99,
      currency: 'USD',
      credits: 500,
      tokenLimit: 200000,
      features: [
        '200,000 AI tokens per month',
        'Advanced AI models',
        'Priority support',
        'Team collaboration',
        'Custom exports',
        'Plagiarism checking'
      ],
      popular: true,
      interval: 'monthly'
    },
    {
      id: 'team',
      name: 'Team',
      description: 'For research teams and organizations',
      price: 99.99,
      currency: 'USD',
      credits: 2000,
      tokenLimit: 1000000,
      features: [
        '1,000,000 AI tokens per month',
        'Unlimited team members',
        'Advanced analytics',
        'API access',
        'Custom integrations',
        'Dedicated support'
      ],
      interval: 'monthly'
    }
  ];

  /**
   * Get available billing plans
   */
  getPlans(): BillingPlan[] {
    return this.PLANS;
  }

  /**
   * Get user's current billing info
   */
  async getUserBillingInfo(userId: string): Promise<{
    creditBalance: number;
    activeSubscription: any;
    recentInvoices: InvoiceData[];
    paymentMethods: PaymentGateway[];
  }> {
    try {
      const [creditResult, invoicesResult, gatewaysResult] = await Promise.all([
        this.supabase
          .from('user_credits')
          .select('balance')
          .eq('user_id', userId)
          .single(),
        this.supabase
          .from('invoices')
          .select(`
            *,
            invoice_items(*),
            payments(*)
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
        this.supabase
          .from('payment_gateways')
          .select('*')
          .eq('active', true)
      ]);

      const creditBalance = creditResult.data?.balance || 0;
      const recentInvoices = invoicesResult.data || [];
      const paymentMethods = gatewaysResult.data || [];

      return {
        creditBalance,
        activeSubscription: null, // TODO: Implement subscription logic
        recentInvoices,
        paymentMethods
      };
    } catch (error) {
      console.error('Error fetching billing info:', error);
      return {
        creditBalance: 0,
        activeSubscription: null,
        recentInvoices: [],
        paymentMethods: []
      };
    }
  }

  /**
   * Create payment intent for credits or plan
   */
  async createPaymentIntent(
    userId: string,
    planId: string,
    gateway: 'stripe' | 'midtrans' = 'stripe'
  ): Promise<PaymentIntent> {
    try {
      const plan = this.PLANS.find(p => p.id === planId);
      if (!plan) {
        throw new Error('Invalid plan selected');
      }

      const orderId = `order_${Date.now()}_${userId.slice(0, 8)}`;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

      if (gateway === 'stripe') {
        return await this.createStripePaymentIntent(userId, plan, orderId, expiresAt);
      } else if (gateway === 'midtrans') {
        return await this.createMidtransPayment(userId, plan, orderId, expiresAt);
      } else {
        throw new Error('Unsupported payment gateway');
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw error;
    }
  }

  /**
   * Create Stripe payment intent
   */
  private async createStripePaymentIntent(
    userId: string,
    plan: BillingPlan,
    orderId: string,
    expiresAt: Date
  ): Promise<PaymentIntent> {
    try {
      // Create invoice first
      const { data: invoice } = await this.supabase
        .from('invoices')
        .insert({
          user_id: userId,
          period_start: new Date().toISOString(),
          period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          subtotal: plan.price,
          status: 'draft',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!invoice) {
        throw new Error('Failed to create invoice');
      }

      // Add invoice item
      await this.supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          description: `${plan.name} Plan - ${plan.interval}`,
          quantity: 1,
          unit_price: plan.price,
          total: plan.price
        });

      // Create Stripe payment intent
      const baseUrl = process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_APP_URL || 'https://yourdomain.com'
        : 'http://localhost:3000';
      
      const stripeResponse = await fetch(`${baseUrl}/api/payments/stripe/create-intent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: Math.round(plan.price * 100), // Stripe uses cents
          currency: plan.currency.toLowerCase(),
          invoiceId: invoice.id,
          userId
        })
      });

      if (!stripeResponse.ok) {
        throw new Error('Failed to create Stripe payment intent');
      }

      const stripeData = await stripeResponse.json();

      // Create payment record
      await this.supabase
        .from('payments')
        .insert({
          user_id: userId,
          invoice_id: invoice.id,
          gateway_id: 'stripe',
          amount: plan.price,
          currency: plan.currency,
          status: 'pending',
          external_payment_id: stripeData.paymentIntentId,
          created_at: new Date().toISOString()
        });

      return {
        id: stripeData.paymentIntentId,
        amount: plan.price,
        currency: plan.currency,
        clientSecret: stripeData.clientSecret,
        gateway: 'stripe',
        expiresAt
      };
    } catch (error) {
      console.error('Error creating Stripe payment:', error);
      throw error;
    }
  }

  /**
   * Create Midtrans payment
   */
  private async createMidtransPayment(
    userId: string,
    plan: BillingPlan,
    orderId: string,
    expiresAt: Date
  ): Promise<PaymentIntent> {
    try {
      // Create invoice first (same as Stripe)
      const { data: invoice } = await this.supabase
        .from('invoices')
        .insert({
          user_id: userId,
          period_start: new Date().toISOString(),
          period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          subtotal: plan.price,
          status: 'draft',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (!invoice) {
        throw new Error('Failed to create invoice');
      }

      await this.supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          description: `${plan.name} Plan - ${plan.interval}`,
          quantity: 1,
          unit_price: plan.price,
          total: plan.price
        });

      // Create Midtrans transaction
      const midtransResponse = await fetch('/api/payments/midtrans/create-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          amount: plan.price,
          planName: plan.name,
          userId,
          invoiceId: invoice.id
        })
      });

      if (!midtransResponse.ok) {
        throw new Error('Failed to create Midtrans transaction');
      }

      const midtransData = await midtransResponse.json();

      // Create payment record
      await this.supabase
        .from('payments')
        .insert({
          user_id: userId,
          invoice_id: invoice.id,
          gateway_id: 'midtrans',
          amount: plan.price,
          currency: plan.currency,
          status: 'pending',
          external_payment_id: midtransData.transactionId,
          raw_response: midtransData,
          created_at: new Date().toISOString()
        });

      return {
        id: orderId,
        amount: plan.price,
        currency: plan.currency,
        gateway: 'midtrans',
        paymentUrl: midtransData.paymentUrl,
        expiresAt
      };
    } catch (error) {
      console.error('Error creating Midtrans payment:', error);
      throw error;
    }
  }

  /**
   * Process successful payment and add credits
   */
  async processSuccessfulPayment(paymentData: {
    paymentId: string;
    invoiceId: string;
    userId: string;
    amount: number;
    gateway: 'stripe' | 'midtrans';
    transactionId: string;
  }): Promise<void> {
    try {
      // Update payment status
      await this.supabase
        .from('payments')
        .update({
          status: 'success',
          paid_at: new Date().toISOString()
        })
        .eq('id', paymentData.paymentId);

      // Update invoice status
      await this.supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', paymentData.invoiceId);

      // Get invoice details to determine credits
      const { data: invoice } = await this.supabase
        .from('invoices')
        .select(`
          *,
          invoice_items!inner(description)
        `)
        .eq('id', paymentData.invoiceId)
        .single();

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Determine credits based on plan
      let creditsToAdd = 0;
      let tokenLimit = 0;

      for (const item of invoice.invoice_items) {
        const description = item.description.toLowerCase();
        if (description.includes('starter')) {
          creditsToAdd = 100;
          tokenLimit = 50000;
        } else if (description.includes('professional')) {
          creditsToAdd = 500;
          tokenLimit = 200000;
        } else if (description.includes('team')) {
          creditsToAdd = 2000;
          tokenLimit = 1000000;
        }
      }

      // Add credits to user account
      const { usageTracking } = await import('@/lib/usage-tracking');
      await usageTracking.addCredits(
        paymentData.userId,
        creditsToAdd,
        'payment',
        paymentData.invoiceId
      );

      // Update user's token limit if needed
      // This would involve updating their role or quota
      console.log(`Added ${creditsToAdd} credits to user ${paymentData.userId}`);
    } catch (error) {
      console.error('Error processing successful payment:', error);
      throw error;
    }
  }

  /**
   * Get invoice details
   */
  async getInvoiceDetails(invoiceId: string, userId: string): Promise<InvoiceData | null> {
    try {
      const { data } = await this.supabase
        .from('invoices')
        .select(`
          *,
          invoice_items(*),
          payments(*)
        `)
        .eq('id', invoiceId)
        .eq('user_id', userId)
        .single();

      return data;
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      return null;
    }
  }

  /**
   * Get user's payment history
   */
  async getPaymentHistory(userId: string, limit: number = 20): Promise<Payment[]> {
    try {
      const { data } = await this.supabase
        .from('payments')
        .select(`
          *,
          invoices!inner(status, period_start, period_end),
          payment_gateways!inner(name, display_name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error('Error fetching payment history:', error);
      return [];
    }
  }

  /**
   * Cancel subscription (if applicable)
   */
  async cancelSubscription(userId: string): Promise<void> {
    // Implementation would depend on subscription model
    throw new Error('Subscription cancellation not yet implemented');
  }

  /**
   * Refund payment
   */
  async refundPayment(paymentId: string, userId: string, amount?: number): Promise<void> {
    try {
      const { data: payment } = await this.supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .eq('user_id', userId)
        .single();

      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'success') {
        throw new Error('Cannot refund non-successful payment');
      }

      // Process refund through gateway
      if (payment.gateway_id === 'stripe') {
        await this.processStripeRefund(payment, amount);
      } else if (payment.gateway_id === 'midtrans') {
        await this.processMidtransRefund(payment, amount);
      }

      // Update payment status
      await this.supabase
        .from('payments')
        .update({ status: 'refunded' })
        .eq('id', paymentId);

      // Deduct credits (full refund)
      const refundAmount = amount || payment.amount;
      const { usageTracking } = await import('@/lib/usage-tracking');
      await usageTracking.addCredits(
        userId,
        -refundAmount * 100, // Estimate credits per dollar
        'refund',
        paymentId
      );
    } catch (error) {
      console.error('Error refunding payment:', error);
      throw error;
    }
  }

  /**
   * Process Stripe refund
   */
  private async processStripeRefund(payment: Payment, amount?: number): Promise<void> {
    const response = await fetch('/api/payments/stripe/refund', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId: payment.external_payment_id,
        amount: amount ? Math.round(amount * 100) : undefined
      })
    });

    if (!response.ok) {
      throw new Error('Failed to process Stripe refund');
    }
  }

  /**
   * Process Midtrans refund
   */
  private async processMidtransRefund(payment: Payment, amount?: number): Promise<void> {
    // Midtrans refund implementation
    throw new Error('Midtrans refund not yet implemented');
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoicePDF(invoiceId: string, userId: string): Promise<string> {
    try {
      const invoiceData = await this.getInvoiceDetails(invoiceId, userId);
      if (!invoiceData) {
        throw new Error('Invoice not found');
      }

      // Use existing PDF generation service
      const pdfContent = this.generateInvoiceContent(invoiceData);
      // For now, return a mock URL (implement PDF generation later)
      console.log('Generating PDF with content:', pdfContent);

      // Upload to Supabase storage or return buffer
      // For now, return a mock URL
      return `/invoices/${invoiceId}.pdf`;
    } catch (error) {
      console.error('Error generating invoice PDF:', error);
      throw error;
    }
  }

  /**
   * Generate invoice content for PDF
   */
  private generateInvoiceContent(invoice: InvoiceData): string {
    return `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1>Invoice #${invoice.id.slice(0, 8).toUpperCase()}</h1>
        <p>Date: ${new Date(invoice.created_at).toLocaleDateString()}</p>
        <p>Status: ${invoice.status}</p>
        <h2>Items:</h2>
        ${invoice.items.map(item => `
          <div style="margin: 10px 0;">
            <p>${item.description}</p>
            <p>Quantity: ${item.quantity} x $${item.unit_price}</p>
            <p>Total: $${item.total}</p>
          </div>
        `).join('')}
        <h3>Total: $${invoice.subtotal}</h3>
      </div>
    `;
  }
}

// Create singleton instance
export const billingService = new BillingService();