'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { createClient } from '@/utils/supabase/client';
import { roleService } from '@/lib/role-service';
import { FiUsers, FiShield, FiPlus, FiTrash2, FiSearch, FiCheck, FiX } from 'react-icons/fi';

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean | null;
}

interface UserWithRoles {
  id: string;
  email: string;
  full_name?: string;
  roles: Role[];
}

interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

export default function AdminRolesPage() {
  const supabase = createClient();
  const [roles, setRoles] = useState<Role[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<Record<string, Role[]>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '' });
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const isAdmin = await roleService.isAdmin(authUser.id);
      if (!isAdmin) {
        window.location.href = '/dashboard';
        return;
      }

      // Fetch all roles
      const allRoles = await roleService.getAllRoles();
      setRoles(allRoles);

      // Fetch all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .order('full_name');

      setUsers(profiles || []);

      // Fetch role assignments for all users
      const { data: assignments } = await supabase
        .from('user_role_assignments')
        .select('user_id, role_id, user_roles(id, name, description, is_default)');

      const roleMap: Record<string, Role[]> = {};
      (assignments || []).forEach((a: any) => {
        if (!roleMap[a.user_id]) roleMap[a.user_id] = [];
        if (a.user_roles) {
          roleMap[a.user_id].push(a.user_roles);
        }
      });
      setUserRoles(roleMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleCreateRole = async () => {
    if (!newRole.name.trim()) {
      showMessage('error', 'Role name is required');
      return;
    }

    const created = await roleService.createRole(newRole.name.trim(), newRole.description.trim());
    if (created) {
      setRoles([...roles, created]);
      setNewRole({ name: '', description: '' });
      setShowCreateRole(false);
      showMessage('success', `Role "${created.name}" created`);
    } else {
      showMessage('error', 'Failed to create role');
    }
  };

  const handleAssignRole = async (userId: string, roleId: string) => {
    const success = await roleService.assignRole(userId, roleId);
    if (success) {
      const role = roles.find(r => r.id === roleId);
      if (role) {
        setUserRoles(prev => ({
          ...prev,
          [userId]: [...(prev[userId] || []), role],
        }));
      }
      showMessage('success', 'Role assigned');
    } else {
      showMessage('error', 'Failed to assign role');
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    const success = await roleService.removeRole(userId, roleId);
    if (success) {
      setUserRoles(prev => ({
        ...prev,
        [userId]: (prev[userId] || []).filter(r => r.id !== roleId),
      }));
      showMessage('success', 'Role removed');
    } else {
      showMessage('error', 'Failed to remove role');
    }
  };

  const filteredUsers = users.filter(u =>
    (u.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const userHasRole = (userId: string, roleId: string) =>
    (userRoles[userId] || []).some(r => r.id === roleId);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Role Management</h1>
              <p className="text-gray-500 dark:text-gray-400 mt-1">Manage user roles and permissions</p>
            </div>
            <button
              onClick={() => setShowCreateRole(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              <FiPlus className="w-4 h-4" /> New Role
            </button>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
              {message.text}
            </div>
          )}

          {/* Roles Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <FiShield className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Roles</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{roles.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <FiUsers className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{users.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* All Roles List */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 mb-8">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Roles</h2>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {roles.map((role) => (
                <div key={role.id} className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white capitalize">{role.name}</h3>
                    {role.description && <p className="text-sm text-gray-500">{role.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {role.is_default && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Default</span>
                    )}
                    <span className="text-xs text-gray-500">
                      {(userRoles && Object.values(userRoles).flat().filter(r => r.id === role.id).length)} users
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* User Role Assignment */}
          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Assign Roles to Users</h2>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                      {roles.map((role) => (
                        <th key={role.id} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase capitalize">
                          {role.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.full_name || 'Unnamed'}
                            </p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </td>
                        {roles.map((role) => (
                          <td key={role.id} className="px-4 py-3 text-center">
                            <button
                              onClick={() =>
                                userHasRole(user.id, role.id)
                                  ? handleRemoveRole(user.id, role.id)
                                  : handleAssignRole(user.id, role.id)
                              }
                              className={`p-1.5 rounded-md transition-colors ${
                                userHasRole(user.id, role.id)
                                  ? 'bg-green-100 text-green-600 hover:bg-red-100 hover:text-red-600'
                                  : 'bg-gray-100 text-gray-400 hover:bg-orange-100 hover:text-orange-600'
                              }`}
                              title={userHasRole(user.id, role.id) ? 'Remove role' : 'Assign role'}
                            >
                              {userHasRole(user.id, role.id) ? <FiCheck className="w-4 h-4" /> : <FiX className="w-4 h-4" />}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Create Role Modal */}
        {showCreateRole && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create New Role</h3>
                <button onClick={() => setShowCreateRole(false)} className="text-gray-400 hover:text-gray-600">
                  <FiX className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role Name</label>
                  <input
                    type="text"
                    value={newRole.name}
                    onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., moderator"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                  <textarea
                    value={newRole.description}
                    onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    rows={3}
                    placeholder="What this role can do..."
                  />
                </div>
              </div>
              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreateRole(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateRole}
                  className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
                >
                  Create Role
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
