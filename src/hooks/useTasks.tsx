import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Task, TaskStatus, TaskUrgency, TimeNeeded, Profile } from '@/types/database';
import { useAuth } from './useAuth';

interface CreateTaskData {
  title: string;
  description?: string;
  location_lat: number;
  location_lng: number;
  location_name: string;
  time_needed: TimeNeeded;
  urgency: TaskUrgency;
  skills_needed?: string[];
  max_volunteers?: number;
}

export function useTasks() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch tasks without the join first
      const { data: tasksData, error: fetchError } = await supabase
        .from('tasks')
        .select('*')
        .in('status', ['open', 'in_progress'])
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Fetch creator profiles separately
      const creatorIds = [...new Set((tasksData || []).map(t => t.creator_id))];
      let profilesMap: Record<string, Profile> = {};
      
      if (creatorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('user_id', creatorIds);
        
        if (profilesData) {
          profilesMap = profilesData.reduce((acc, p) => {
            acc[p.user_id] = p as Profile;
            return acc;
          }, {} as Record<string, Profile>);
        }
      }

      // Add distance and creator if user has location
      const tasksWithData = (tasksData || []).map(task => ({
        ...task,
        creator: profilesMap[task.creator_id] || undefined,
        distance: profile?.location_lat && profile?.location_lng
          ? calculateDistance(
              profile.location_lat,
              profile.location_lng,
              task.location_lat,
              task.location_lng
            )
          : undefined,
      })) as Task[];

      setTasks(tasksWithData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  };

  // Subscribe to realtime updates
  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.location_lat, profile?.location_lng]);

  const createTask = async (taskData: CreateTaskData) => {
    if (!user) return { error: new Error('Not authenticated') };

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        ...taskData,
        creator_id: user.id,
      })
      .select()
      .single();

    if (!error) {
      fetchTasks();
    }

    return { data, error };
  };

  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    const { error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId);

    if (!error) {
      fetchTasks();
    }

    return { error };
  };

  const acceptTask = async (taskId: string) => {
    if (!user) return { error: new Error('Not authenticated') };

    // Join as volunteer
    const { error: joinError } = await supabase
      .from('task_volunteers')
      .insert({
        task_id: taskId,
        volunteer_id: user.id,
      });

    if (joinError) return { error: joinError };

    // Update task status and volunteer count
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      const newCount = (task.current_volunteers || 0) + 1;
      const newStatus: TaskStatus = newCount >= task.max_volunteers ? 'in_progress' : task.status;
      
      await supabase
        .from('tasks')
        .update({
          current_volunteers: newCount,
          status: newStatus,
        })
        .eq('id', taskId);
    }

    fetchTasks();
    return { error: null };
  };

  const completeTask = async (taskId: string) => {
    // First, get the task details and accepted volunteers
    const task = tasks.find(t => t.id === taskId);
    
    // Update task status
    const { error } = await supabase
      .from('tasks')
      .update({
        status: 'completed' as TaskStatus,
        completed_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (error) {
      return { error };
    }

    // Get accepted volunteers for this task
    const { data: volunteers } = await supabase
      .from('task_volunteers')
      .select('volunteer_id')
      .eq('task_id', taskId)
      .eq('status', 'accepted');

    if (volunteers && volunteers.length > 0) {
      // Calculate hours based on time_needed
      const hoursMap: Record<string, number> = {
        '15min': 0.25,
        '30min': 0.5,
        '1hour': 1,
        '2hours': 2,
        'half_day': 4,
      };
      const hours = task ? hoursMap[task.time_needed] || 0.5 : 0.5;

      // Update each volunteer's profile stats
      for (const volunteer of volunteers) {
        // Get current profile stats
        const { data: profile } = await supabase
          .from('profiles')
          .select('tasks_completed, total_volunteer_hours')
          .eq('user_id', volunteer.volunteer_id)
          .maybeSingle();

        if (profile) {
          await supabase
            .from('profiles')
            .update({
              tasks_completed: (profile.tasks_completed || 0) + 1,
              total_volunteer_hours: (profile.total_volunteer_hours || 0) + hours,
            })
            .eq('user_id', volunteer.volunteer_id);
        }
      }
    }

    fetchTasks();
    return { error: null };
  };

  return {
    tasks,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    acceptTask,
    completeTask,
  };
}