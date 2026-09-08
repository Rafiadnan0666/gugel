import { createClient } from '@/utils/supabase/client';
import type { 
  ResearchSession, 
  AiUsageLog, 
  UserCredit, 
  Team, 
  TeamMember,
  Profile,
  Invoice,
  Payment
} from '@/types/main.db';

export interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalSessions: number;
  totalTeams: number;
  totalRevenue: number;
  aiUsage: {
    totalTokens: number;
    totalCost: number;
    providerBreakdown: { [key: string]: number };
    modelBreakdown: { [key: string]: number };
  };
  userGrowth: { date: string; users: number }[];
  usageTrends: { date: string; tokens: number; cost: number }[];
  topUsers: Array<{ profile: Profile; tokens: number; sessions: number }>;
  providerStats: Array<{ provider: string; usage: number; cost: number }>;
}

export class AnalyticsService {
  private supabase = createClient();

  /**
   * Get comprehensive analytics
   */
  async getAnalytics(startDate?: Date, endDate?: Date): Promise<AnalyticsData> {
    try {
      const [
        totalUsers,
        activeUsers,
        totalSessions,
        totalTeams,
        totalRevenue,
        aiUsage,
        userGrowth,
        topUsers,
        providerStats
      ] = await Promise.all([
        this.getTotalUsers(),
        this.getActiveUsers(startDate, endDate),
        this.getTotalSessions(startDate, endDate),
        this.getTotalTeams(),
        this.getTotalRevenue(startDate, endDate),
        this.getAIUsageStats(startDate, endDate),
        this.getUserGrowth(startDate, endDate),
        this.getTopUsers(startDate, endDate, 10),
        this.getProviderStats(startDate, endDate)
      ]);

      return {
        totalUsers,
        activeUsers,
        totalSessions,
        totalTeams,
        totalRevenue,
        aiUsage,
        userGrowth,
        usageTrends: [], // Would need more complex query
        topUsers,
        providerStats
      };
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return this.getEmptyAnalytics();
    }
  }

  /**
   * Get total users count
   */
  private async getTotalUsers(): Promise<number> {
    try {
      const { count } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      return count || 0;
    } catch (error) {
      console.error('Error getting total users:', error);
      return 0;
    }
  }

