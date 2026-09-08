import StripeService from './stripe';
import MidtransService from './midtrans';
import { createClient } from '@/utils/supabase/client';
import { creditService } from '@/lib/credit-service';

export interface PaymentGateway {
  type: 'stripe' | 'midtrans';
  name: string;
  logo: string;
  currencies: string[];
  features: string[];
}

export interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: {
    usd: number;
    idr: number;
  };
  popular?: boolean;
  features: string[];
}

export interface PaymentRequest {
  packageId: string;
  gateway: PaymentGateway['type'];
  userId: string;
  userEmail: string;
  userName: string;
  userPhone: string;
  paymentMethod?: string;
}

export interface PaymentResult {
  success: boolean;
  data?: any;
  error?: string;
  redirectUrl?: string;
  transactionId?: string;
}

// Default credit packages since credit_packages table doesn't exist in schema
const DEFAULT_CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter Package',
    description: 'Perfect for getting started',
    credits: 100,
    price: { usd: 9.99, idr: 150000 },
    features: ['100 AI credits', 'Basic support', 'Standard models'],
  },
  {
    id: 'professional',
    name: 'Professional Package',
    description: 'Best value for professionals',
    credits: 500,
    price: { usd: 29.99, idr: 450000 },
    popular: true,
    features: ['500 AI credits', 'Priority support', 'Advanced models', 'Team collaboration'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise Package',
    description: 'For large teams and organizations',
    credits: 2000,
    price: { usd: 99.99, idr: 1500000 },
    features: ['2000 AI credits', '24/7 support', 'All models', 'API access', 'Custom integrations'],
  },
];

export class UnifiedPaymentService {
  private supabase = createClient();

  /**
   * Get available payment gateways
   */
  static getAvailableGateways(): PaymentGateway[] {
    return [
      {
        type: 'stripe',
        name: 'Stripe',
        logo: '/icons/stripe.svg',
        currencies: ['USD', 'EUR', 'GBP'],
        features: ['credit_card', 'apple_pay', 'google_pay', 'bank_transfer'],
      },
      {
        type: 'midtrans',
        name: 'Midtrans',
        logo: '/icons/midtrans.svg',
        currencies: ['IDR'],
        features: ['credit_card', 'bank_transfer', 'echannel', 'retail_outlet'],
      },
    ];
  }

  /**
   * Get available credit packages
   * Uses default packages since credit_packages table is not in schema
   */
  static async getCreditPackages(): Promise<CreditPackage[]> {
    // Return default packages instead of querying non-existent table
    return DEFAULT_CREDIT_PACKAGES;
  }

