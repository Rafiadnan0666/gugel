import { createClient } from '@/utils/supabase/client';
import { CreditLedger, UserCredit, CreditLedgerSource } from '@/types/main.db';

export interface CreditTransaction {
  readonly id: string;
  readonly amount: number;
  readonly balanceAfter: number;
  readonly source: CreditLedgerSource;
  readonly referenceId?: string;
  readonly createdAt: Date;
  readonly description?: string;
}

const supabase = createClient();

const createCreditTransaction = (entry: any): CreditTransaction => ({
  id: entry.id,
  amount: entry.amount,
  balanceAfter: entry.balance_after,
  source: entry.source,
  referenceId: entry.reference_id || undefined,
  createdAt: new Date(entry.created_at),
  description: getTransactionDescription(entry.source, entry.amount)
});

const getTransactionDescription = (source: CreditLedgerSource, amount: number): string => {
  switch (source) {
    case 'payment':
      return amount > 0 ? 'Credits purchased' : 'Payment refund';
    case 'ai_usage':
      return amount < 0 ? 'AI usage' : 'AI usage refund';
    case 'admin_adjustment':
      return amount > 0 ? 'Admin credit addition' : 'Admin credit removal';
    case 'refund':
      return 'Credit refund';
    default:
      return 'Credit transaction';
  }
};

const getUserCreditBalance = async (userId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return data?.balance || 0;
  } catch (error) {
    console.error('Error fetching user credit balance:', error);
    return 0;
  }
};

const addCreditLedgerEntry = async (
  userId: string, 
  source: CreditLedgerSource, 
  amount: number, 
  newBalance: number,
  referenceId?: string,
  description?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('credit_ledger')
      .insert({
        user_id: userId,
        source,
        reference_id: referenceId,
        amount,
        balance_after: newBalance,
        created_at: new Date().toISOString()
      });

    return !error;
  } catch (error) {
    console.error('Error adding credit ledger entry:', error);
    return false;
  }
};

const updateUserCreditBalance = async (userId: string, newBalance: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_credits')
      .upsert({
        user_id: userId,
        balance: newBalance,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    return !error;
  } catch (error) {
    console.error('Error updating user credit balance:', error);
    return false;
  }
};

const addCredits = async (
  userId: string, 
  amount: number, 
  source: CreditLedgerSource, 
  referenceId?: string, 
  description?: string
): Promise<boolean> => {
  const currentBalance = await getUserCreditBalance(userId);
  const newBalance = currentBalance + amount;

  const ledgerSuccess = await addCreditLedgerEntry(
    userId, 
    source, 
    amount, 
    newBalance, 
    referenceId, 
    description
  );

  if (!ledgerSuccess) return false;

  const balanceSuccess = await updateUserCreditBalance(userId, newBalance);
  
  if (balanceSuccess) {
    console.log(`Added ${amount} credits to user ${userId}. New balance: ${newBalance}`);
  }

  return balanceSuccess;
};

const consumeCredits = async (
  userId: string, 
  amount: number, 
  referenceId?: string, 
  description?: string
): Promise<boolean> => {
  const currentBalance = await getUserCreditBalance(userId);
  
  if (currentBalance < amount) {
    console.warn(`Insufficient credits for user ${userId}. Required: ${amount}, Available: ${currentBalance}`);
    return false;
  }

  const newBalance = currentBalance - amount;

  const ledgerSuccess = await addCreditLedgerEntry(
    userId, 
    'ai_usage', 
    -amount, 
    newBalance, 
    referenceId, 
    description
  );

  if (!ledgerSuccess) return false;

  const balanceSuccess = await updateUserCreditBalance(userId, newBalance);
  
  if (balanceSuccess) {
    console.log(`Consumed ${amount} credits from user ${userId}. New balance: ${newBalance}`);
  }

  return balanceSuccess;
};

export const creditService = {
  getUserCreditBalance,
  
  addUserCredits: addCredits,
  
  consumeCredits,
  
  async getCreditHistory(userId: string, limit: number = 50): Promise<CreditTransaction[]> {
    try {
      const { data, error } = await supabase
        .from('credit_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []).map(createCreditTransaction);
    } catch (error) {
      console.error('Error fetching credit history:', error);
      return [];
    }
  },

  async processPaymentForCredits(userId: string, amount: number, paymentId: string): Promise<boolean> {
    const success = await addCredits(
      userId,
      amount,
      'payment',
      paymentId,
      `Credits purchased via payment ${paymentId}`
    );

    if (success) {
      console.log(`Successfully processed payment ${paymentId} and added ${amount} credits to user ${userId}`);
    }

    return success;
  },

  checkSufficientCredits: async (userId: string, requiredAmount: number): Promise<boolean> => {
    const balance = await getUserCreditBalance(userId);
    return balance >= requiredAmount;
  },

  async getCreditUsageStats(userId: string, days: number = 30): Promise<{
    readonly totalUsed: number;
    readonly totalAdded: number;
    readonly netChange: number;
    readonly transactionsCount: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const { data, error } = await supabase
        .from('credit_ledger')
        .select('amount, created_at')
        .eq('user_id', userId)
        .gte('created_at', cutoffDate.toISOString());

      if (error) throw error;

      const transactions = data || [];
      const totalUsed = transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const totalAdded = transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);

      return {
        totalUsed,
        totalAdded,
        netChange: totalAdded - totalUsed,
        transactionsCount: transactions.length
      };
    } catch (error) {
      console.error('Error fetching credit usage stats:', error);
      return {
        totalUsed: 0,
        totalAdded: 0,
        netChange: 0,
        transactionsCount: 0
      };
    }
  },

  async adminAdjustUserCredits(userId: string, amount: number, reason?: string): Promise<boolean> {
    const success = await addCredits(
      userId,
      amount,
      'admin_adjustment',
      undefined,
      reason || `Admin adjustment: ${amount > 0 ? 'Added' : 'Removed'} ${Math.abs(amount)} credits`
    );

    if (success) {
      console.log(`Admin adjusted credits for user ${userId} by ${amount} credits. Reason: ${reason}`);
    }

    return success;
  },

  async getAllUserCreditBalances(): Promise<Array<{ readonly userId: string; readonly balance: number }>> {
    try {
      const { data, error } = await supabase
        .from('user_credits')
        .select('user_id, balance')
        .order('balance', { ascending: false });

      if (error) throw error;

      return (data || []).map((uc: any) => ({
        userId: uc.user_id,
        balance: uc.balance
      }));
    } catch (error) {
      console.error('Error fetching all user credit balances:', error);
      return [];
    }
  }
};

export default creditService;