  /**
   * Get active users (users with activity in date range)
   */
  private async getActiveUsers(startDate?: Date, endDate?: Date): Promise<number> {
    try {
      let query = this.supabase
        .from('ai_usage_logs')
        .select('user_id');

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data } = await query;
      const uniqueUsers = new Set(data?.map(log => log.user_id) || []);
      return uniqueUsers.size;
    } catch (error) {
      console.error('Error getting active users:', error);
      return 0;
    }
  }

  /**
   * Get total research sessions
   */
  private async getTotalSessions(startDate?: Date, endDate?: Date): Promise<number> {
    try {
      let query = this.supabase
        .from('research_sessions')
        .select('*', { count: 'exact', head: true });

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { count } = await query;
      return count || 0;
    } catch (error) {
      console.error('Error getting total sessions:', error);
      return 0;
    }
  }

  /**
   * Get total teams
   */
  private async getTotalTeams(): Promise<number> {
    try {
      const { count } = await this.supabase
        .from('teams')
        .select('*', { count: 'exact', head: true });

      return count || 0;
    } catch (error) {
      console.error('Error getting total teams:', error);
      return 0;
    }
  }

  /**
   * Get total revenue
   */
  private async getTotalRevenue(startDate?: Date, endDate?: Date): Promise<number> {
    try {
      let query = this.supabase
        .from('payments')
        .select('amount');

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data } = await query.eq('status', 'success');
      return data?.reduce((sum, payment) => sum + (payment.amount || 0), 0) || 0;
    } catch (error) {
      console.error('Error getting total revenue:', error);
      return 0;
    }
  }

  /**
   * Get AI usage statistics
   */
  private async getAIUsageStats(startDate?: Date, endDate?: Date): Promise<{
    totalTokens: number;
    totalCost: number;
    providerBreakdown: { [key: string]: number };
    modelBreakdown: { [key: string]: number };
  }> {
    try {
      let query = this.supabase
        .from('ai_usage_logs')
        .select(`
          total_tokens,
          cost,
          ai_providers!inner(key),
          ai_models!inner(model_key)
        `);

      if (startDate) {
        query = query.gte('created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('created_at', endDate.toISOString());
      }

      const { data } = await query;

      const providerBreakdown: { [key: string]: number } = {};
      const modelBreakdown: { [key: string]: number } = {};
      let totalTokens = 0;
      let totalCost = 0;

      data?.forEach(log => {
        const tokens = log.total_tokens || 0;
        const cost = log.cost || 0;
        const provider = (log.ai_providers as any)?.key || 'unknown';
        const model = (log.ai_models as any)?.model_key || 'unknown';

        totalTokens += tokens;
        totalCost += cost;
        
        providerBreakdown[provider] = (providerBreakdown[provider] || 0) + tokens;
        modelBreakdown[model] = (modelBreakdown[model] || 0) + tokens;
      });

      return {
        totalTokens,
        totalCost,
        providerBreakdown,
        modelBreakdown
      };
    } catch (error) {
      console.error('Error getting AI usage stats:', error);
      return {
        totalTokens: 0,
        totalCost: 0,
        providerBreakdown: {},
        modelBreakdown: {}
      };
    }
  }

  /**
   * Get user growth over time
   */
  private async getUserGrowth(startDate?: Date, endDate?: Date): Promise<{ date: string; users: number }[]> {
    try {
      // Simplified version - in real implementation, would group by creation date
      const { data } = await this.supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: true });

      const growth: { date: string; users: number }[] = [];
      let cumulative = 0;

      data?.forEach((profile, index) => {
        cumulative++;
        if (index % Math.max(1, Math.floor((data.length || 1) / 30)) === 0) { // Sample every 30th user
          growth.push({
            date: new Date(profile.created_at).toLocaleDateString(),
            users: cumulative
          });
        }
      });

      return growth;
    } catch (error) {
      console.error('Error getting user growth:', error);
      return [];
    }
  }

  /**
   * Get top users by usage
   */
  private async getTopUsers(startDate?: Date, endDate?: Date, limit: number = 10): Promise<Array<{ profile: Profile; tokens: number; sessions: number }>> {
    try {
      let query = this.supabase
        .from('ai_usage_logs')
        .select(`
          user_id,
          total_tokens,
          profiles!inner(full_name, email, avatar_url),
          research_sessions!count()
        `)
        .eq('profiles.id', this.supabase.rpc('current_user'))
        .order('total_tokens', { ascending: false })
        .limit(limit);

      if (startDate) {
        query = query.gte('ai_usage_logs.created_at', startDate.toISOString());
      }
      if (endDate) {
        query = query.lte('ai_usage_logs.created_at', endDate.toISOString());
      }

      const { data } = await query;

      return data?.map((log: any) => ({
        profile: log.profiles as Profile,
        tokens: log.total_tokens || 0,
        sessions: log.research_sessions?.length || 0
      })) || [];
    } catch (error) {
      console.error('Error getting top users:', error);
      return [];
    }
  }

  /**
   * Get provider statistics
   */
  private async getProviderStats(startDate?: Date, endDate?: Date): Promise<Array<{ provider: string; usage: number; cost: number }>> {
    try {
      const data = await this.getAIUsageStats(startDate, endDate);

      return Object.keys(data.providerBreakdown).map((provider: any) => ({
        provider,
        usage: data.providerBreakdown[provider] as number,
        cost: (data.providerBreakdown[provider] as number) * 0.01 // Simplified cost calculation
      }));
    } catch (error) {
      console.error('Error getting provider stats:', error);
      return [];
    }
  }

  /**
   * Get empty analytics structure
   */
  private getEmptyAnalytics(): AnalyticsData {
    return {
      totalUsers: 0,
      activeUsers: 0,
      totalSessions: 0,
      totalTeams: 0,
      totalRevenue: 0,
      aiUsage: {
        totalTokens: 0,
        totalCost: 0,
        providerBreakdown: {},
        modelBreakdown: {}
      },
      userGrowth: [],
      usageTrends: [],
      topUsers: [],
      providerStats: []
    };
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(format: 'json' | 'csv' = 'json'): Promise<string> {
    try {
      const analytics = await this.getAnalytics();

      if (format === 'json') {
        return JSON.stringify(analytics, null, 2);
      } else if (format === 'csv') {
        // Convert to CSV
        const csvHeaders = [
          'Total Users', 'Active Users', 'Total Sessions', 'Total Teams', 
          'Total Revenue', 'Total Tokens', 'Total Cost'
        ];
        const csvData = [
          analytics.totalUsers,
          analytics.activeUsers,
          analytics.totalSessions,
          analytics.totalTeams,
          analytics.totalRevenue,
          analytics.aiUsage.totalTokens,
          analytics.aiUsage.totalCost
        ];

        return [csvHeaders.join(','), csvData.join(',')].join('\n');
      }

      throw new Error('Unsupported format');
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw error;
    }
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<{
    activeSessions: number;
    currentAIRequests: number;
    recentSignups: number;
  }> {
    try {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const [sessionsResult, usageResult, profilesResult] = await Promise.all([
        this.supabase
          .from('research_sessions')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneHourAgo.toISOString()),
        this.supabase
          .from('ai_usage_logs')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneHourAgo.toISOString()),
        this.supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', oneHourAgo.toISOString())
      ]);

      return {
        activeSessions: sessionsResult.count || 0,
        currentAIRequests: usageResult.count || 0,
        recentSignups: profilesResult.count || 0
      };
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      return {
        activeSessions: 0,
        currentAIRequests: 0,
        recentSignups: 0
      };
    }
  }
}

// Create singleton instance
export const analyticsService = new AnalyticsService();