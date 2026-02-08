import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, List, Map } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TaskFeed } from '@/components/TaskFeed';
import { TaskMapView } from '@/components/TaskMapView';
import { ProfileCard } from '@/components/ProfileCard';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { Task } from '@/types/database';

export default function TasksPage() {
  const { user } = useAuth();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const handleViewTask = (task: Task) => {
    setSelectedTask(task);
    // TODO: Open task detail modal
  };

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main feed */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold">Help Requests</h1>
                <p className="text-muted-foreground">Find tasks near you and make a difference</p>
              </div>
              <div className="flex items-center gap-3">
                {/* View toggle */}
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'map')}>
                  <TabsList>
                    <TabsTrigger value="list" className="gap-2">
                      <List className="w-4 h-4" />
                      <span className="hidden sm:inline">List</span>
                    </TabsTrigger>
                    <TabsTrigger value="map" className="gap-2">
                      <Map className="w-4 h-4" />
                      <span className="hidden sm:inline">Map</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
                
                {user && (
                  <Button variant="hero" onClick={() => setShowCreateTask(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Post a Task
                  </Button>
                )}
              </div>
            </div>

            {viewMode === 'list' ? (
              <TaskFeed onViewTask={handleViewTask} />
            ) : (
              <TaskMapView onViewTask={handleViewTask} />
            )}
          </div>

          {/* Sidebar - Profile (only show on list view on smaller screens) */}
          {user && (
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className={`lg:w-80 shrink-0 ${viewMode === 'map' ? 'hidden lg:block' : ''}`}
            >
              <div className="sticky top-24">
                <ProfileCard />
              </div>
            </motion.aside>
          )}
        </div>
      </main>

      <Footer />
      <CreateTaskModal open={showCreateTask} onOpenChange={setShowCreateTask} />
    </div>
  );
}