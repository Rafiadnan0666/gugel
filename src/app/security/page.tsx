'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { securityService, type DeviceInfo } from '@/lib/security';
import type { UserDevice } from '@/types/main.db';
import {
  FiShield, FiSmartphone, FiMonitor, FiTablet, FiTrash2, FiClock,
  FiMapPin, FiGlobe, FiAlertTriangle, FiCheckCircle, FiRefreshCw,
  FiSettings, FiLock, FiUnlock, FiEye, FiEyeOff, FiActivity
} from 'react-icons/fi';

export default function SecurityPage() {
  const [devices, setDevices] = useState<(UserDevice & DeviceInfo)[]>([]);
  const [loading, setLoading] = useState(true);
  const [securitySettings, setSecuritySettings] = useState<any>({});
  const [suspiciousActivity, setSuspiciousActivity] = useState<any>(null);
  const supabase = createClient();

  const loadSecurityData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [devicesData, settingsData, suspiciousData] = await Promise.all([
        securityService.getUserDevices(user.id),
        securityService.getSecuritySettings(user.id),
        securityService.checkSuspiciousActivity(user.id)
      ]);

      // Register current device if not already registered
      const currentDevice = await securityService.registerCurrentDevice(user.id);

      // Combine device data with info
      const devicesWithInfo = devicesData.map(device => ({
        ...device,
        is_current: currentDevice?.id === device.id,
        device_type: device.device_hash.includes('mobile') ? 'mobile' as const : 
                     device.device_hash.includes('tablet') ? 'tablet' as const : 'desktop' as const,
        device_name: `Device ${device.device_hash.substring(0, 8)}`,
        platform: 'Unknown',
        browser: 'Unknown',
        ip_address: device.device_hash.substring(0, 6)
      }));

      setDevices(devicesWithInfo as any);
      setSecuritySettings(settingsData);
      setSuspiciousActivity(suspiciousData);
    } catch (error) {
      console.error('Error loading security data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSecurityData();
  }, [supabase]);

  const revokeDevice = async (deviceId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const success = await securityService.revokeDevice(deviceId, user.id);
      if (success) {
        setDevices(prev => prev.filter(d => d.id !== deviceId));
        alert('Device successfully revoked');
      } else {
        alert('Failed to revoke device');
      }
    } catch (error) {
      console.error('Error revoking device:', error);
      alert('Failed to revoke device');
    }
  };

  const updateSecuritySettings = async (key: string, value: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const success = await securityService.updateSecuritySettings(user.id, { [key]: value });
      if (success) {
        setSecuritySettings(prev => ({ ...prev, [key]: value }));
      }
    } catch (error) {
      console.error('Error updating security settings:', error);
    }
  };

  const invalidateAllSessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const currentDevice = devices.find(d => d.is_current);
      if (currentDevice) {
        const success = await securityService.invalidateOtherSessions(user.id, currentDevice.device_hash);
        if (success) {
          alert('All other sessions have been invalidated');
          await loadSecurityData();
        }
      }
    } catch (error) {
      console.error('Error invalidating sessions:', error);
    }
  };

  const getDeviceIcon = (type: string) => {
    switch (type) {
      case 'mobile':
        return <FiSmartphone className="w-5 h-5 text-blue-500" />;
      case 'tablet':
        return <FiTablet className="w-5 h-5 text-purple-500" />;
      case 'desktop':
        return <FiMonitor className="w-5 h-5 text-green-500" />;
      default:
        return <FiMonitor className="w-5 h-5 text-gray-500" />;
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading security settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FiShield className="w-8 h-8" />
            Security & Devices
          </h1>
          <p className="text-gray-600 mt-2">Manage your account security and connected devices</p>
        </div>
        <button
          onClick={loadSecurityData}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Security Alert */}
      {suspiciousActivity?.isSuspicious && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FiAlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-red-800 font-semibold">Suspicious Activity Detected</h3>
              <p className="text-red-700 text-sm mt-1">Risk Level: {suspiciousActivity.riskLevel}</p>
              <ul className="text-red-700 text-sm mt-2 list-disc list-inside">
                {suspiciousActivity.reasons.map((reason: string, index: number) => (
                  <li key={index}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Security Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <FiLock className="w-5 h-5" />
            Security Settings
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600">Add an extra layer of security</p>
              </div>
              <button
                onClick={() => updateSecuritySettings('twoFactorEnabled', !securitySettings.twoFactorEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  securitySettings.twoFactorEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    securitySettings.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Email Notifications</h3>
                <p className="text-sm text-gray-600">Get alerts for security events</p>
              </div>
              <button
                onClick={() => updateSecuritySettings('emailNotifications', !securitySettings.emailNotifications)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  securitySettings.emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    securitySettings.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (hours)</label>
              <select
                value={securitySettings.sessionTimeout || 24}
                onChange={(e) => updateSecuritySettings('sessionTimeout', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 hour</option>
                <option value={6}>6 hours</option>
                <option value={24}>24 hours</option>
                <option value={168}>1 week</option>
                <option value={720}>1 month</option>
              </select>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={invalidateAllSessions}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center gap-2"
              >
                <FiUnlock className="w-4 h-4" />
                Sign Out All Other Sessions
              </button>
            </div>
          </div>
        </div>

        {/* Security Overview */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <FiActivity className="w-5 h-5" />
            Security Overview
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Connected Devices</span>
              <span className="font-semibold text-gray-900">{devices.length}</span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">2FA Status</span>
              <span className={`font-semibold ${securitySettings.twoFactorEnabled ? 'text-green-600' : 'text-red-600'}`}>
                {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-sm text-gray-600">Security Score</span>
              <span className={`font-semibold ${
                suspiciousActivity?.isSuspicious ? 'text-red-600' : 'text-green-600'
              }`}>
                {suspiciousActivity?.isSuspicious ? 'Low' : 'High'}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-sm text-gray-600">Last Activity</span>
              <span className="font-semibold text-gray-900">
                {devices.length > 0 ? formatDate(devices[0].last_seen_at) : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Connected Devices */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Connected Devices</h2>
        
        {devices.length === 0 ? (
          <div className="text-center py-8">
            <FiMonitor className="mx-auto text-4xl text-gray-400 mb-4" />
            <p className="text-gray-600">No devices connected yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {devices.map((device) => (
              <div
                key={device.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  device.is_current 
                    ? 'border-blue-200 bg-blue-50' 
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-4">
                  {getDeviceIcon(device.device_type)}
                  <div>
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      {device.device_hash.substring(0, 8)}...
                      {device.is_current && (
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                          Current
                        </span>
                      )}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {device.device_type} • {formatDate(device.last_seen_at)}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <FiMapPin className="w-3 h-3" />
                        IP: {device.device_hash.substring(0, 6)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FiClock className="w-3 h-3" />
                        Last seen: {formatDate(device.last_seen_at)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {!device.is_current && (
                  <button
                    onClick={() => revokeDevice(device.id)}
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                    title="Revoke device"
                  >
                    <FiTrash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}