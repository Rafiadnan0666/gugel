
"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

// Enhanced Collaboration Hook with Real-time Features
export const useAdvancedCollaboration = (sessionId: string, userId: string) => {
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [collaborationEvents, setCollaborationEvents] = useState<any[]>([]);
  const [isCollaborativeEditing, setIsCollaborativeEditing] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!sessionId || !userId) return;

    let channel: any;

    const setupRealtime = async () => {
      try {
        channel = supabase.channel(`session:${sessionId}`, {
          config: {
            presence: {
              key: userId
            }
          }
        });

        channel
          .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const users = Object.values(state).flat() as any[];
            setOnlineUsers(users.filter(user => user.user_id !== userId));
          })
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'tabs', filter: `session_id=eq.${sessionId}` },
            (payload: any) => {
              setCollaborationEvents(prev => [...prev.slice(-49), {
                type: 'tab_update',
                payload,
                timestamp: new Date(),
                user: payload.new?.user_id || 'system'
              }]);
            }
          )
          .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'drafts', filter: `research_session_id=eq.${sessionId}` },
            (payload: any) => {
              setCollaborationEvents(prev => [...prev.slice(-49), {
                type: 'draft_update',
                payload,
                timestamp: new Date(),
                user: payload.new?.user_id || 'system'
              }]);
            }
          )
          .on('broadcast', { event: 'collaboration_message' }, (payload: any) => {
            setCollaborationEvents(prev => [...prev.slice(-49), {
              type: 'collaboration_message',
              payload,
              timestamp: new Date(),
              user: payload.payload.user_id
            }]);
          })
          .subscribe(async (status: string) => {
            setIsConnected(status === 'SUBSCRIBED');
            if (status === 'SUBSCRIBED') {
              await channel.track({
                user_id: userId,
                online_at: new Date().toISOString(),
                last_active: new Date().toISOString(),
                status: 'online'
              });
            }
          });

      } catch (error) {
        console.error('Collaboration setup error:', error);
        setIsConnected(false);
      }
    };

    setupRealtime();

    return () => {
      if (channel) {
        channel.unsubscribe();
      }
    };
  }, [sessionId, userId, supabase]);

  const sendCollaborationMessage = async (message: string) => {
    try {
      const channel = supabase.channel(`session:${sessionId}`);
      await channel.send({
        type: 'broadcast',
        event: 'collaboration_message',
        payload: { 
          message, 
          user_id: userId, 
          timestamp: new Date().toISOString() 
        }
      });
    } catch (error) {
      console.error('Error sending collaboration message:', error);
    }
  };

  return {
    onlineUsers,
    collaborationEvents,
    isCollaborativeEditing,
    setIsCollaborativeEditing,
    sendCollaborationMessage,
    isConnected
  };
};
