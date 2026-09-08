import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-08-01' as any,
  typescript: true,
});

export interface CreatePaymentIntentParams {
  amount: number; // in cents
  currency?: string;
  customerId?: string;
  userId: string;
  metadata?: Record<string, string>;
}

export interface CreateCustomerParams {
  email: string;
  name?: string;
  userId: string;
  metadata?: Record<string, string>;
}

export class StripeService {
  /**
   * Create a payment intent for credit purchase
   */
  static async createPaymentIntent(params: CreatePaymentIntentParams) {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency || 'usd',
        customer: params.customerId,
        metadata: {
          userId: params.userId,
          type: 'credit_purchase',
          ...params.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never',
        },
        payment_method_types: [
          'card',
          'us_bank_account',
          'link',
        ],
      });

      return { success: true, data: paymentIntent };
    } catch (error) {
      console.error('Stripe Payment Intent Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create a customer
   */
  static async createCustomer(params: CreateCustomerParams) {
    try {
      const customer = await stripe.customers.create({
        email: params.email,
        name: params.name,
        metadata: {
          userId: params.userId,
          ...params.metadata,
        },
      });

      return { success: true, data: customer };
    } catch (error) {
      console.error('Stripe Customer Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Retrieve a payment intent
   */
  static async retrievePaymentIntent(paymentIntentId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return { success: true, data: paymentIntent };
    } catch (error) {
      console.error('Stripe Retrieve Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Verify webhook signature
   */
  static verifyWebhookSignature(
    payload: string, 
    signature: string, 
    secret: string = process.env.STRIPE_WEBHOOK_SECRET!
  ) {
    try {
      const event = stripe.webhooks.constructEvent(
        payload, 
        signature, 
        secret
      );
      return { success: true, event };
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Invalid signature' 
      };
    }
  }

  /**
   * Create a setup intent for saving payment methods
   */
  static async createSetupIntent(customerId: string) {
    try {
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      return { success: true, data: setupIntent };
    } catch (error) {
      console.error('Stripe Setup Intent Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Attach payment method to customer
   */
  static async attachPaymentMethod(paymentMethodId: string, customerId: string) {
    try {
      const paymentMethod = await stripe.paymentMethods.attach(
        paymentMethodId, 
        { customer: customerId }
      );

      return { success: true, data: paymentMethod };
    } catch (error) {
      console.error('Stripe Attach Payment Method Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create a product for credits
   */
  static async createCreditPackage(params: {
    name: string;
    description: string;
    credits: number;
    price: number; // in cents
    currency?: string;
  }) {
    try {
      const product = await stripe.products.create({
        name: params.name,
        description: params.description,
        metadata: {
          credits: params.credits.toString(),
          type: 'credit_package',
        },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: params.price,
        currency: params.currency || 'usd',
        recurring: {
          interval: 'month',
        },
      });

      return { success: true, data: { product, price } };
    } catch (error) {
      console.error('Stripe Product Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Create subscription for recurring credit packages
   */
  static async createSubscription(params: {
    customerId: string;
    priceId: string;
    userId: string;
    metadata?: Record<string, string>;
  }) {
    try {
      const subscription = await stripe.subscriptions.create({
        customer: params.customerId,
        items: [{ price: params.priceId }],
        metadata: {
          userId: params.userId,
          type: 'credit_subscription',
          ...params.metadata,
        },
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      return { success: true, data: subscription };
    } catch (error) {
      console.error('Stripe Subscription Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Cancel subscription
   */
  static async cancelSubscription(subscriptionId: string) {
    try {
      const subscription = await stripe.subscriptions.cancel(subscriptionId);
      return { success: true, data: subscription };
    } catch (error) {
      console.error('Stripe Cancel Subscription Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Refund payment
   */
  static async refundPayment(params: {
    paymentIntentId: string;
    amount?: number; // in cents
    reason?: string;
  }) {
    try {
      const refund = await stripe.refunds.create({
        payment_intent: params.paymentIntentId,
        amount: params.amount,
        reason: params.reason as any,
      });

      return { success: true, data: refund };
    } catch (error) {
      console.error('Stripe Refund Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get customer payment methods
   */
  static async getCustomerPaymentMethods(customerId: string) {
    try {
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return { success: true, data: paymentMethods.data };
    } catch (error) {
      console.error('Stripe Get Payment Methods Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Calculate fees for Indonesian market
   */
  static calculateIndonesianFees(amount: number): number {
    // Stripe fees for Indonesian transactions
    const stripeFee = Math.round(amount * 0.029 + 2500); // 2.9% + 25 cents
    const taxFee = Math.round(stripeFee * 0.11); // 11% VAT
    return stripeFee + taxFee;
  }

  /**
   * Convert IDR to USD (simplified, should use real exchange rate API)
   */
  static convertIDRToUSD(idrAmount: number): number {
    // Approximate exchange rate (should use real-time API)
    const exchangeRate = 0.000064; // 1 IDR = 0.000064 USD
    return Math.round(idrAmount * exchangeRate);
  }

  /**
   * Convert USD to IDR
   */
  static convertUSDToIDR(usdAmount: number): number {
    // Approximate exchange rate (should use real-time API)
    const exchangeRate = 15625; // 1 USD = 15,625 IDR
    return Math.round(usdAmount * exchangeRate);
  }
}

export default StripeService;