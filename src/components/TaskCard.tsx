import { motion } from 'framer-motion';
import { MapPin, Clock, Users, Zap, ChevronRight } from 'lucide-react';
import { Task, TIME_LABELS, URGENCY_LABELS } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  onAccept?: (task: Task) => void;
  onView?: (task: Task) => void;
  isBestMatch?: boolean;
  delay?: number;
}

export function TaskCard({ task, onAccept, onView, isBestMatch, delay = 0 }: TaskCardProps) {
  const urgencyClasses = {
    low: 'urgency-low',
    medium: 'urgency-medium',
    high: 'urgency-high',
  };

  const urgencyBgClasses = {
    low: 'bg-success/5 border-success/20',
    medium: 'bg-warning/5 border-warning/20',
    high: 'bg-destructive/5 border-destructive/20',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay * 0.1 }}
      className={cn(
        "relative group bg-card rounded-xl border shadow-card hover:shadow-lg transition-all duration-300 overflow-hidden",
        urgencyBgClasses[task.urgency],
        isBestMatch && "ring-2 ring-primary/50"
      )}
    >
      {/* Best match badge */}
      {isBestMatch && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
          ✨ Best Match
        </div>
      )}

      {/* Urgency indicator bar */}
      <div className={cn(
        "absolute top-0 left-0 w-1 h-full",
        task.urgency === 'low' && "bg-success",
        task.urgency === 'medium' && "bg-warning",
        task.urgency === 'high' && "bg-destructive"
      )} />

      <div className="p-5 pl-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg text-foreground line-clamp-1 group-hover:text-primary transition-colors">
              {task.ai_improved_title || task.title}
            </h3>
            {task.description && (
              <p className="text-muted-foreground text-sm mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <Badge variant="outline" className={cn("shrink-0", urgencyClasses[task.urgency])}>
            {task.urgency === 'high' && <Zap className="w-3 h-3 mr-1" />}
            {URGENCY_LABELS[task.urgency]}
          </Badge>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary/70" />
            <span className="line-clamp-1">
              {task.distance !== undefined 
                ? `${task.distance.toFixed(1)} mi away`
                : task.location_name
              }
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-primary/70" />
            <span>{TIME_LABELS[task.time_needed]}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary/70" />
            <span>{task.current_volunteers}/{task.max_volunteers} volunteers</span>
          </div>
        </div>

        {/* Skills */}
        {task.skills_needed && task.skills_needed.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {task.skills_needed.slice(0, 3).map((skill) => (
              <Badge key={skill} variant="secondary" className="text-xs">
                {skill}
              </Badge>
            ))}
            {task.skills_needed.length > 3 && (
              <Badge variant="secondary" className="text-xs">
                +{task.skills_needed.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <Button
            onClick={() => onAccept?.(task)}
            size="sm"
            className="flex-1"
            disabled={task.status !== 'open' || task.current_volunteers >= task.max_volunteers}
          >
            {task.status === 'in_progress' ? 'In Progress' : 'Accept Task'}
          </Button>
          <Button
            onClick={() => onView?.(task)}
            variant="ghost"
            size="sm"
            className="shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}