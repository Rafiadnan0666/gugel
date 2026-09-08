import { createClient } from '@/utils/supabase/client';
import type { Notification } from '@/types/main.db';

export interface NotificationData extends Omit<Notification, 'id' | 'created_at' | 'updated_at'> {
  id?: number;
}

export interface NotificationFilter {
  type?: string;
  read?: boolean;
  limit?: number;
  offset?: number;
}

export class NotificationService {
  private supabase = createClient();

  /**
   * Get user notifications
   */
  async getNotifications(userId: string, filter: NotificationFilter = {}): Promise<Notification[]> {
    try {
      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (filter.type) {
        query = query.eq('type', filter.type);
      }
      
      if (filter.read !== undefined) {
        query = query.eq('read', filter.read);
      }

      if (filter.limit) {
        query = query.limit(filter.limit);
      }

      if (filter.offset) {
        query = query.range(filter.offset, filter.offset + (filter.limit || 50) - 1);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching notifications:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return [];
    }
  }

  /**
   * Get unread notifications count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error fetching unread count:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error in getUnreadCount:', error);
      return 0;
    }
  }

  /**
   * Create a new notification
   */
  async createNotification(notification: Omit<NotificationData, 'id' | 'created_at' | 'updated_at'>): Promise<Notification | null> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .insert({
          ...notification,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createNotification:', error);
      return null;
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: number, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  async markMultipleAsRead(notificationIds: number[], userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({
          read: true,
          updated_at: new Date().toISOString()
        })
        .in('id', notificationIds)
        .eq('user_id', userId);

      if (error) {
        console.error('Error marking notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markMultipleAsRead:', error);
      return false;
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: number, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      return false;
    }
  }

  /**
   * Create system notification for user
   */
  async createSystemNotification(
    userId: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' = 'info'
  ): Promise<Notification | null> {
    return this.createNotification({
      user_id: userId,
      message,
      type: `system_${type}`,
      read: false
    });
  }

  /**
   * Create billing notification
   */
  async createBillingNotification(
    userId: string,
    message: string,
    type: 'payment_success' | 'payment_failed' | 'invoice_due' | 'low_credits' = 'payment_success'
  ): Promise<Notification | null> {
    return this.createNotification({
      user_id: userId,
      message,
      type: `billing_${type}`,
      read: false
    });
  }

  /**
   * Create usage notification
   */
  async createUsageNotification(
    userId: string,
    message: string,
    type: 'quota_warning' | 'quota_exceeded' | 'usage_alert' = 'usage_alert'
  ): Promise<Notification | null> {
    return this.createNotification({
      user_id: userId,
      message,
      type: `usage_${type}`,
      read: false
    });
  }

  /**
   * Create collaboration notification
   */
  async createCollaborationNotification(
    userId: string,
    message: string,
    type: 'session_invite' | 'message_received' | 'draft_shared' = 'session_invite'
  ): Promise<Notification | null> {
    return this.createNotification({
      user_id: userId,
      message,
      type: `collaboration_${type}`,
      read: false
    });
  }

  /**
   * Create AI notification
   */
  async createAINotification(
    userId: string,
    message: string,
    type: 'analysis_complete' | 'model_update' | 'ai_error' = 'analysis_complete'
  ): Promise<Notification | null> {
    return this.createNotification({
      user_id: userId,
      message,
      type: `ai_${type}`,
      read: false
    });
  }

  /**
   * Get notification statistics
   */
  async getNotificationStats(userId: string): Promise<{
    total: number;
    unread: number;
    system: number;
    billing: number;
    usage: number;
    collaboration: number;
    ai: number;
  }> {
    try {
      const { data, error } = await this.supabase
        .from('notifications')
        .select('type, read')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching notification stats:', error);
        return {
          total: 0,
          unread: 0,
          system: 0,
          billing: 0,
          usage: 0,
          collaboration: 0,
          ai: 0
        };
      }

      const stats = {
        total: data?.length || 0,
        unread: 0,
        system: 0,
        billing: 0,
        usage: 0,
        collaboration: 0,
        ai: 0
      };

      data?.forEach(notification => {
        if (!notification.read) stats.unread++;
        
        if (notification.type?.startsWith('system_')) stats.system++;
        else if (notification.type?.startsWith('billing_')) stats.billing++;
        else if (notification.type?.startsWith('usage_')) stats.usage++;
        else if (notification.type?.startsWith('collaboration_')) stats.collaboration++;
        else if (notification.type?.startsWith('ai_')) stats.ai++;
      });

      return stats;
    } catch (error) {
      console.error('Error in getNotificationStats:', error);
      return {
        total: 0,
        unread: 0,
        system: 0,
        billing: 0,
        usage: 0,
        collaboration: 0,
        ai: 0
      };
    }
  }

  /**
   * Cleanup old notifications (older than 30 days)
   */
  async cleanupOldNotifications(userId: string, daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId)
        .lt('created_at', cutoffDate.toISOString());

      if (error) {
        console.error('Error cleaning up old notifications:', error);
        return 0;
      }

      return 1; // Success
    } catch (error) {
      console.error('Error in cleanupOldNotifications:', error);
      return 0;
    }
  }
}

// Create singleton instance
export const notificationService = new NotificationService();