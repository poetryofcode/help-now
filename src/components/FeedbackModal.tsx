import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FeedbackRecipient {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  recipients: FeedbackRecipient[];
  onComplete?: () => void;
}

export function FeedbackModal({
  open,
  onOpenChange,
  taskId,
  recipients,
  onComplete,
}: FeedbackModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [hoveredStar, setHoveredStar] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentRecipient = recipients[currentIndex];
  const currentRating = ratings[currentRecipient?.id] || 0;
  const currentComment = comments[currentRecipient?.id] || '';
  const isLastRecipient = currentIndex === recipients.length - 1;

  const handleStarClick = (rating: number) => {
    if (currentRecipient) {
      setRatings((prev) => ({ ...prev, [currentRecipient.id]: rating }));
    }
  };

  const handleCommentChange = (comment: string) => {
    if (currentRecipient) {
      setComments((prev) => ({ ...prev, [currentRecipient.id]: comment }));
    }
  };

  const submitFeedback = async () => {
    if (!user || !currentRecipient || currentRating === 0) return;

    setIsSubmitting(true);

    const { error } = await supabase.from('feedback').insert({
      task_id: taskId,
      from_user_id: user.id,
      to_user_id: currentRecipient.id,
      rating: currentRating,
      comment: currentComment || null,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Failed to submit feedback',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    if (isLastRecipient) {
      toast({
        title: 'Thank you!',
        description: 'Your feedback has been submitted.',
      });
      onOpenChange(false);
      onComplete?.();
    } else {
      setCurrentIndex((prev) => prev + 1);
      setHoveredStar(0);
    }
  };

  const handleSkip = () => {
    if (isLastRecipient) {
      onOpenChange(false);
      onComplete?.();
    } else {
      setCurrentIndex((prev) => prev + 1);
      setHoveredStar(0);
    }
  };

  if (!currentRecipient) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate Your Experience</DialogTitle>
          <DialogDescription>
            {recipients.length > 1
              ? `Feedback ${currentIndex + 1} of ${recipients.length}`
              : 'Share your experience with this helper'}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          key={currentRecipient.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="space-y-6 py-4"
        >
          {/* Recipient info */}
          <div className="flex flex-col items-center gap-3">
            <Avatar className="w-16 h-16">
              <AvatarImage src={currentRecipient.avatar_url || undefined} />
              <AvatarFallback className="text-lg">
                {currentRecipient.name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
            <p className="font-medium text-lg">{currentRecipient.name}</p>
          </div>

          {/* Star rating */}
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <motion.button
                key={star}
                type="button"
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleStarClick(star)}
                onMouseEnter={() => setHoveredStar(star)}
                onMouseLeave={() => setHoveredStar(0)}
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              >
                <Star
                  className={cn(
                    'w-10 h-10 transition-colors duration-150',
                    (hoveredStar || currentRating) >= star
                      ? 'fill-warning text-warning'
                      : 'text-muted-foreground/30'
                  )}
                />
              </motion.button>
            ))}
          </div>

          {/* Comment */}
          <div>
            <Textarea
              placeholder="Leave a comment (optional)"
              value={currentComment}
              onChange={(e) => handleCommentChange(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </motion.div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button variant="ghost" onClick={handleSkip} className="flex-1">
            Skip
          </Button>
          <Button
            variant="hero"
            onClick={submitFeedback}
            disabled={currentRating === 0 || isSubmitting}
            className="flex-1"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                {isLastRecipient ? 'Submit' : 'Next'}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
