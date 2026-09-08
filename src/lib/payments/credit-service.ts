import { createClient } from '@/utils/supabase/client';

export interface CreditBalance {
  userId: string;
  balance: number;
  updated_at: string;
}

export interface CreditLedger {
  id: string;
  user_id: string;
  source: 'payment' | 'ai_usage' | 'admin_adjustment' | 'refund';
  reference_id?: string;
  amount: number;
  balance_after: number;
  created_at: string;
}

export interface CreditAllocationResult {
  success: boolean;
  error?: string;
  newBalance?: number;
}

export class CreditService {
  private supabase = createClient();

  /**
   * Get user's current credit balance
   */
  static async getUserCreditBalance(userId: string): Promise<CreditBalance | null> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_credits')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching credit balance:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserCreditBalance:', error);
      return null;
    }
  }

  /**
   * Process payment for credits
   */
  static async processPaymentForCredits(
    userId: string,
    credits: number,
    amount: number,
    paymentId: string,
    gateway: string
  ): Promise<CreditAllocationResult> {
    try {
      // Get current balance
      const currentBalance = await this.getUserCreditBalance(userId);
      if (!currentBalance) {
        return {
          success: false,
          error: 'Failed to get current balance',
        };
      }

      const newBalance = currentBalance.balance + credits;

      // Update credit balance
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        return {
          success: false,
          error: 'Failed to update credit balance',
        };
      }

      // Create credit ledger entry
      const { error: ledgerError } = await supabase
        .from('credit_ledger')
        .insert({
          user_id: userId,
          source: 'payment',
          reference_id: paymentId,
          amount: credits,
          balance_after: newBalance,
        });

      if (ledgerError) {
        return {
          success: false,
          error: 'Failed to create ledger entry',
        };
      }

      return {
        success: true,
        newBalance,
      };
    } catch (error) {
      console.error('Error in processPaymentForCredits:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment processing failed',
      };
    }
  }

  /**
   * Deduct credits for AI usage
   */
  static async deductCreditsForUsage(
    userId: string,
    creditsUsed: number,
    cost: number,
    usageId?: string
  ): Promise<CreditAllocationResult> {
    try {
      // Get current balance
      const currentBalance = await this.getUserCreditBalance(userId);
      if (!currentBalance) {
        return {
          success: false,
          error: 'Failed to get current balance',
        };
      }

      if (currentBalance.balance < creditsUsed) {
        return {
          success: false,
          error: 'Insufficient credits',
        };
      }

      const newBalance = currentBalance.balance - creditsUsed;

      // Update credit balance
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        return {
          success: false,
          error: 'Failed to update credit balance',
        };
      }

      // Create credit ledger entry
      const { error: ledgerError } = await supabase
        .from('credit_ledger')
        .insert({
          user_id: userId,
          source: 'ai_usage',
          reference_id: usageId,
          amount: -creditsUsed,
          balance_after: newBalance,
        });

      if (ledgerError) {
        return {
          success: false,
          error: 'Failed to create ledger entry',
        };
      }

      return {
        success: true,
        newBalance,
      };
    } catch (error) {
      console.error('Error in deductCreditsForUsage:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Credit deduction failed',
      };
    }
  }

  /**
   * Admin credit adjustment
   */
  static async adminAdjustUserCredits(
    userId: string,
    credits: number,
    reason: string,
    adminId: string
  ): Promise<CreditAllocationResult> {
    try {
      // Get current balance
      const currentBalance = await this.getUserCreditBalance(userId);
      if (!currentBalance) {
        return {
          success: false,
          error: 'Failed to get current balance',
        };
      }

      const newBalance = currentBalance.balance + credits;

      // Update credit balance
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        return {
          success: false,
          error: 'Failed to adjust credits',
        };
      }

      // Create credit ledger entry
      const { error: ledgerError } = await supabase
        .from('credit_ledger')
        .insert({
          user_id: userId,
          source: 'admin_adjustment',
          amount: credits,
          balance_after: newBalance,
        });

      if (ledgerError) {
        return {
          success: false,
          error: 'Failed to create ledger entry',
        };
      }

      // Create admin action record
      const { error: actionError } = await supabase
        .from('admin_actions')
        .insert({
          admin_id: adminId,
          action: 'credit_adjustment',
          target_table: 'user_credits',
          target_id: userId,
          metadata: {
            reason,
            credits_adjusted: credits,
            previous_balance: currentBalance.balance,
            new_balance: newBalance,
          },
        });

      if (actionError) {
        return {
          success: false,
          error: 'Failed to create admin action record',
        };
      }

      return {
        success: true,
        newBalance,
      };
    } catch (error) {
      console.error('Error in adminAdjustUserCredits:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Credit adjustment failed',
      };
    }
  }

  /**
   * Process refund
   */
  static async processRefund(
    userId: string,
    credits: number,
    reason: string,
    referenceId: string
  ): Promise<CreditAllocationResult> {
    try {
      // Get current balance
      const currentBalance = await this.getUserCreditBalance(userId);
      if (!currentBalance) {
        return {
          success: false,
          error: 'Failed to get current balance',
        };
      }

      const newBalance = currentBalance.balance - credits;

      // Update credit balance
      const supabase = createClient();
      const { error: updateError } = await supabase
        .from('user_credits')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        return {
          success: false,
          error: 'Failed to process refund',
        };
      }

      // Create credit ledger entry
      const { error: ledgerError } = await supabase
        .from('credit_ledger')
        .insert({
          user_id: userId,
          source: 'refund',
          reference_id: referenceId,
          amount: -credits,
          balance_after: newBalance,
        });

      if (ledgerError) {
        return {
          success: false,
          error: 'Failed to create ledger entry',
        };
      }

      return {
        success: true,
        newBalance,
      };
    } catch (error) {
      console.error('Error in processRefund:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed',
      };
    }
  }

  /**
   * Get credit history for user
   */
  static async getCreditHistory(userId: string, limit: number = 50): Promise<CreditLedger[]> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('credit_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching credit history:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getCreditHistory:', error);
      return [];
    }
  }

  /**
   * Get all user credit balances (admin function)
   */
  static async getAllUserCreditBalances(): Promise<Array<{ userId: string; balance: number }>> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('user_credits')
        .select('user_id, balance');

      if (error) {
        console.error('Error fetching all credit balances:', error);
        return [];
      }

      return data?.map(item => ({
        userId: item.user_id,
        balance: item.balance,
      })) || [];
    } catch (error) {
      console.error('Error in getAllUserCreditBalances:', error);
      return [];
    }
  }
}

export default CreditService;