"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Profile, UserRoleAssignment, UserRole } from '@/types/main.db';
import { FiSearch, FiEdit2, FiTrash2, FiUser, FiCalendar, FiShield, FiMail, FiSettings } from 'react-icons/fi';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<(Profile & { roles: UserRole[], user_role_assignments: UserRoleAssignment[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [availableRoles, setAvailableRoles] = useState<UserRole[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const supabase = createClient();

  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        user_role_assignments!inner(
          id,
          role_id,
          assigned_at,
          user_roles!inner(*)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.error('Error fetching users:', error);
    } else {
      const usersWithRoles = (data || []).map(user => ({
        ...user,
        roles: user.user_role_assignments.map(assignment => assignment.user_roles),
        user_role_assignments: user.user_role_assignments
      }));
      setUsers(usersWithRoles);
    }

    const { data: roles } = await supabase
      .from('user_roles')
      .select('*')
      .order('name');
    
    if (roles) {
      setAvailableRoles(roles);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      (user.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleRoleManagement = (user: Profile) => {
    setSelectedUser(user);
    const userRoles = users.find(u => u.id === user.id)?.roles || [];
    setSelectedRoles(userRoles.map(role => role.id));
    setShowRoleModal(true);
  };

  const handleRoleUpdate = async () => {
    if (!selectedUser) return;

    const { error } = await supabase
      .from('user_role_assignments')
      .upsert(
        selectedRoles.map(roleId => ({
          user_id: selectedUser.id,
          role_id: roleId,
          assigned_at: new Date().toISOString()
        }))
      );

    if (error) {
      console.error('Error updating roles:', error);
      alert('Error updating roles');
    } else {
      const { error: deleteError } = await supabase
        .from('user_role_assignments')
        .delete()
        .eq('user_id', selectedUser.id)
        .not('role_id', 'in', `(${selectedRoles.join(',')})`);

      if (deleteError) {
        console.error('Error removing roles:', deleteError);
      }

      await fetchUsers();
      setShowRoleModal(false);
      setSelectedUser(null);
      setSelectedRoles([]);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
      console.error('Error deleting user:', error);
      alert('Error deleting user');
    } else {
      await fetchUsers();
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Roles', 'Created', 'Last Updated'];
    const csvData = filteredUsers.map((user) => [
      user.full_name || 'Unknown',
      user.email || 'N/A',
      user.roles.map(role => role.name).join(', ') || 'No roles',
      user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A',
      user.updated_at ? new Date(user.updated_at).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6">Loading users...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Total Users: {filteredUsers.length}
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
            placeholder="Search users..."
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
                Roles
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Settings
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
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {(user.full_name || 'User').charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.full_name || 'Unknown User'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        <FiMail className="inline mr-1" />
                        {user.email || 'No email'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <span
                        key={role.id}
                        className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100"
                      >
                        {role.name}
                      </span>
                    ))}
                    {user.roles.length === 0 && (
                      <span className="text-sm text-gray-400">No roles</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {user.settings ? (
                      <span className="flex items-center">
                        <FiSettings className="mr-1" />
                        Configured
                      </span>
                    ) : (
                      <span className="text-gray-400">Default</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <FiCalendar className="mr-2" />
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleRoleManagement(user)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                    title="Manage Roles"
                  >
                    <FiShield />
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    title="Delete User"
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-screen overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Manage Roles for {selectedUser.full_name || 'User'}
              </h3>
              <button
                onClick={() => setShowRoleModal(false)}
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
                  {selectedUser.full_name || 'Unknown'}
                  <span className="text-gray-500 dark:text-gray-400 ml-2">
                    ({selectedUser.email})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Assign Roles
                </label>
                <div className="space-y-2">
                  {availableRoles.map((role) => (
                    <label key={role.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedRoles.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRoles([...selectedRoles, role.id]);
                          } else {
                            setSelectedRoles(selectedRoles.filter(id => id !== role.id));
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {role.name}
                        {role.description && (
                          <span className="text-gray-500 dark:text-gray-400 ml-2">
                            - {role.description}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-2">
              <button
                onClick={handleRoleUpdate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Update Roles
              </button>
              <button
                onClick={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                  setSelectedRoles([]);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}