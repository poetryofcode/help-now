import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskMessage, Profile } from '@/types/database';
import { useAuth } from './useAuth';

export interface MessageWithProfile extends TaskMessage {
  profile?: Profile;
}

export function useTaskMessages(taskId?: string) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const profilesCache = useRef<Record<string, Profile>>({});

  const fetchMessages = useCallback(async () => {
    if (!taskId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_messages')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch profiles for message authors
      const userIds = [...new Set((data || []).map(m => m.user_id))];
      const uncachedUserIds = userIds.filter(id => !profilesCache.current[id]);

      if (uncachedUserIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', uncachedUserIds);

        if (profilesData) {
          profilesData.forEach(p => {
            profilesCache.current[p.user_id] = p as Profile;
          });
        }
      }

      const messagesWithProfiles = (data || []).map(m => ({
        ...m,
        profile: profilesCache.current[m.user_id],
      }));

      setMessages(messagesWithProfiles);
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    fetchMessages();

    if (!taskId) return;

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`task-messages-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'task_messages',
          filter: `task_id=eq.${taskId}`,
        },
        async (payload) => {
          const newMessage = payload.new as TaskMessage;
          
          // Fetch profile if not cached
          if (!profilesCache.current[newMessage.user_id]) {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', newMessage.user_id)
              .maybeSingle();

            if (profileData) {
              profilesCache.current[newMessage.user_id] = profileData as Profile;
            }
          }

          const messageWithProfile: MessageWithProfile = {
            ...newMessage,
            profile: profilesCache.current[newMessage.user_id],
          };

          setMessages(prev => [...prev, messageWithProfile]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, fetchMessages]);

  const sendMessage = async (messageText: string) => {
    if (!user || !taskId || !messageText.trim()) {
      return { error: new Error('Cannot send message') };
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('task_messages')
        .insert({
          task_id: taskId,
          user_id: user.id,
          message: messageText.trim(),
        });

      if (error) throw error;
      return { error: null };
    } catch (err) {
      console.error('Error sending message:', err);
      return { error: err as Error };
    } finally {
      setSending(false);
    }
  };

  return {
    messages,
    loading,
    sending,
    sendMessage,
    fetchMessages,
  };
}
