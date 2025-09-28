'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';

const InviteCollaboratorForm: React.FC<{
  sessionId: string;
  sessionTitle: string;
  onInviteSent: () => void;
}> = ({ sessionId, sessionTitle, onInviteSent }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const supabase = createClient();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {

      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

      if (userError || !userData) {
        throw new Error('User with this email not found.');
      }

      const userId = userData.id;


      const { data: existingCollaborator, error: existingError } = await supabase
        .from('session_collaborators')
        .select('id')
        .eq('session_id', sessionId)
        .eq('user_id', userId)
        .single();

      if (existingCollaborator) {
        throw new Error('User is already a collaborator.');
      }


      const { error: insertError } = await supabase
        .from('session_collaborators')
        .insert({
          session_id: sessionId,
          user_id: userId,
          role: role,
        });

      if (insertError) {
        throw insertError;
      }

      // Create notification
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          type: 'session_invitation',
          message: `You have been invited to collaborate on the session "${sessionTitle}" `,
          read: false,
        });

      if (notificationError) {
        throw notificationError;
      }

      setSuccess(`Successfully invited ${email} as a ${role}.`);
      setEmail('');
      onInviteSent();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleInvite} className="space-y-4">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>}
      {success && <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800">{success}</div>}
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="collaborator@example.com"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as 'editor' | 'viewer')}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="viewer">Viewer</option>
          <option value="editor">Editor</option>
        </select>
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
        >
          {isLoading ? 'Sending Invite...' : 'Send Invite'}
        </button>
      </div>
    </form>
  );
};

export default InviteCollaboratorForm;
