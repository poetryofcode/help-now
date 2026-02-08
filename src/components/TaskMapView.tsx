import { useState, useMemo, useEffect, useRef } from 'react';
import L, { Icon, DivIcon, LatLngBounds, Map as LeafletMap } from 'leaflet';
import { motion } from 'framer-motion';
import { MapPin, Clock, Users, Zap, Navigation, Minus, Plus } from 'lucide-react';
import { Task, TIME_LABELS, URGENCY_LABELS } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useTasks } from '@/hooks/useTasks';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (Icon.Default.prototype as any)._getIconUrl;
Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface TaskMapViewProps {
  onViewTask?: (task: Task) => void;
}

// Custom marker icons based on urgency
const createUrgencyIcon = (urgency: 'low' | 'medium' | 'high', isBestMatch: boolean = false) => {
  const colors = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444',
  };
  
  const color = colors[urgency];
  
  return new DivIcon({
    className: 'custom-marker',
    html: `
      <div class="relative flex items-center justify-center" style="width: 32px; height: 32px;">
        <div class="absolute inset-0 rounded-full animate-ping opacity-20" style="background-color: ${color}; width: 32px; height: 32px;"></div>
        <div class="relative w-8 h-8 rounded-full shadow-lg flex items-center justify-center" style="background-color: ${color};">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// User location marker
const userLocationIcon = new DivIcon({
  className: 'user-location-marker',
  html: `
    <div class="relative flex items-center justify-center" style="width: 24px; height: 24px;">
      <div class="absolute inset-0 rounded-full bg-blue-500/30 animate-ping" style="width: 24px; height: 24px;"></div>
      <div class="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-lg"></div>
    </div>
  `,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export function TaskMapView({ onViewTask }: TaskMapViewProps) {
  const { tasks, loading, acceptTask } = useTasks();
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  
  const [radiusFilter, setRadiusFilter] = useState<number>(25);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showRadius, setShowRadius] = useState(true);
  const [mapReady, setMapReady] = useState(false);
  
  const userLocation: [number, number] = useMemo(() => {
    if (profile?.location_lat && profile?.location_lng) {
      return [profile.location_lat, profile.location_lng];
    }
    return [40.7128, -74.006];
  }, [profile?.location_lat, profile?.location_lng]);

  // Filter tasks by radius
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.distance === undefined) return true;
      return task.distance <= radiusFilter;
    });
  }, [tasks, radiusFilter]);

  // Find best match
  const bestMatchId = useMemo(() => {
    if (!profile?.skills?.length || !filteredTasks.length) return null;
    
    const userSkills = new Set(profile.skills);
    let bestTask: Task | null = null;
    let bestScore = 0;

    for (const task of filteredTasks) {
      let score = 0;
      for (const skill of task.skills_needed || []) {
        if (userSkills.has(skill)) score += 2;
      }
      if (task.distance !== undefined && task.distance < 5) {
        score += 2 - (task.distance / 5);
      }
      if (task.urgency === 'high') score += 1;

      if (score > bestScore) {
        bestScore = score;
        bestTask = task;
      }
    }

    return bestScore > 0 ? bestTask?.id : null;
  }, [filteredTasks, profile?.skills]);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const container = document.getElementById('task-map');
    if (!container) return;

    try {
      const map = L.map(container).setView(userLocation, 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      setMapReady(true);

      return () => {
        map.remove();
        mapRef.current = null;
      };
    } catch (e) {
      console.error('Error initializing map:', e);
    }
  }, []);

  // Update markers when tasks change
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add user location marker
    if (profile?.location_lat && profile?.location_lng) {
      const userMarker = L.marker([profile.location_lat, profile.location_lng], {
        icon: userLocationIcon,
      })
        .bindPopup(`<strong>Your location</strong><br>${profile.location_name}`)
        .addTo(mapRef.current);
      markersRef.current.push(userMarker);

      // Add radius circle
      if (showRadius) {
        L.circle([profile.location_lat, profile.location_lng], {
          radius: radiusFilter * 1609.34,
          color: 'rgb(var(--primary))',
          fillColor: 'rgb(var(--primary))',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '5, 10',
        }).addTo(mapRef.current);
      }
    }

    // Add task markers
    const bounds = L.latLngBounds([]);

    filteredTasks.forEach(task => {
      const marker = L.marker([task.location_lat, task.location_lng], {
        icon: createUrgencyIcon(task.urgency, task.id === bestMatchId),
      })
        .bindPopup(
          `<strong>${task.ai_improved_title || task.title}</strong><br>` +
          `${task.distance !== undefined ? `${task.distance.toFixed(1)} mi away` : task.location_name}<br>` +
          `${TIME_LABELS[task.time_needed]}`
        )
        .addTo(mapRef.current)
        .on('click', () => setSelectedTask(task));

      markersRef.current.push(marker);
      bounds.extend([task.location_lat, task.location_lng]);
    });

    // Fit bounds
    if (profile?.location_lat && profile?.location_lng) {
      bounds.extend([profile.location_lat, profile.location_lng]);
    }

    if (bounds.isValid()) {
      try {
        mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      } catch (e) {
        console.error('Error fitting bounds:', e);
      }
    }
  }, [filteredTasks, mapReady, bestMatchId, radiusFilter, showRadius, profile]);

  const handleAcceptTask = async (task: Task) => {
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
      setSelectedTask(null);
    }
  };

  return (
    <div className="relative h-[calc(100vh-300px)] min-h-[500px] rounded-xl overflow-hidden border shadow-lg">
      {/* Map controls overlay */}
      <div className="absolute top-4 left-4 right-4 z-[1000] flex flex-col sm:flex-row gap-3 pointer-events-none">
        {/* Radius filter */}
        <Card className="pointer-events-auto shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium whitespace-nowrap">Radius: {radiusFilter} mi</span>
              </div>
              <div className="flex items-center gap-2 w-40">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setRadiusFilter(Math.max(1, radiusFilter - 5))}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <Slider
                  value={[radiusFilter]}
                  onValueChange={(v) => setRadiusFilter(v[0])}
                  min={1}
                  max={50}
                  step={1}
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setRadiusFilter(Math.min(50, radiusFilter + 5))}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
              <Button
                variant={showRadius ? "default" : "outline"}
                size="sm"
                onClick={() => setShowRadius(!showRadius)}
                className="shrink-0"
              >
                {showRadius ? 'Hide' : 'Show'} Area
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Task count */}
        <Card className="pointer-events-auto shadow-lg">
          <CardContent className="p-4 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">{filteredTasks.length} tasks in range</span>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card className="absolute bottom-4 left-4 z-[1000] shadow-lg">
        <CardContent className="p-3">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-success" />
              <span>Low</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-warning" />
              <span>Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive" />
              <span>Urgent</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected task card */}
      {selectedTask && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 right-4 z-[1000] w-80"
        >
          <Card className="shadow-xl">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold line-clamp-1">
                  {selectedTask.ai_improved_title || selectedTask.title}
                </h3>
                <Badge 
                  variant="outline" 
                  className={cn(
                    selectedTask.urgency === 'low' && 'urgency-low',
                    selectedTask.urgency === 'medium' && 'urgency-medium',
                    selectedTask.urgency === 'high' && 'urgency-high',
                  )}
                >
                  {selectedTask.urgency === 'high' && <Zap className="w-3 h-3 mr-1" />}
                  {URGENCY_LABELS[selectedTask.urgency]}
                </Badge>
              </div>
              
              {selectedTask.description && (
                <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                  {selectedTask.description}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>
                    {selectedTask.distance !== undefined 
                      ? `${selectedTask.distance.toFixed(1)} mi away`
                      : selectedTask.location_name
                    }
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{TIME_LABELS[selectedTask.time_needed]}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  <span>{selectedTask.current_volunteers}/{selectedTask.max_volunteers}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => handleAcceptTask(selectedTask)}
                  disabled={selectedTask.status !== 'open' || selectedTask.current_volunteers >= selectedTask.max_volunteers}
                >
                  {selectedTask.status === 'in_progress' ? 'In Progress' : 'Accept Task'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTask(null)}
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Map container */}
      <div id="task-map" className="h-full w-full" style={{ background: 'hsl(var(--muted))' }} />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 z-[1001] bg-background/50 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span>Loading tasks...</span>
          </div>
        </div>
      )}
    </div>
  );
}
