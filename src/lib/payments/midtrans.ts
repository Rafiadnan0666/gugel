import crypto from 'crypto';

export class MidtransService {
  private serverKey: string;
  private isProduction: boolean;

  constructor() {
    this.serverKey = process.env.MIDTRANS_SERVER_KEY || '';
    this.isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';

    if (!this.serverKey) {
      console.error('[Midtrans] MIDTRANS_SERVER_KEY is not set in environment variables');
    }
  }

  private getBaseUrl(): string {
    return this.isProduction
      ? 'https://app.midtrans.com'
      : 'https://app.sandbox.midtrans.com';
  }

  private getSnapApiUrl(): string {
    return `${this.getBaseUrl()}/snap/v1`;
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(this.serverKey + ':').toString('base64')}`;
  }

  async createCreditTransaction(params: {
    userId: string;
    credits: number;
    amount: number;
    userEmail: string;
    userName: string;
    userPhone: string;
  }) {
    if (!this.serverKey) {
      return { success: false, error: 'MIDTRANS_SERVER_KEY not configured. Add it to .env.local' };
    }

    try {
      const orderId = `CRED-${params.userId.substring(0, 8)}-${Date.now()}`;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      const transactionParams = {
        transaction_details: {
          order_id: orderId,
          gross_amount: params.amount,
        },
        item_details: [{
          id: orderId,
          price: params.amount,
          quantity: 1,
          name: `${params.credits} Credits Purchase`,
        }],
        customer_details: {
          first_name: params.userName.split(' ')[0] || params.userName,
          last_name: params.userName.split(' ').slice(1).join(' ') || '-',
          email: params.userEmail || 'user@example.com',
          phone: params.userPhone || '081234567890',
        },
        callbacks: {
          finish: `${appUrl}/credits`,
          unfinish: `${appUrl}/credits`,
          error: `${appUrl}/credits`,
        },
      };

      const response = await fetch(`${this.getSnapApiUrl()}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader(),
        },
        body: JSON.stringify(transactionParams),
      });

      const data = await response.json();

      if (data.error_code) {
        console.error('[Midtrans] API error:', data);
        return {
          success: false,
          error: data.error_messages?.join(', ') || data.error_message || `Midtrans error: ${data.error_code}`,
        };
      }

      return {
        success: true,
        data: {
          token: data.token,
          redirect_url: data.redirect_url,
          transaction_id: orderId,
        },
      };
    } catch (error) {
      console.error('[Midtrans] Transaction creation failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error connecting to Midtrans',
      };
    }
  }

  async createBankTransfer(params: {
    userId: string;
    credits: number;
    amount: number;
    userEmail: string;
    userName: string;
    bank: string;
  }) {
    if (!this.serverKey) {
      return { success: false, error: 'MIDTRANS_SERVER_KEY not configured' };
    }

    try {
      const orderId = `BANK-${params.userId.substring(0, 8)}-${Date.now()}`;
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

      const chargeParams = {
        payment_type: 'bank_transfer',
        transaction_details: {
          order_id: orderId,
          gross_amount: params.amount,
        },
        bank_transfer: {
          bank: params.bank || 'bca',
        },
        customer_details: {
          first_name: params.userName.split(' ')[0] || params.userName,
          last_name: params.userName.split(' ').slice(1).join(' ') || '-',
          email: params.userEmail || 'user@example.com',
          phone: '081234567890',
        },
      };

      const response = await fetch(`${this.getSnapApiUrl()}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.getAuthHeader(),
        },
        body: JSON.stringify(chargeParams),
      });

      const data = await response.json();

      if (data.error_code) {
        console.error('[Midtrans] Bank transfer error:', data);
        return {
          success: false,
          error: data.error_messages?.join(', ') || data.error_message || `Midtrans error: ${data.error_code}`,
        };
      }

      return {
        success: true,
        data: {
          token: data.token,
          redirect_url: data.redirect_url,
          va_number: data.va_numbers?.[0]?.va_number,
          bank: params.bank,
          transaction_id: orderId,
          expiry_time: data.expiry_time,
        },
      };
    } catch (error) {
      console.error('[Midtrans] Bank transfer failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  async getTransactionStatus(orderId: string) {
    if (!this.serverKey) {
      return { success: false, error: 'MIDTRANS_SERVER_KEY not configured' };
    }

    try {
      const response = await fetch(`${this.getSnapApiUrl()}/transactions/${orderId}/status`, {
        method: 'GET',
        headers: { 'Authorization': this.getAuthHeader() },
      });
      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static generateSignature(orderId: string, statusCode: string, grossAmount: string, serverKey: string): string {
    const input = `${orderId}${statusCode}${grossAmount}${serverKey}`;
    return crypto.createHash('sha512').update(input).digest('hex');
  }

  static verifySignature(orderId: string, statusCode: string, grossAmount: string, signature: string, serverKey: string): boolean {
    return signature === MidtransService.generateSignature(orderId, statusCode, grossAmount, serverKey);
  }
}

export default MidtransService;
