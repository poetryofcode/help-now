import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, SlidersHorizontal, Radio, MapPin, Clock, Zap } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TaskCard } from './TaskCard';
import { Task, TaskUrgency, TimeNeeded, TIME_LABELS } from '@/types/database';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface TaskFeedProps {
  onViewTask?: (task: Task) => void;
}

export function TaskFeed({ onViewTask }: TaskFeedProps) {
  const { tasks, loading, acceptTask } = useTasks();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [urgencyFilter, setUrgencyFilter] = useState<TaskUrgency | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<TimeNeeded | 'all'>('all');
  const [distanceFilter, setDistanceFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = tasks.filter(task => {
      // Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!task.title.toLowerCase().includes(query) &&
            !task.description?.toLowerCase().includes(query) &&
            !task.location_name.toLowerCase().includes(query)) {
          return false;
        }
      }

      // Urgency
      if (urgencyFilter !== 'all' && task.urgency !== urgencyFilter) {
        return false;
      }

      // Time
      if (timeFilter !== 'all' && task.time_needed !== timeFilter) {
        return false;
      }

      // Distance
      if (distanceFilter !== 'all' && task.distance !== undefined) {
        const maxDistance = parseFloat(distanceFilter);
        if (task.distance > maxDistance) {
          return false;
        }
      }

      return true;
    });

    // Sort by urgency and distance
    result.sort((a, b) => {
      // High urgency first
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      if (urgencyOrder[a.urgency] !== urgencyOrder[b.urgency]) {
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      }
      // Then by distance
      if (a.distance !== undefined && b.distance !== undefined) {
        return a.distance - b.distance;
      }
      return 0;
    });

    return result;
  }, [tasks, searchQuery, urgencyFilter, timeFilter, distanceFilter]);

  // Find best match based on user profile
  const bestMatchId = useMemo(() => {
    if (!profile?.skills?.length || !filteredTasks.length) return null;
    
    const userSkills = new Set(profile.skills);
    let bestTask: Task | null = null;
    let bestScore = 0;

    for (const task of filteredTasks) {
      let score = 0;
      
      // Skill match
      for (const skill of task.skills_needed || []) {
        if (userSkills.has(skill)) score += 2;
      }
      
      // Distance bonus (closer is better)
      if (task.distance !== undefined && task.distance < 5) {
        score += 2 - (task.distance / 5);
      }
      
      // Urgency bonus
      if (task.urgency === 'high') score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestTask = task;
      }
    }

    return bestScore > 0 ? bestTask?.id : null;
  }, [filteredTasks, profile?.skills]);

  const handleAcceptTask = async (task: Task) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to accept tasks.',
        variant: 'destructive',
      });
      return;
    }

    const { error } = await acceptTask(task.id);
    
    if (error) {
      toast({
        title: 'Failed to accept task',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Task accepted!',
        description: 'Check your profile for task details.',
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Live indicator & search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks by title, description, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-success/10 text-success text-sm font-medium">
            <Radio className="w-3 h-3 pulse-live" />
            Live
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="flex flex-wrap gap-3 p-4 rounded-lg bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <Select value={urgencyFilter} onValueChange={(v) => setUrgencyFilter(v as TaskUrgency | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Urgency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Urgency</SelectItem>
                <SelectItem value="high">Urgent</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <Select value={timeFilter} onValueChange={(v) => setTimeFilter(v as TimeNeeded | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Time</SelectItem>
                {Object.entries(TIME_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <Select value={distanceFilter} onValueChange={setDistanceFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Distance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any Distance</SelectItem>
                <SelectItem value="1">Within 1 mi</SelectItem>
                <SelectItem value="5">Within 5 mi</SelectItem>
                <SelectItem value="10">Within 10 mi</SelectItem>
                <SelectItem value="25">Within 25 mi</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(urgencyFilter !== 'all' || timeFilter !== 'all' || distanceFilter !== 'all') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setUrgencyFilter('all');
                setTimeFilter('all');
                setDistanceFilter('all');
              }}
            >
              Clear filters
            </Button>
          )}
        </motion.div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{filteredTasks.length} tasks available</span>
        {profile?.location_name && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Near {profile.location_name}
          </span>
        )}
      </div>

      {/* Task list */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        {loading ? (
          // Skeleton loading
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-5 rounded-xl border bg-card">
              <Skeleton className="h-6 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <div className="flex gap-3 mb-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-9 w-full" />
            </div>
          ))
        ) : filteredTasks.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">No tasks found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try adjusting your search or filters' : 'Be the first to post a help request!'}
            </p>
          </div>
        ) : (
          filteredTasks.map((task, index) => (
            <TaskCard
              key={task.id}
              task={task}
              isBestMatch={task.id === bestMatchId}
              onAccept={handleAcceptTask}
              onView={onViewTask}
              delay={index}
            />
          ))
        )}
      </div>
    </div>
  );
}