import { motion } from 'framer-motion';
import { User, MapPin, Award, Clock, CheckCircle2, Edit2, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useAverageRating } from '@/hooks/useAverageRating';
import { SKILL_OPTIONS } from '@/types/database';

const BADGE_INFO: Record<string, { icon: string; label: string; description: string }> = {
  'first_helper': { icon: '🌟', label: 'First Helper', description: 'Completed your first task' },
  'community_hero': { icon: '🦸', label: 'Community Hero', description: 'Helped 10+ people' },
  'speed_demon': { icon: '⚡', label: 'Speed Demon', description: 'Completed 5 urgent tasks' },
  'local_legend': { icon: '🏆', label: 'Local Legend', description: 'Top volunteer in your area' },
  'helping_hand': { icon: '🤝', label: 'Helping Hand', description: 'Completed 5 tasks' },
  'super_volunteer': { icon: '💪', label: 'Super Volunteer', description: '20+ hours volunteered' },
};

interface ProfileCardProps {
  onEditProfile?: () => void;
}

export function ProfileCard({ onEditProfile }: ProfileCardProps) {
  const { profile, user } = useAuth();
  const { average, count } = useAverageRating(user?.id);

  if (!profile || !user) return null;

  const tasksToNextBadge = Math.max(0, 5 - (profile.tasks_completed || 0));
  const progressToNextBadge = Math.min(100, ((profile.tasks_completed || 0) / 5) * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="overflow-hidden">
        {/* Header with gradient */}
        <div className="h-20 hero-gradient" />
        
        <CardContent className="relative pt-0 pb-6">
          {/* Avatar */}
          <div className="flex items-end justify-between -mt-10 mb-4">
            <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {profile.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" onClick={onEditProfile}>
              <Edit2 className="w-3.5 h-3.5 mr-1.5" />
              Edit
            </Button>
          </div>

          {/* Name & location */}
          <div className="mb-4">
            <h3 className="text-xl font-semibold">
              {profile.full_name || 'Anonymous Helper'}
            </h3>
            {profile.location_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {profile.location_name}
              </p>
            )}
          </div>

           {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary mx-auto mb-2">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">{profile.tasks_completed || 0}</p>
              <p className="text-xs text-muted-foreground">Tasks Done</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/10 text-success mx-auto mb-2">
                <Clock className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">{profile.total_volunteer_hours || 0}</p>
              <p className="text-xs text-muted-foreground">Hours</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning/10 text-warning mx-auto mb-2">
                <Award className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">{profile.badges?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Badges</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-warning/10 text-warning mx-auto mb-2">
                <Star className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">
                {average > 0 ? average.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                {count > 0 ? `${count} ratings` : 'No ratings'}
              </p>
            </div>
          </div>

          {/* Progress to next badge */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progress to next badge</span>
              <span className="font-medium">{tasksToNextBadge} tasks to go</span>
            </div>
            <Progress value={progressToNextBadge} className="h-2" />
          </div>

          {/* Skills */}
          {profile.skills && profile.skills.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium mb-2">Your Skills</h4>
              <div className="flex flex-wrap gap-1.5">
                {profile.skills.map((skill) => (
                  <Badge key={skill} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Badges */}
          {profile.badges && profile.badges.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Earned Badges</h4>
              <div className="flex flex-wrap gap-2">
                {profile.badges.map((badge) => {
                  const info = BADGE_INFO[badge];
                  if (!info) return null;
                  return (
                    <div
                      key={badge}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/20"
                      title={info.description}
                    >
                      <span>{info.icon}</span>
                      <span className="text-xs font-medium">{info.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}