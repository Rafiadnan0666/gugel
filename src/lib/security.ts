import { createClient } from '@/utils/supabase/client';
import type { UserDevice, AdminAction } from '@/types/main.db';

export interface DeviceInfo {
  id?: string;
  user_id: string;
  device_hash: string;
  device_name: string;
  device_type: 'desktop' | 'mobile' | 'tablet';
  platform: string;
  browser: string;
  ip_address: string;
  last_seen_at: Date;
  is_current: boolean;
}

export interface SecurityLog {
  id: string;
  user_id: string;
  action: 'login' | 'logout' | 'password_change' | 'suspicious_activity' | 'device_added';
  ip_address: string;
  user_agent: string;
  success: boolean;
  created_at: Date;
  metadata?: any;
}

export class SecurityService {
  private supabase = createClient();

  /**
   * Generate device fingerprint
   */
  private async generateDeviceFingerprint(): Promise<string> {
    if (typeof window === 'undefined') {
      return 'server';
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }

    const fingerprintData = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
      navigator.hardwareConcurrency || 'unknown',
      (navigator as any).deviceMemory || 'unknown'
    ];

    const fingerprint = await this.hashString(fingerprintData.join('|'));
    return fingerprint;
  }

  /**
   * Hash string using simple algorithm
   */
  private async hashString(str: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }

  /**
   * Get user devices
   */
  async getUserDevices(userId: string): Promise<UserDevice[]> {
    try {
      const { data, error } = await this.supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .order('last_seen_at', { ascending: false });

      if (error) {
        console.error('Error fetching user devices:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserDevices:', error);
      return [];
    }
  }

  /**
   * Register current device
   */
  async registerCurrentDevice(userId: string): Promise<UserDevice | null> {
    try {
      const deviceHash = await this.generateDeviceFingerprint();
      const deviceName = this.getDeviceName();
      const deviceType = this.getDeviceType();
      const platform = this.getPlatform();
      const browser = this.getBrowser();
      const ipAddress = await this.getClientIP();

      const deviceData = {
        user_id: userId,
        device_hash: deviceHash,
        device_name: deviceName,
        device_type: deviceType,
        platform,
        browser,
        ip_address: ipAddress,
        last_seen_at: new Date().toISOString()
      };

      // Check if device already exists
      const { data: existingDevice } = await this.supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', userId)
        .eq('device_hash', deviceHash)
        .single();

      if (existingDevice) {
        // Update last seen
        const { data: updatedDevice } = await this.supabase
          .from('user_devices')
          .update({
            last_seen_at: new Date().toISOString(),
            ip_address: ipAddress
          })
          .eq('id', existingDevice.id)
          .select()
          .single();

        return updatedDevice;
      } else {
        // Create new device
        const { data: newDevice } = await this.supabase
          .from('user_devices')
          .insert(deviceData)
          .select()
          .single();

        // Log device addition
        await this.logSecurityActivity(userId, 'device_added', ipAddress, navigator.userAgent, true, {
          device_name: deviceName,
          device_type: deviceType
        });

        return newDevice;
      }
    } catch (error) {
      console.error('Error registering device:', error);
      return null;
    }
  }

  /**
   * Get device name
   */
  private getDeviceName(): string {
    if (typeof window === 'undefined') return 'Server';

    const userAgent = navigator.userAgent;
    const platform = navigator.platform;

    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android Device';
    if (platform.includes('Win')) return 'Windows PC';
    if (platform.includes('Mac')) return 'Mac';
    if (platform.includes('Linux')) return 'Linux PC';
    
    return 'Unknown Device';
  }

  /**
   * Get device type
   */
  private getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop';

    const userAgent = navigator.userAgent;
    const width = window.innerWidth;

    if (/iPad|Android(?!.*Mobile)|Tablet/i.test(userAgent)) {
      return 'tablet';
    }
    
    if (/Mobile|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) || width < 768) {
      return 'mobile';
    }
    
    return 'desktop';
  }

  /**
   * Get platform
   */
  private getPlatform(): string {
    if (typeof window === 'undefined') return 'Server';

    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'macOS';
    if (userAgent.includes('Linux')) return 'Linux';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('iOS')) return 'iOS';
    
    return 'Unknown';
  }

  /**
   * Get browser
   */
  private getBrowser(): string {
    if (typeof window === 'undefined') return 'Server';

    const userAgent = navigator.userAgent;
    
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Safari')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    if (userAgent.includes('Opera')) return 'Opera';
    
    return 'Unknown';
  }

  /**
   * Get client IP (simplified)
   */
  private async getClientIP(): Promise<string> {
    try {
      // In a real implementation, you'd use a service like ipify or get it from your backend
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip || '127.0.0.1';
    } catch (error) {
      console.error('Error getting IP:', error);
      return '127.0.0.1';
    }
  }

  /**
   * Revoke device
   */
  async revokeDevice(deviceId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_devices')
        .delete()
        .eq('id', deviceId)
        .eq('user_id', userId);

      if (error) {
        console.error('Error revoking device:', error);
        return false;
      }

      // Log device revocation
      const { data: device } = await this.supabase
        .from('user_devices')
        .select('device_name')
        .eq('id', deviceId)
        .single();

      await this.logSecurityActivity(
        userId, 
        'device_revoked', 
        '127.0.0.1', 
        navigator.userAgent, 
        true, 
        { device_name: device?.device_name }
      );

      return true;
    } catch (error) {
      console.error('Error in revokeDevice:', error);
      return false;
    }
  }

  /**
   * Log security activity
   */
  async logSecurityActivity(
    userId: string,
    action: 'login' | 'logout' | 'password_change' | 'suspicious_activity' | 'device_added' | 'device_revoked' | 'sessions_invalidated',
    ipAddress: string,
    userAgent: string,
    success: boolean,
    metadata?: any
  ): Promise<void> {
    try {
      // Store in admin_actions table for audit trail
      await this.supabase.from('admin_actions').insert({
        admin_id: userId, // Using user_id as admin_id for self-actions
        action,
        target_table: 'user_devices',
        target_id: null,
        metadata: {
          ip_address: ipAddress,
          user_agent: userAgent,
          success,
          ...metadata
        },
        created_at: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging security activity:', error);
    }
  }

  /**
   * Check for suspicious activity
   */
  async checkSuspiciousActivity(userId: string): Promise<{
    isSuspicious: boolean;
    reasons: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    try {
      const devices = await this.getUserDevices(userId);
      const recentDevices = devices.filter(d => {
        const lastSeen = new Date(d.last_seen_at);
        const hoursAgo = (Date.now() - lastSeen.getTime()) / (1000 * 60 * 60);
        return hoursAgo < 24;
      });

      const reasons: string[] = [];
      let riskLevel: 'low' | 'medium' | 'high' = 'low';

      // Check for many devices in short time
      if (recentDevices.length > 5) {
        reasons.push('Multiple devices accessed in 24 hours');
        riskLevel = 'medium';
      }

      // Check for unusual locations (simplified)
      const uniqueIPs = new Set(devices.map(d => d.device_hash)).size;
      if (uniqueIPs > 3) {
        reasons.push('Access from multiple locations');
        riskLevel = 'high';
      }

      return {
        isSuspicious: reasons.length > 0,
        reasons,
        riskLevel
      };
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
      return {
        isSuspicious: false,
        reasons: [],
        riskLevel: 'low'
      };
    }
  }

  /**
   * Get security settings for user
   */
  async getSecuritySettings(userId: string): Promise<{
    twoFactorEnabled: boolean;
    emailNotifications: boolean;
    sessionTimeout: number;
    allowedDevices: number;
    requirePasswordChange: boolean;
  }> {
    try {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .single();

      const settings = profile?.settings || {};

      return {
        twoFactorEnabled: settings.twoFactorEnabled || false,
        emailNotifications: settings.emailNotifications !== false,
        sessionTimeout: settings.sessionTimeout || 24, // hours
        allowedDevices: settings.allowedDevices || 5,
        requirePasswordChange: settings.requirePasswordChange || false
      };
    } catch (error) {
      console.error('Error getting security settings:', error);
      return {
        twoFactorEnabled: false,
        emailNotifications: true,
        sessionTimeout: 24,
        allowedDevices: 5,
        requirePasswordChange: false
      };
    }
  }

  /**
   * Update security settings
   */
  async updateSecuritySettings(userId: string, settings: Partial<{
    twoFactorEnabled: boolean;
    emailNotifications: boolean;
    sessionTimeout: number;
    allowedDevices: number;
    requirePasswordChange: boolean;
  }>): Promise<boolean> {
    try {
      const { data: profile } = await this.supabase
        .from('profiles')
        .select('settings')
        .eq('id', userId)
        .single();

      const currentSettings = profile?.settings || {};
      const updatedSettings = { ...currentSettings, ...settings };

      const { error } = await this.supabase
        .from('profiles')
        .update({
          settings: updatedSettings,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('Error updating security settings:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateSecuritySettings:', error);
      return false;
    }
  }

  /**
   * Invalidate all sessions except current
   */
  async invalidateOtherSessions(userId: string, currentDeviceHash: string): Promise<boolean> {
    try {
      const { error } = await this.supabase
        .from('user_devices')
        .delete()
        .eq('user_id', userId)
        .neq('device_hash', currentDeviceHash);

      if (error) {
        console.error('Error invalidating sessions:', error);
        return false;
      }

      await this.logSecurityActivity(
        userId,
        'sessions_invalidated',
        '127.0.0.1',
        navigator.userAgent,
        true,
        { devices_revoked: 'all_except_current' }
      );

      return true;
    } catch (error) {
      console.error('Error in invalidateOtherSessions:', error);
      return false;
    }
  }

  /**
   * Clean up old devices
   */
  async cleanupOldDevices(userId: string, daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const { data: devicesToDelete } = await this.supabase
        .from('user_devices')
        .select('id')
        .eq('user_id', userId)
        .lt('last_seen_at', cutoffDate.toISOString());

      if (!devicesToDelete || devicesToDelete.length === 0) {
        return 0;
      }

      const { error } = await this.supabase
        .from('user_devices')
        .delete()
        .eq('user_id', userId)
        .lt('last_seen_at', cutoffDate.toISOString());

      if (error) {
        console.error('Error cleaning up old devices:', error);
        return 0;
      }

      return devicesToDelete.length;
    } catch (error) {
      console.error('Error in cleanupOldDevices:', error);
      return 0;
    }
  }
}

// Create singleton instance
export const securityService = new SecurityService();