"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { UserDevice, Profile } from '@/types/main.db';
import { FiSearch, FiTrash2, FiMonitor, FiCalendar, FiUser, FiSmartphone } from 'react-icons/fi';

export default function UserDevicesPage() {
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<UserDevice | null>(null);
  const [showModal, setShowModal] = useState(false);

  const supabase = createClient();

  const fetchDevices = async () => {
    const { data, error } = await supabase
      .from('user_devices')
      .select(`
        *,
        profiles!inner(*)
      `)
      .order('last_seen_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Error fetching devices:', error);
    } else {
      setDevices(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const filteredDevices = devices.filter((device: any) => {
    const matchesSearch = 
      (device.profiles?.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (device.profiles?.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.device_hash.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this device?')) return;
    
    const { error } = await supabase
      .from('user_devices')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting device:', error);
      alert('Error deleting device');
    } else {
      await fetchDevices();
    }
  };

  const getDeviceIcon = () => {
    return <FiMonitor className="text-gray-400" />;
  };

  const getLastSeenStatus = (lastSeen: Date | null) => {
    if (!lastSeen) return { color: 'text-gray-500', text: 'Never' };
    
    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffInHours = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return { color: 'text-green-600', text: 'Online' };
    } else if (diffInHours < 24) {
      return { color: 'text-yellow-600', text: `${Math.floor(diffInHours)}h ago` };
    } else if (diffInHours < 168) { // 7 days
      return { color: 'text-orange-600', text: `${Math.floor(diffInHours / 24)}d ago` };
    } else {
      return { color: 'text-gray-600', text: 'Inactive' };
    }
  };

  const exportCSV = () => {
    const headers = ['User', 'Device Hash', 'Last Seen', 'Created'];
    const csvData = filteredDevices.map((device: any) => [
      device.profiles?.full_name || 'Unknown',
      device.device_hash,
      device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : 'Never',
      device.created_at ? new Date(device.created_at).toLocaleString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `user-devices-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6">Loading user devices...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Devices</h1>
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Total Devices: {filteredDevices.length}
          </div>
          <button
            onClick={exportCSV}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-64">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 w-full"
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Device Info
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Last Seen
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredDevices.map((device: any) => {
              const lastSeenStatus = getLastSeenStatus(device.last_seen_at);
              return (
                <tr key={device.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <FiUser className="mr-2 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {device.profiles?.full_name || 'Unknown'}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {device.profiles?.email || device.user_id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getDeviceIcon()}
                      <div className="ml-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          Device
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                          {device.device_hash.slice(0, 16)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`text-sm font-medium ${lastSeenStatus.color}`}>
                      {lastSeenStatus.text}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900 dark:text-white">
                      <FiCalendar className="mr-2" />
                      {device.last_seen_at 
                        ? new Date(device.last_seen_at).toLocaleString()
                        : 'Never'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {device.created_at ? new Date(device.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => {
                        setSelectedDevice(device);
                        setShowModal(true);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                    >
                      <FiCalendar />
                    </button>
                    <button
                      onClick={() => handleDelete(device.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <FiTrash2 />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && selectedDevice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Device Details
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  User
                </label>
                <div className="text-sm text-gray-900 dark:text-white">
                  {(selectedDevice as any).profiles?.full_name || 'Unknown'}
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    ({(selectedDevice as any).profiles?.email})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Device Hash
                </label>
                <div className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">
                  {selectedDevice.device_hash}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Status
                  </label>
                  <div className={`text-sm font-medium ${getLastSeenStatus(selectedDevice.last_seen_at).color}`}>
                    {getLastSeenStatus(selectedDevice.last_seen_at).text}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Device Type
                  </label>
                  <div className="text-sm text-gray-900 dark:text-white">
                    <FiSmartphone className="inline mr-1" />
                    Unknown Device
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Last Seen
                </label>
                <div className="text-sm text-gray-900 dark:text-white">
                  {selectedDevice.last_seen_at 
                    ? new Date(selectedDevice.last_seen_at).toLocaleString()
                    : 'Never'
                  }
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  First Seen
                </label>
                <div className="text-sm text-gray-900 dark:text-white">
                  Device registered
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}