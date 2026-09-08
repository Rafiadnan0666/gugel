import { createClient } from '@/utils/supabase/client';
import type { UserCredit, AiUsageLog, CreditLedger, RoleAiQuota } from '@/types/main.db';

// Re-export types for convenience
export type { AiUsageLog, CreditLedger };

export interface UsageStats {
  todayTokens: number;
  monthTokens: number;
  creditBalance: number;
  monthlyLimit: number;
  usagePercentage: number;
  isNearLimit: boolean;
  isAtLimit: boolean;
}

export interface QuotaEnforcement {
  allowed: boolean;
  remainingTokens: number;
  warningMessage?: string;
  hardStop: boolean;
}

export class UsageTrackingService {
  private supabase = createClient();

  /**
   * Get user's current usage statistics
   */
  async getUsageStats(userId: string): Promise<UsageStats | null> {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      // Get user credit balance
      const { data: userCredit } = await this.supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      // Get user's role and quota
      const { data: roleData } = await this.supabase
        .from('user_role_assignments')
        .select('role_id')
        .eq('user_id', userId)
        .single();

      let monthlyLimit = 100000; // Default limit
      if (roleData) {
        const { data: quota } = await this.supabase
          .from('role_ai_quotas')
          .select('monthly_token_limit, hard_stop')
          .eq('role_id', roleData.role_id)
          .single();
        
        if (quota?.monthly_token_limit) {
          monthlyLimit = Number(quota.monthly_token_limit);
        }
      }

      // Get today's usage
      const { data: todayUsage } = await this.supabase
        .from('ai_usage_logs')
        .select('total_tokens')
        .eq('user_id', userId)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString());

      // Get monthly usage
      const { data: monthUsage } = await this.supabase
        .from('ai_usage_logs')
        .select('total_tokens')
        .eq('user_id', userId)
        .gte('created_at', startOfMonth.toISOString());

      const todayTokens = todayUsage?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0;
      const monthTokens = monthUsage?.reduce((sum, log) => sum + (log.total_tokens || 0), 0) || 0;
      const creditBalance = userCredit?.balance || 0;

      const usagePercentage = monthlyLimit > 0 ? (monthTokens / monthlyLimit) * 100 : 0;

