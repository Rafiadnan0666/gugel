'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

// Enhanced Real-time Collaboration Hook
export const useCollaboration = (sessionId: string, userId: string) => {
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [isCollaborativeEditing, setIsCollaborativeEditing] = useState(false);
  const [cursorPositions, setCursorPositions] = useState<Record<string, any>>({});
  const [editingStates, setEditingStates] = useState<Record<string, any>>({});
  const supabase = createClient();

  useEffect(() => {
    if (!sessionId || !userId) return;

    const channel = supabase.channel(`session:${sessionId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        setOnlineUsers(users.filter(user => user.user_id !== userId));
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('User joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('User left:', leftPresences);
      })
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        setCursorPositions(prev => ({
          ...prev,
          [payload.userId]: payload.position
        }));
      })
      .on('broadcast', { event: 'editing_state' }, ({ payload }) => {
        setEditingStates(prev => ({
          ...prev,
          [payload.userId]: payload.state
        }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
            cursor_position: null,
            editing_state: null
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [sessionId, userId, supabase]);

  const broadcastCursorPosition = (position: any) => {
    const channel = supabase.channel(`session:${sessionId}`);
    channel.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: { userId, position }
    });
  };

  const broadcastEditingState = (state: any) => {
    const channel = supabase.channel(`session:${sessionId}`);
    channel.send({
      type: 'broadcast',
      event: 'editing_state',
      payload: { userId, state }
    });
  };

  return {
    onlineUsers,
    isCollaborativeEditing,
    setIsCollaborativeEditing,
    cursorPositions,
    editingStates,
    broadcastCursorPosition,
    broadcastEditingState
  };
};
