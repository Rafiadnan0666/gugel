import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export const useDraftCollaboration = (draftId: string, userId: string) => {
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [cursorPositions, setCursorPositions] = useState<Record<string, any>>({});
  const supabase = createClient();

  useEffect(() => {
    if (!draftId || !userId) return;

    const channel = supabase.channel(`draft:${draftId}`);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const users = Object.values(state).flat() as any[];
        setOnlineUsers(users.filter(user => user.user_id !== userId));
      })
      .on('broadcast', { event: 'cursor_move' }, ({ payload }) => {
        setCursorPositions(prev => ({
          ...prev,
          [payload.userId]: payload.position
        }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [draftId, userId, supabase]);

  const broadcastCursorPosition = (position: any) => {
    const channel = supabase.channel(`draft:${draftId}`);
    channel.send({
      type: 'broadcast',
      event: 'cursor_move',
      payload: { userId, position }
    });
  };

  return { onlineUsers, cursorPositions, broadcastCursorPosition };
};
