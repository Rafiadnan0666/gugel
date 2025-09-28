
"use client";

import React, { useState } from 'react';
import { FiAlertCircle } from 'react-icons/fi';
import { createClient } from '@/utils/supabase/client';
import { ISessionCollaborator } from '@/types/main.db';

// Enhanced Invite Collaborator Form
export const InviteCollaboratorForm: React.FC<{
  sessionId: string;
  onInviteSent: () => void;
  currentCollaborators: ISessionCollaborator[];
}> = ({ sessionId, onInviteSent, currentCollaborators }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Validate email format
      const emailRegex = /^[^\]+@[^\]+\.[^\]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Please enter a valid email address.');
      }

      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        throw new Error('User not found. Please check the email address or ask them to create an account first.');
      }

      // Check if already a collaborator
      const isAlreadyCollaborator = currentCollaborators.some(collab => collab.user_id === userData.id);
      if (isAlreadyCollaborator) {
        throw new Error('This user is already a collaborator on this research session.');
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Authentication required');

      // Add collaborator
      const { error: insertError } = await supabase
        .from('session_collaborators')
        .insert({
          session_id: sessionId,
          user_id: userData.id,
          role: role,
          invited_at: new Date().toISOString(),
          invited_by: user.id
        });

      if (insertError) throw insertError;

      onInviteSent();
      setEmail('');
      setMessage('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleInvite} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm flex items-start space-x-3">
          <FiAlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-medium">Invitation Failed</div>
            <div>{error}</div>
          </div>
        </div>
      )}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="collaborator@university.edu"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          required
          disabled={isLoading}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">Collaborator Role *</label>
        <div className="space-y-3">
          <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="radio"
              value="editor"
              checked={role === 'editor'}
              onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
              className="text-blue-600 focus:ring-blue-500 mt-1"
              disabled={isLoading}
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900">Editor</span>
              <p className="text-sm text-gray-600 mt-1">
                Can edit content, add research tabs, manage drafts, and invite other collaborators
              </p>
            </div>
          </label>
          <label className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="radio"
              value="viewer"
              checked={role === 'viewer'}
              onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
              className="text-blue-600 focus:ring-blue-500 mt-1"
              disabled={isLoading}
            />
            <div className="flex-1">
              <span className="font-medium text-gray-900">Viewer</span>
              <p className="text-sm text-gray-600 mt-1">
                Can view content and comments but cannot make changes or invite others
              </p>
            </div>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Personal Message (Optional)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Add a personal message to introduce the research project and collaboration..."
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-gradient-to-br from-blue-600 to-blue-700 text-white py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 transition-all font-medium shadow-sm"
      >
        {isLoading ? (
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Sending Invitation...</span>
          </div>
        ) : (
          'Send Collaboration Invite'
        )}
      </button>
    </form>
  );
};
