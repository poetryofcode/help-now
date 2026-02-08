import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Zap, Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { LocationPicker } from '@/components/LocationPicker';
import { TaskUrgency, TimeNeeded, TIME_LABELS, URGENCY_LABELS, SKILL_OPTIONS } from '@/types/database';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CreateTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateTaskModal({ open, onOpenChange }: CreateTaskModalProps) {
  const { createTask } = useTasks();
  const { toast } = useToast();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [timeNeeded, setTimeNeeded] = useState<TimeNeeded>('30min');
  const [urgency, setUrgency] = useState<TaskUrgency>('medium');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  const handleLocationChange = (name: string, lat: number, lng: number) => {
    setLocation({ name, lat, lng });
  };

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleImproveWithAI = async () => {
    if (!title.trim()) return;
    
    setIsImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-task', {
        body: { title, description },
      });

      if (error) throw error;
      
      if (data?.improvedTitle) {
        setAiSuggestion(data.improvedTitle);
      }
    } catch (err) {
      console.error('AI improvement failed:', err);
      toast({
        title: 'AI suggestion unavailable',
        description: 'Continuing with your original title.',
        variant: 'destructive',
      });
    } finally {
      setIsImproving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !location) {
      toast({
        title: 'Missing information',
        description: 'Please fill in the title and location.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await createTask({
      title: aiSuggestion || title,
      description: description || undefined,
      location_lat: location.lat,
      location_lng: location.lng,
      location_name: location.name,
      time_needed: timeNeeded,
      urgency,
      skills_needed: selectedSkills,
    });

    setIsSubmitting(false);

    if (error) {
      toast({
        title: 'Failed to create task',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Task created!',
        description: 'Your help request is now live.',
      });
      onOpenChange(false);
      // Reset form
      setTitle('');
      setDescription('');
      setLocation(null);
      setTimeNeeded('30min');
      setUrgency('medium');
      setSelectedSkills([]);
      setAiSuggestion(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Post a Help Request</DialogTitle>
          <DialogDescription>
            Describe what you need help with. Your task will appear instantly in the live feed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          {/* Title with AI improve */}
          <div className="space-y-2">
            <Label htmlFor="title">What do you need help with?</Label>
            <div className="flex gap-2">
              <Input
                id="title"
                placeholder="e.g., Help carry groceries upstairs"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setAiSuggestion(null);
                }}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleImproveWithAI}
                disabled={!title.trim() || isImproving}
                title="Improve with AI"
              >
                {isImproving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
              </Button>
            </div>
            <AnimatePresence>
              {aiSuggestion && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3 rounded-lg bg-primary/5 border border-primary/20"
                >
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-primary">AI-improved title:</p>
                      <p className="text-sm text-foreground">{aiSuggestion}</p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setAiSuggestion(null)}
                        >
                          Keep original
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Details (optional)</Label>
            <Textarea
              id="description"
              placeholder="Any additional details that might help..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label>Location</Label>
            <LocationPicker
              value={location?.name || ''}
              onChange={handleLocationChange}
              placeholder="Enter address or detect location"
            />
          </div>

          {/* Time & Urgency */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Time needed</Label>
              <Select value={timeNeeded} onValueChange={(v) => setTimeNeeded(v as TimeNeeded)}>
                <SelectTrigger>
                  <Clock className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TIME_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Urgency</Label>
              <Select value={urgency} onValueChange={(v) => setUrgency(v as TaskUrgency)}>
                <SelectTrigger>
                  <Zap className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(URGENCY_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Skills */}
          <div className="space-y-2">
            <Label>Skills needed (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {SKILL_OPTIONS.map((skill) => (
                <Badge
                  key={skill}
                  variant={selectedSkills.includes(skill) ? 'default' : 'outline'}
                  className="cursor-pointer hover:bg-primary/10 transition-colors"
                  onClick={() => handleSkillToggle(skill)}
                >
                  {skill}
                </Badge>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="hero"
              disabled={isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post Task'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}