      return {
        todayTokens,
        monthTokens,
        creditBalance,
        monthlyLimit,
        usagePercentage,
        isNearLimit: usagePercentage >= 80,
        isAtLimit: usagePercentage >= 100
      };
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      return null;
    }
  }

  /**
   * Check if user can make an AI request based on quota
   */
  async checkQuota(userId: string, requestedTokens: number = 1000): Promise<QuotaEnforcement> {
    try {
      const usageStats = await this.getUsageStats(userId);
      
      if (!usageStats) {
        return {
          allowed: false,
          remainingTokens: 0,
          warningMessage: 'Unable to verify usage limits',
          hardStop: true
        };
      }

      const projectedUsage = usageStats.monthTokens + requestedTokens;
      const remainingTokens = Math.max(0, usageStats.monthlyLimit - usageStats.monthTokens);

      // Check if user has enough credits
      const estimatedCost = this.calculateCost(requestedTokens);
      if (usageStats.creditBalance < estimatedCost) {
        return {
          allowed: false,
          remainingTokens: 0,
          warningMessage: `Insufficient credits. Required: ${estimatedCost.toFixed(2)}, Available: ${usageStats.creditBalance.toFixed(2)}`,
          hardStop: true
        };
      }

      // Check token limits
      if (projectedUsage >= usageStats.monthlyLimit) {
        return {
          allowed: false,
          remainingTokens: 0,
          warningMessage: usageStats.isAtLimit 
            ? 'Monthly token limit reached' 
            : 'This request would exceed your monthly token limit',
          hardStop: true
        };
      }

      // Warning if near limit
      let warningMessage: string | undefined;
      if (usageStats.isNearLimit && projectedUsage > usageStats.monthlyLimit * 0.9) {
        warningMessage = `Warning: You're approaching your monthly limit (${usageStats.usagePercentage.toFixed(1)}% used)`;
      }

      return {
        allowed: true,
        remainingTokens,
        warningMessage,
        hardStop: false
      };
    } catch (error) {
      console.error('Error checking quota:', error);
      return {
        allowed: false,
        remainingTokens: 0,
        warningMessage: 'Unable to verify quota limits',
        hardStop: true
      };
    }
  }

  /**
   * Log AI usage and deduct credits
   */
  async logUsage(
    userId: string,
    providerKey: string,
    modelId: string | null,
    sessionId: string | null,
    inputTokens: number,
    outputTokens: number,
    cost: number
  ): Promise<void> {
    try {
      const totalTokens = inputTokens + outputTokens;

      // Get or create provider UUID from ai_providers table
      const providerId = await this.getOrCreateProviderId(providerKey);

      // Log usage
      await this.supabase.from('ai_usage_logs').insert({
        user_id: userId,
        provider_id: providerId,
        model_id: modelId,
        session_id: sessionId,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: totalTokens,
        cost,
        created_at: new Date().toISOString()
      });

      // Deduct credits
      await this.deductCredits(userId, cost, 'ai_usage');

      // Create notification if near limit
      const usageStats = await this.getUsageStats(userId);
      if (usageStats && usageStats.isNearLimit && !usageStats.isAtLimit) {
        await this.createUsageNotification(userId, usageStats);
      }
    } catch (error) {
      console.error('Error logging usage:', error);
      throw error;
    }
  }

  /**
   * Get or create a provider UUID from the ai_providers table
   */
  private async getOrCreateProviderId(providerKey: string): Promise<string> {
    const { data: existing } = await this.supabase
      .from('ai_providers')
      .select('id')
      .eq('key', providerKey)
      .single();

    if (existing) return existing.id;

    const displayNames: Record<string, string> = {
      gemini: 'Google Gemini',
      openai: 'OpenAI',
    };

    const { data: created, error } = await this.supabase
      .from('ai_providers')
      .insert({
        key: providerKey,
        display_name: displayNames[providerKey] || providerKey,
        is_paid: true,
        active: true,
      })
      .select('id')
      .single();

    if (error || !created) {
      console.error('Failed to create provider row:', error);
      throw new Error(`Cannot create provider: ${providerKey}`);
    }
    return created.id;
  }

  /**
   * Add credits to user account
   */
  async addCredits(
    userId: string, 
    amount: number, 
    source: 'payment' | 'admin_adjustment' | 'refund',
    referenceId?: string
  ): Promise<void> {
    try {
      const { data: currentCredit } = await this.supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      const currentBalance = currentCredit?.balance || 0;
      const newBalance = currentBalance + amount;

      // Update or insert credit balance
      await this.supabase
        .from('user_credits')
        .upsert({
          user_id: userId,
          balance: newBalance,
          updated_at: new Date().toISOString()
        });

      // Add to ledger
      await this.supabase.from('credit_ledger').insert({
        user_id: userId,
        source,
        reference_id: referenceId,
        amount,
        balance_after: newBalance,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error adding credits:', error);
      throw error;
    }
  }

  /**
   * Deduct credits from user account
   */
  private async deductCredits(
    userId: string, 
    amount: number, 
    source: 'ai_usage' | 'admin_adjustment',
    referenceId?: string
  ): Promise<void> {
    try {
      const { data: currentCredit } = await this.supabase
        .from('user_credits')
        .select('balance')
        .eq('user_id', userId)
        .single();

      if (!currentCredit) {
        throw new Error('User credit account not found');
      }

      const newBalance = Math.max(0, currentCredit.balance - amount);

      // Update balance
      await this.supabase
        .from('user_credits')
        .update({
          balance: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      // Add to ledger
      await this.supabase.from('credit_ledger').insert({
        user_id: userId,
        source,
        reference_id: referenceId,
        amount: -amount,
        balance_after: newBalance,
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error deducting credits:', error);
      throw error;
    }
  }

  /**
   * Calculate estimated cost based on token count
   */
  private calculateCost(tokens: number): number {
    // Default pricing: $0.01 per 1K tokens
    return (tokens / 1000) * 0.01;
  }

  /**
   * Create usage notification for user
   */
  private async createUsageNotification(userId: string, usageStats: UsageStats): Promise<void> {
    try {
      const message = usageStats.isAtLimit
        ? `You have reached your monthly AI token limit (${usageStats.monthTokens.toLocaleString()} tokens). Consider upgrading your plan for more tokens.`
        : `You've used ${usageStats.usagePercentage.toFixed(1)}% of your monthly AI token limit (${usageStats.monthTokens.toLocaleString()} of ${usageStats.monthlyLimit.toLocaleString()} tokens).`;

      await this.supabase.from('notifications').insert({
        user_id: userId,
        message,
        type: 'usage_alert',
        created_at: new Date().toISOString(),
        read: false,
        updated_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating usage notification:', error);
    }
  }

  /**
   * Get credit ledger history
   */
  async getCreditHistory(userId: string, limit: number = 50): Promise<CreditLedger[]> {
    try {
      const { data } = await this.supabase
        .from('credit_ledger')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error('Error fetching credit history:', error);
      return [];
    }
  }

  /**
   * Get detailed usage logs
   */
  async getUsageLogs(
    userId: string, 
    startDate?: Date, 
    endDate?: Date, 
    limit: number = 100
  ): Promise<AiUsageLog[]> {
    try {
      let query = this.supabase
        .from('ai_usage_logs')
        .select(`
          *,
          ai_providers!inner(key, display_name),
          ai_models!inner(model_key, context_limit)
        `)
        .eq('user_id', userId);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data } = await query
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error('Error fetching usage logs:', error);
      return [];
    }
  }

  /**
   * Get usage analytics for admin dashboard
   */
  async getUsageAnalytics(startDate?: Date, endDate?: Date): Promise<any> {
    try {
      let query = this.supabase
        .from('ai_usage_logs')
        .select(`
          *,
          profiles!inner(full_name, email),
          ai_providers!inner(key, display_name)
        `);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data } = await query.order('created_at', { ascending: false });
      
      return data;
    } catch (error) {
      console.error('Error fetching usage analytics:', error);
      return null;
    }
  }
}

// Create singleton instance
export const usageTracking = new UsageTrackingService();