import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { TaskFeed } from '@/components/TaskFeed';
import { ProfileCard } from '@/components/ProfileCard';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { Task } from '@/types/database';

export default function TasksPage() {
  const { user } = useAuth();
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">Help Requests</h1>
                <p className="text-muted-foreground">Find tasks near you and make a difference</p>
              </div>
              {user && (
                <Button variant="hero" onClick={() => setShowCreateTask(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Post a Task
                </Button>
              )}
            </div>

            <TaskFeed onViewTask={handleViewTask} />
          </div>

          {/* Sidebar - Profile */}
          {user && (
            <motion.aside
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="lg:w-80 shrink-0"
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