  /**
   * Process payment request
   */
  static async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      // Validate request
      const validation = this.validatePaymentRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(', '),
        };
      }

      // Get package details
      const packages = await this.getCreditPackages();
      const pkg = packages.find(p => p.id === request.packageId);
      
      if (!pkg) {
        return {
          success: false,
          error: 'Package not found',
        };
      }

      // Process based on gateway
      if (request.gateway === 'stripe') {
        const amountInCents = Math.round(pkg.price.usd * 100);
        
        // Create customer if needed
        const customerResult = await StripeService.createCustomer({
          email: request.userEmail,
          name: request.userName,
          userId: request.userId,
        });

        if (!customerResult.success) {
          return {
            success: false,
            error: customerResult.error,
          };
        }

        // Create payment intent
        const result = await StripeService.createPaymentIntent({
          amount: amountInCents,
          currency: 'usd',
          customerId: customerResult.data.id,
          userId: request.userId,
          metadata: {
            packageId: request.packageId,
            credits: pkg.credits.toString(),
          },
        });

        if (result.success) {
          // Create payment record
          await this.createPaymentRecord({
            userId: request.userId,
            packageId: request.packageId,
            gateway: 'stripe',
            amount: pkg.price.usd,
            currency: 'USD',
            credits: pkg.credits,
            status: 'pending',
            transactionId: result.data.id,
          });
        }

        return {
          success: result.success,
          data: result.data,
          error: result.error,
          transactionId: result.data?.id,
        };
      } else if (request.gateway === 'midtrans') {
        const midtransService = new MidtransService();
        const result = await midtransService.createCreditTransaction({
          userId: request.userId,
          credits: pkg.credits,
          amount: pkg.price.idr,
          userEmail: request.userEmail,
          userName: request.userName,
          userPhone: request.userPhone,
        });

        if (result.success) {
          // Create payment record
          await this.createPaymentRecord({
            userId: request.userId,
            packageId: request.packageId,
            gateway: 'midtrans',
            amount: pkg.price.idr,
            currency: 'IDR',
            credits: pkg.credits,
            status: 'pending',
            transactionId: result.data.transaction_id,
          });
        }

        return {
          success: result.success,
          data: result.data,
          error: result.error,
          transactionId: result.data?.transaction_id,
          redirectUrl: result.data?.redirect_url,
        };
      }

      return {
        success: false,
        error: 'Unsupported payment gateway',
      };
    } catch (error) {
      console.error('Payment processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  }

  /**
   * Create payment record in database
   * Aligned with database schema: payments table
   */
  private static async createPaymentRecord(record: {
    userId: string;
    packageId: string;
    gateway: string;
    amount: number;
    currency: string;
    credits: number;
    status: string;
    transactionId: string;
  }) {
    const supabase = createClient();
    
    // First, get the gateway_id from payment_gateways table
    const { data: gatewayData } = await supabase
      .from('payment_gateways')
      .select('id')
      .eq('name', record.gateway)
      .single();
    
    const gatewayId = gatewayData?.id || record.gateway;
    
    // Create invoice first (required by schema)
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        user_id: record.userId,
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        subtotal: record.amount,
        status: 'draft',
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (invoiceError || !invoice) {
      console.error('Error creating invoice:', invoiceError);
      return;
    }

    // Create invoice item
    const { error: itemError } = await supabase
      .from('invoice_items')
      .insert({
        invoice_id: invoice.id,
        description: `${record.credits} Credits Package - ${record.packageId}`,
        quantity: 1,
        unit_price: record.amount,
        total: record.amount,
      });

    if (itemError) {
      console.error('Error creating invoice item:', itemError);
    }

    // Create payment record with correct schema columns
    const { error } = await supabase
      .from('payments')
      .insert({
        user_id: record.userId,
        invoice_id: invoice.id,
        gateway_id: gatewayId,
        amount: record.amount,
        currency: record.currency,
        status: record.status as any, // 'pending' | 'success' | 'failed' | 'refunded'
        external_payment_id: record.transactionId,
        raw_response: { package_id: record.packageId, credits: record.credits },
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error creating payment record:', error);
    }
  }

  /**
   * Update payment status and allocate credits
   */
  static async handlePaymentSuccess(
    transactionId: string,
    gateway: string,
    gatewayResponse?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      
      // Get payment record using external_payment_id
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('external_payment_id', transactionId)
        .single();

      if (!payment) {
        return {
          success: false,
          error: 'Payment record not found',
        };
      }

      if (payment.status === 'success') {
        return { success: true };
      }

      // Update payment status
      const { error: updateError } = await supabase
        .from('payments')
        .update({
          status: 'success',
          raw_response: gatewayResponse,
          paid_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (updateError) {
        console.error('Error updating payment:', updateError);
        return {
          success: false,
          error: 'Failed to update payment status',
        };
      }

      // Update invoice status to paid
      await supabase
        .from('invoices')
        .update({ status: 'paid' })
        .eq('id', payment.invoice_id);

      // Extract credits from raw_response or gatewayResponse
      const credits = gatewayResponse?.credits || 
                      payment.raw_response?.credits || 
                      this.estimateCreditsFromAmount(payment.amount, payment.currency);

      // Allocate credits
      const creditResult = await this.allocateCredits(
        payment.user_id,
        credits,
        payment.id
      );

      if (!creditResult.success) {
        // If credit allocation fails, mark payment as completed but credits failed
        await supabase
          .from('payments')
          .update({
            status: 'success',
            raw_response: { ...gatewayResponse, credit_allocation_failed: true },
          })
          .eq('id', payment.id);

        return {
          success: false,
          error: creditResult.error,
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error handling payment success:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment handling failed',
      };
    }
  }

  /**
   * Estimate credits from payment amount
   */
  private static estimateCreditsFromAmount(amount: number, currency: string): number {
    // Convert to USD if needed
    const amountInUSD = currency?.toLowerCase() === 'idr' 
      ? amount / 15000  // Approximate conversion
      : amount;
    
    // Estimate: $1 = 10 credits
    return Math.round(amountInUSD * 10);
  }

  /**
   * Handle payment failure
   */
  static async handlePaymentFailure(
    transactionId: string,
    gateway: string,
    errorMessage: string,
    gatewayResponse?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      
      // Update payment status using external_payment_id
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'failed',
          raw_response: { error: errorMessage, ...gatewayResponse },
        })
        .eq('external_payment_id', transactionId);

      if (error) {
        console.error('Error updating payment failure:', error);
        return {
          success: false,
          error: 'Failed to update payment status',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error handling payment failure:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failure handling failed',
      };
    }
  }

  /**
   * Allocate credits to user using the main credit service
   */
  private static async allocateCredits(
    userId: string,
    credits: number,
    paymentId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const success = await creditService.addUserCredits(
        userId,
        credits,
        'payment',
        paymentId,
        `Credits allocated from payment ${paymentId}`
      );

      if (!success) {
        return {
          success: false,
          error: 'Failed to allocate credits',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error allocating credits:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Credit allocation failed',
      };
    }
  }

  /**
   * Get user payment history
   */
  static async getUserPaymentHistory(userId: string): Promise<any[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          invoices!inner(id, status, period_start, period_end),
          payment_gateways!inner(id, name)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching payment history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserPaymentHistory:', error);
      return [];
    }
  }

  /**
   * Validate payment request
   */
  private static validatePaymentRequest(request: PaymentRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!request.packageId) {
      errors.push('Package ID is required');
    }

    if (!request.userId) {
      errors.push('User ID is required');
    }

    if (!request.userEmail) {
      errors.push('User email is required');
    }

    if (!request.userName || request.userName.trim().length < 2) {
      errors.push('Valid user name is required');
    }

    if (!request.gateway || !['stripe', 'midtrans'].includes(request.gateway)) {
      errors.push('Valid payment gateway is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate total price with fees
   */
  static calculateTotalWithFees(
    baseAmount: number,
    gateway: string,
    currency: string
  ): { total: number; fees: number } {
    let fees = 0;

    if (gateway === 'stripe') {
      fees = StripeService.calculateIndonesianFees(baseAmount);
    } else if (gateway === 'midtrans') {
      fees = baseAmount <= 100000 ? 2500 : baseAmount <= 500000 ? 5000 : 10000;
    }

    return {
      total: baseAmount + fees,
      fees,
    };
  }
}

export default UnifiedPaymentService;