import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2, Check, ArrowLeft, Sparkles, Clock, Zap } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationPicker } from '@/components/LocationPicker';
import { TaskUrgency, TimeNeeded, TIME_LABELS, URGENCY_LABELS } from '@/types/database';
import { useTasks } from '@/hooks/useTasks';
import { useToast } from '@/hooks/use-toast';

type Step = 'record' | 'processing' | 'review';

interface VoiceTaskModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProcessedTask {
  title: string;
  description: string;
  urgency: TaskUrgency;
  time_needed: TimeNeeded;
  location?: string | null;
  location_name?: string;
  location_lat?: number;
  location_lng?: number;
}

interface LocationData {
  name: string;
  lat: number;
  lng: number;
}

export function VoiceTaskModal({ open, onOpenChange }: VoiceTaskModalProps) {
  const { createTask } = useTasks();
  const { toast } = useToast();
  
  const [step, setStep] = useState<Step>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [processingMessage, setProcessingMessage] = useState('');
  const [processedTask, setProcessedTask] = useState<ProcessedTask | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleLocationChange = (name: string, lat: number, lng: number) => {
    setLocation({ name, lat, lng });
  };

  const resetModal = () => {
    setStep('record');
    setIsRecording(false);
    setProcessingMessage('');
    setProcessedTask(null);
    setLocation(null);
    setIsSubmitting(false);
    audioChunksRef.current = [];
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetModal();
    }
    onOpenChange(newOpen);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processRecording();
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Microphone access denied',
        description: 'Please allow microphone access to use voice input.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processRecording = async () => {
    setStep('processing');
    setProcessingMessage('Converting speech to text...');
    
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Step 1: Send to ElevenLabs for transcription
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const transcribeResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/voice-to-text`,
        {
          method: 'POST',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: formData,
        }
      );
      
       if (!transcribeResponse.ok) {
         const errText = await transcribeResponse.text().catch(() => '');
         throw new Error(errText || `Failed to transcribe audio (${transcribeResponse.status})`);
       }
      
      const transcription = await transcribeResponse.json();
      const transcribedText = transcription.text;
      
      if (!transcribedText || transcribedText.trim().length === 0) {
        throw new Error('No speech detected');
      }
      
      console.log('Transcribed text:', transcribedText);
      
      // Step 2: Process with AI to structure the task
      setProcessingMessage('AI is creating your task...');
      
      const processResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-voice-task`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ transcribedText }),
        }
      );
      
      if (!processResponse.ok) {
        throw new Error('Failed to process task');
      }
      
      const taskData = await processResponse.json();
      console.log('Processed task:', taskData);
      
      setProcessedTask(taskData as ProcessedTask);
      
      // If AI extracted and geocoded a location, pre-fill it
      if (taskData.location_lat && taskData.location_lng && taskData.location_name) {
        setLocation({
          name: taskData.location_name,
          lat: taskData.location_lat,
          lng: taskData.location_lng,
        });
      }
      
      setStep('review');
      
    } catch (error) {
      console.error('Processing error:', error);
      toast({
        title: 'Processing failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
      setStep('record');
    }
  };

  const handleSubmit = async () => {
    if (!processedTask || !location) {
      toast({
        title: 'Missing location',
        description: 'Please enter or detect a location for your task.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await createTask({
      title: processedTask.title,
      description: processedTask.description,
      location_lat: location.lat,
      location_lng: location.lng,
      location_name: location.name,
      time_needed: processedTask.time_needed,
      urgency: processedTask.urgency,
      skills_needed: [],
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
      handleOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <AnimatePresence mode="wait">
          {/* Step 1: Record */}
          {step === 'record' && (
            <motion.div
              key="record"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center py-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold mb-2">Speak Your Task</h2>
                <p className="text-muted-foreground">
                  Tell us what you need help with
                </p>
              </div>
              
              <motion.button
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-destructive text-destructive-foreground animate-pulse' 
                    : 'hero-gradient text-primary-foreground hover:scale-105'
                }`}
                whileTap={{ scale: 0.95 }}
              >
                {isRecording ? (
                  <MicOff className="w-10 h-10" />
                ) : (
                  <Mic className="w-10 h-10" />
                )}
              </motion.button>
              
              <p className="mt-6 text-sm text-muted-foreground">
                {isRecording ? 'Tap to stop recording' : 'Tap to start recording'}
              </p>
              
              {isRecording && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 flex items-center gap-2 text-destructive"
                >
                  <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
                  Recording...
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 2: Processing */}
          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center py-12"
            >
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-full hero-gradient flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary-foreground" />
                </div>
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-primary"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
              <Loader2 className="w-6 h-6 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">{processingMessage}</p>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && processedTask && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStep('record')}
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                  <h2 className="text-lg font-semibold">Review Your Task</h2>
                  <p className="text-sm text-muted-foreground">AI-generated from your voice</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="voice-title">Title</Label>
                  <Input
                    id="voice-title"
                    value={processedTask.title}
                    onChange={(e) => setProcessedTask({ ...processedTask, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="voice-description">Description</Label>
                  <Textarea
                    id="voice-description"
                    value={processedTask.description}
                    onChange={(e) => setProcessedTask({ ...processedTask, description: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Location</Label>
                  <LocationPicker
                    value={location?.name || ''}
                    onChange={handleLocationChange}
                    placeholder="Enter address or detect location"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Time needed</Label>
                    <Select 
                      value={processedTask.time_needed} 
                      onValueChange={(v) => setProcessedTask({ ...processedTask, time_needed: v as TimeNeeded })}
                    >
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
                    <Select 
                      value={processedTask.urgency} 
                      onValueChange={(v) => setProcessedTask({ ...processedTask, urgency: v as TaskUrgency })}
                    >
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
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep('record')}
                  className="flex-1"
                >
                  Re-record
                </Button>
                <Button
                  variant="hero"
                  onClick={handleSubmit}
                  disabled={isSubmitting || !location}
                  className="flex-1"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Posting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Post Task
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
