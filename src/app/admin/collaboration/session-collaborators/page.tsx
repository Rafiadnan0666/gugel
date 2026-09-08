"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { SessionCollaborator, ResearchSession, Profile, SessionCollaboratorRole } from '@/types/main.db';
import { FiSearch, FiPlus, FiEdit2, FiTrash2, FiUsers, FiCalendar, FiUser, FiArchive } from 'react-icons/fi';

export default function SessionCollaboratorsPage() {
  const [collaborators, setCollaborators] = useState<(SessionCollaborator & { 
    research_sessions: ResearchSession,
    profiles: Profile 
  })[]>([]);
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCollaborator, setEditingCollaborator] = useState<SessionCollaborator | null>(null);
  const [formData, setFormData] = useState({
    session_id: '',
    user_id: '',
    role: 'viewer' as SessionCollaboratorRole
  });

  const supabase = createClient();

  const fetchData = async () => {
    const [collaboratorsResult, sessionsResult, usersResult] = await Promise.all([
      supabase
        .from('session_collaborators')
        .select(`
          *,
          research_sessions!inner(*),
          profiles!inner(*)
        `)
        .order('created_at', { ascending: false }),
      supabase
        .from('research_sessions')
        .select('*')
        .order('title'),
      supabase
        .from('profiles')
        .select('*')
        .order('full_name')
    ]);

    if (collaboratorsResult.error) {
      console.error('Error fetching collaborators:', collaboratorsResult.error);
    } else {
      setCollaborators(collaboratorsResult.data || []);
    }

    if (sessionsResult.error) {
      console.error('Error fetching sessions:', sessionsResult.error);
    } else {
      setSessions(sessionsResult.data || []);
    }

    if (usersResult.error) {
      console.error('Error fetching users:', usersResult.error);
    } else {
      setUsers(usersResult.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCollaborators = collaborators.filter((collaborator) => {
    const matchesSearch = 
      collaborator.research_sessions.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collaborator.profiles.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collaborator.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      collaborator.role.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let error;
    if (editingCollaborator) {
      const result = await supabase
        .from('session_collaborators')
        .update(formData)
        .eq('id', editingCollaborator.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('session_collaborators')
        .insert(formData);
      error = result.error;
    }

    if (error) {
      console.error('Error saving collaborator:', error);
      alert('Error saving collaborator');
    } else {
      await fetchData();
      setShowForm(false);
      setEditingCollaborator(null);
      setFormData({
        session_id: '',
        user_id: '',
        role: 'viewer'
      });
    }
  };

  const handleEdit = (collaborator: SessionCollaborator & { 
    research_sessions: ResearchSession,
    profiles: Profile 
  }) => {
    setEditingCollaborator(collaborator);
    setFormData({
      session_id: collaborator.session_id,
      user_id: collaborator.user_id,
      role: collaborator.role || 'viewer'
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this collaborator?')) return;
    
    const { error } = await supabase
      .from('session_collaborators')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting collaborator:', error);
      alert('Error deleting collaborator');
    } else {
      await fetchData();
    }
  };

  const getRoleColor = (role: SessionCollaboratorRole) => {
    switch (role) {
      case 'editor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100';
      case 'viewer':
        return 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const exportCSV = () => {
    const headers = ['Session', 'User', 'Email', 'Role', 'Created'];
    const csvData = filteredCollaborators.map((collaborator) => [
      collaborator.research_sessions.title,
      collaborator.profiles.full_name || 'Unknown',
      collaborator.profiles.email || 'N/A',
      collaborator.role || 'viewer',
      collaborator.created_at ? new Date(collaborator.created_at).toLocaleDateString() : 'N/A'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-collaborators-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6">Loading session collaborators...</div>;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Session Collaborators</h1>
        <div className="flex items-center space-x-4">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-300">
            Total Collaborators: {filteredCollaborators.length}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <FiPlus className="mr-2" /> Add Collaborator
          </button>
          <button
            onClick={exportCSV}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-lg font-semibold mb-4">
            {editingCollaborator ? 'Edit Collaborator' : 'Add New Collaborator'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Research Session</label>
              <select
                value={formData.session_id}
                onChange={(e) => setFormData({ ...formData, session_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                required
              >
                <option value="">Select a session</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">User</label>
              <select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                required
              >
                <option value="">Select a user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name || user.email || 'Unknown'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as SessionCollaboratorRole })}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                required
              >
                <option value="viewer">Viewer</option>
                <option value="editor">Editor</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingCollaborator ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingCollaborator(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-64">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search collaborators..."
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
                Session
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Role
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
            {filteredCollaborators.map((collaborator) => (
              <tr key={collaborator.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <FiArchive className="mr-2 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {collaborator.research_sessions.title}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        ID: {collaborator.research_sessions.id.slice(0, 8)}...
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-8 w-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold mr-3">
                      {collaborator.profiles.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {collaborator.profiles.full_name || 'Unknown'}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {collaborator.profiles.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleColor(collaborator.role || 'viewer')}`}>
                    {collaborator.role || 'viewer'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center">
                    <FiCalendar className="mr-2" />
                    {collaborator.created_at ? new Date(collaborator.created_at).toLocaleDateString() : 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleEdit(collaborator)}
                    className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-3"
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    onClick={() => handleDelete(collaborator.id)}
                    className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <FiTrash2 />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}