import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Clock, Users, Zap, Check, X, 
  Loader2, UserPlus, UserCheck, UserX, MessageCircle 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Task, TIME_LABELS, URGENCY_LABELS } from '@/types/database';
import { useTaskVolunteers, VolunteerWithProfile } from '@/hooks/useTaskVolunteers';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface TaskDetailModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailModal({ task, open, onOpenChange }: TaskDetailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    volunteers,
    loading: volunteersLoading,
    userVolunteerStatus,
    offerToHelp,
    acceptVolunteer,
    rejectVolunteer,
    withdrawOffer,
    pendingCount,
    acceptedCount,
  } = useTaskVolunteers(task?.id);

  const isCreator = task?.creator_id === user?.id;
  const canOffer = !isCreator && !userVolunteerStatus && task?.status === 'open';

  const handleOfferToHelp = async () => {
    if (!task) return;
    setIsSubmitting(true);
    
    const { error } = await offerToHelp(task.id);
    
    setIsSubmitting(false);
    if (error) {
      toast({
        title: 'Failed to offer help',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Offer sent!',
        description: 'The task creator will review your request.',
      });
    }
  };

  const handleWithdraw = async () => {
    setIsSubmitting(true);
    const { error } = await withdrawOffer();
    setIsSubmitting(false);
    
    if (error) {
      toast({
        title: 'Failed to withdraw',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Offer withdrawn',
        description: 'You can offer to help again anytime.',
      });
    }
  };

  const handleAcceptVolunteer = async (volunteerId: string) => {
    const { error } = await acceptVolunteer(volunteerId);
    if (error) {
      toast({
        title: 'Failed to accept',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Volunteer accepted!',
        description: 'They can now help with this task.',
      });
    }
  };

  const handleRejectVolunteer = async (volunteerId: string) => {
    const { error } = await rejectVolunteer(volunteerId);
    if (error) {
      toast({
        title: 'Failed to reject',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (!task) return null;

  const urgencyClasses = {
    low: 'bg-success/10 text-success border-success/30',
    medium: 'bg-warning/10 text-warning border-warning/30',
    high: 'bg-destructive/10 text-destructive border-destructive/30',
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold pr-8">
            {task.ai_improved_title || task.title}
          </DialogTitle>
          <DialogDescription className="sr-only">Task details and volunteer management</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-5 pb-4">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={urgencyClasses[task.urgency]}>
                {task.urgency === 'high' && <Zap className="w-3 h-3 mr-1" />}
                {URGENCY_LABELS[task.urgency]} Priority
              </Badge>
              <Badge variant="outline">
                <Clock className="w-3 h-3 mr-1" />
                {TIME_LABELS[task.time_needed]}
              </Badge>
              <Badge variant="outline">
                <Users className="w-3 h-3 mr-1" />
                {acceptedCount}/{task.max_volunteers} helpers
              </Badge>
            </div>

            {/* Description */}
            {task.description && (
              <p className="text-muted-foreground">{task.description}</p>
            )}

            {/* Location */}
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{task.location_name}</span>
            </div>

            {/* Skills */}
            {task.skills_needed && task.skills_needed.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Skills needed:</p>
                <div className="flex flex-wrap gap-1.5">
                  {task.skills_needed.map((skill) => (
                    <Badge key={skill} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Separator />

            {/* Volunteer section for creator */}
            {isCreator && (
              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Volunteers
                  {pendingCount > 0 && (
                    <Badge variant="default" className="text-xs">
                      {pendingCount} pending
                    </Badge>
                  )}
                </h3>

                {volunteersLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : volunteers.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No volunteers yet. Share this task to get help!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {volunteers.map((volunteer) => (
                      <VolunteerCard
                        key={volunteer.id}
                        volunteer={volunteer}
                        onAccept={() => handleAcceptVolunteer(volunteer.volunteer_id)}
                        onReject={() => handleRejectVolunteer(volunteer.volunteer_id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Volunteer status for non-creators */}
            {!isCreator && userVolunteerStatus && (
              <div className={cn(
                "p-4 rounded-lg border",
                userVolunteerStatus === 'pending' && "bg-warning/5 border-warning/30",
                userVolunteerStatus === 'accepted' && "bg-success/5 border-success/30",
                userVolunteerStatus === 'rejected' && "bg-destructive/5 border-destructive/30"
              )}>
                <div className="flex items-center gap-2">
                  {userVolunteerStatus === 'pending' && (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-warning" />
                      <span className="text-sm font-medium">Your offer is pending review</span>
                    </>
                  )}
                  {userVolunteerStatus === 'accepted' && (
                    <>
                      <Check className="w-4 h-4 text-success" />
                      <span className="text-sm font-medium">You're helping with this task!</span>
                    </>
                  )}
                  {userVolunteerStatus === 'rejected' && (
                    <>
                      <X className="w-4 h-4 text-destructive" />
                      <span className="text-sm font-medium">Your offer was not accepted</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="pt-4 border-t flex gap-3">
          {canOffer && (
            <Button
              onClick={handleOfferToHelp}
              disabled={isSubmitting}
              variant="hero"
              className="flex-1"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Offer to Help
                </>
              )}
            </Button>
          )}

          {userVolunteerStatus === 'pending' && (
            <Button
              onClick={handleWithdraw}
              disabled={isSubmitting}
              variant="outline"
              className="flex-1"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Withdraw Offer'
              )}
            </Button>
          )}

          {userVolunteerStatus === 'accepted' && (
            <Button variant="outline" className="flex-1">
              <MessageCircle className="w-4 h-4" />
              Message
            </Button>
          )}

          {isCreator && task.status !== 'completed' && acceptedCount > 0 && (
            <Button variant="hero" className="flex-1">
              <Check className="w-4 h-4" />
              Mark Complete
            </Button>
          )}

          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface VolunteerCardProps {
  volunteer: VolunteerWithProfile;
  onAccept: () => void;
  onReject: () => void;
}

function VolunteerCard({ volunteer, onAccept, onReject }: VolunteerCardProps) {
  const statusStyles = {
    pending: 'border-warning/30 bg-warning/5',
    accepted: 'border-success/30 bg-success/5',
    rejected: 'border-muted bg-muted/20 opacity-60',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-lg border",
        statusStyles[volunteer.status as keyof typeof statusStyles] || 'border-border'
      )}
    >
      <Avatar className="w-10 h-10">
        <AvatarImage src={volunteer.profile?.avatar_url || undefined} />
        <AvatarFallback>
          {volunteer.profile?.full_name?.[0]?.toUpperCase() || 'V'}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">
          {volunteer.profile?.full_name || 'Anonymous'}
        </p>
        <p className="text-xs text-muted-foreground">
          {volunteer.profile?.tasks_completed || 0} tasks completed
        </p>
      </div>

      {volunteer.status === 'pending' && (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" onClick={onAccept} className="h-8 w-8 text-success hover:text-success hover:bg-success/10">
            <UserCheck className="w-4 h-4" />
          </Button>
          <Button size="icon" variant="ghost" onClick={onReject} className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
            <UserX className="w-4 h-4" />
          </Button>
        </div>
      )}

      {volunteer.status === 'accepted' && (
        <Badge variant="outline" className="text-success border-success/30">
          <Check className="w-3 h-3 mr-1" />
          Accepted
        </Badge>
      )}

      {volunteer.status === 'rejected' && (
        <Badge variant="outline" className="text-muted-foreground">
          Declined
        </Badge>
      )}
    </motion.div>
  );
}
