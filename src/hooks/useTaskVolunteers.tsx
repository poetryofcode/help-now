import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TaskVolunteer, Profile } from '@/types/database';
import { useAuth } from './useAuth';

export type VolunteerStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';

export interface VolunteerWithProfile extends TaskVolunteer {
  profile?: Profile;
}

export function useTaskVolunteers(taskId?: string) {
  const { user } = useAuth();
  const [volunteers, setVolunteers] = useState<VolunteerWithProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [userVolunteerStatus, setUserVolunteerStatus] = useState<VolunteerStatus | null>(null);

  const fetchVolunteers = useCallback(async () => {
    if (!taskId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('task_volunteers')
        .select('*')
        .eq('task_id', taskId);

      if (error) throw error;

      // Fetch profiles for volunteers
      const volunteerIds = (data || []).map(v => v.volunteer_id);
      let profilesMap: Record<string, Profile> = {};

      if (volunteerIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', volunteerIds);

        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.user_id] = p as Profile;
            return acc;
          }, {} as Record<string, Profile>);
        }
      }

      const volunteersWithProfiles = (data || []).map(v => ({
        ...v,
        profile: profilesMap[v.volunteer_id],
      }));

      setVolunteers(volunteersWithProfiles);

      // Check if current user is a volunteer on this task
      if (user) {
        const userVolunteer = volunteersWithProfiles.find(v => v.volunteer_id === user.id);
        setUserVolunteerStatus(userVolunteer?.status as VolunteerStatus || null);
      }
    } catch (err) {
      console.error('Error fetching volunteers:', err);
    } finally {
      setLoading(false);
    }
  }, [taskId, user]);

  useEffect(() => {
    fetchVolunteers();

    if (!taskId) return;

    // Subscribe to realtime updates
    const channel = supabase
      .channel(`task-volunteers-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_volunteers',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          fetchVolunteers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, fetchVolunteers]);

  // Offer to help (volunteer joins with pending status)
  const offerToHelp = async (taskId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('task_volunteers')
      .insert({
        task_id: taskId,
        volunteer_id: user.id,
        status: 'pending',
      });

    if (!error) {
      setUserVolunteerStatus('pending');
      fetchVolunteers();
    }

    return { error };
  };

  // Creator accepts a volunteer
  const acceptVolunteer = async (volunteerId: string) => {
    if (!taskId) return { error: new Error('No task ID') };

    const { error } = await supabase
      .from('task_volunteers')
      .update({ status: 'accepted' })
      .eq('task_id', taskId)
      .eq('volunteer_id', volunteerId);

    if (!error) {
      // Update the task volunteer count and status
      const acceptedCount = volunteers.filter(v => v.status === 'accepted').length + 1;
      await supabase
        .from('tasks')
        .update({
          current_volunteers: acceptedCount,
          status: 'in_progress',
        })
        .eq('id', taskId);

      fetchVolunteers();
    }

    return { error };
  };

  // Creator rejects a volunteer
  const rejectVolunteer = async (volunteerId: string) => {
    if (!taskId) return { error: new Error('No task ID') };

    const { error } = await supabase
      .from('task_volunteers')
      .update({ status: 'rejected' })
      .eq('task_id', taskId)
      .eq('volunteer_id', volunteerId);

    if (!error) {
      fetchVolunteers();
    }

    return { error };
  };

  // Volunteer withdraws their offer
  const withdrawOffer = async () => {
    if (!user || !taskId) return { error: new Error('Not authenticated') };

    const { error } = await supabase
      .from('task_volunteers')
      .delete()
      .eq('task_id', taskId)
      .eq('volunteer_id', user.id);

    if (!error) {
      setUserVolunteerStatus(null);
      fetchVolunteers();
    }

    return { error };
  };

  return {
    volunteers,
    loading,
    userVolunteerStatus,
    offerToHelp,
    acceptVolunteer,
    rejectVolunteer,
    withdrawOffer,
    fetchVolunteers,
    pendingCount: volunteers.filter(v => v.status === 'pending').length,
    acceptedCount: volunteers.filter(v => v.status === 'accepted').length,
  };
}
