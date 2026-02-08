import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Save, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SKILL_OPTIONS } from '@/types/database';

export default function ProfilePage() {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [locationName, setLocationName] = useState(profile?.location_name || '');
  const [availability, setAvailability] = useState(profile?.availability || 'now');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(profile?.skills || []);
  const [isSaving, setIsSaving] = useState(false);

  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleSkillToggle = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);

    // Mock coordinates - in production, use geocoding
    const mockLat = locationName ? 37.7749 + (Math.random() - 0.5) * 0.1 : null;
    const mockLng = locationName ? -122.4194 + (Math.random() - 0.5) * 0.1 : null;

    const { error } = await updateProfile({
      full_name: fullName || null,
      location_name: locationName || null,
      location_lat: mockLat,
      location_lng: mockLng,
      availability,
      skills: selectedSkills,
    });

    setIsSaving(false);

    if (error) {
      toast({
        title: 'Failed to save',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Profile saved',
        description: 'Your changes have been saved.',
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      
      <main className="flex-1 container py-8 max-w-2xl">
        {/* Back link */}
        <Link
          to="/tasks"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to tasks
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {fullName?.charAt(0) || user.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>Edit Profile</CardTitle>
                  <CardDescription>
                    Update your profile to help us match you with the right tasks
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  placeholder="Your name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="location"
                    placeholder="Your neighborhood or city"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We'll use this to show tasks near you
                </p>
              </div>

              {/* Availability */}
              <div className="space-y-2">
                <Label>When are you available?</Label>
                <Select value={availability} onValueChange={setAvailability}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Right now</SelectItem>
                    <SelectItem value="today">Sometime today</SelectItem>
                    <SelectItem value="weekend">This weekend</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Skills */}
              <div className="space-y-2">
                <Label>Your skills (select all that apply)</Label>
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
                <p className="text-xs text-muted-foreground">
                  This helps us match you with relevant tasks
                </p>
              </div>

              {/* Save button */}
              <Button
                onClick={handleSave}
                variant="hero"
                className="w-full"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}