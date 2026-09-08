import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { PresenceUser, Profile } from '@/types/main.db';

export const useRealTimePresence = (draftId: string) => {
  const [presenceUsers, setPresenceUsers] = useState<PresenceUser[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!draftId) return;

    // Track user presence
    const trackPresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Add user to presence
      const userPresence: PresenceUser = {
        user_id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        avatar_url: user.user_metadata?.avatar_url || '',
        online_at: new Date(),
        last_seen: new Date(),
        status: 'online'
      };

      setPresenceUsers(prev => {
        const existing = prev.find(p => p.user_id === user.id);
        if (existing) return prev;
        return [...prev, userPresence];
      });

      // Set up channel for real-time presence
      const channel = supabase.channel(`draft:${draftId}`)
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const users = Object.values(state).flat() as any[];
          
          const presenceData: PresenceUser[] = users.map((user: any) => ({
            user_id: user.user_id,
            name: user.profile?.full_name || 'User',
            avatar_url: user.profile?.avatar_url || null,
            online_at: new Date(),
            last_seen: new Date(),
            status: 'online'
          }));
          
          setPresenceUsers(presenceData);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left:', leftPresences);
        });

      // Subscribe to presence
      channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            profile: userPresence.profile,
            online_at: new Date().toISOString()
          });
        }
      });

      return () => {
        channel.unsubscribe();
      };
    };

    trackPresence();
  }, [draftId, supabase]);

  return { presenceUsers };
};