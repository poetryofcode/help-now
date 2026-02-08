export type UserRole = 'volunteer' | 'creator' | 'admin';
export type TaskUrgency = 'low' | 'medium' | 'high';
export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'cancelled';
export type TimeNeeded = '15min' | '30min' | '1hour' | '2hours' | 'half_day';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  location_lat: number | null;
  location_lng: number | null;
  location_name: string | null;
  skills: string[];
  availability: string;
  tasks_completed: number;
  total_volunteer_hours: number;
  badges: string[];
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  ai_improved_title: string | null;
  location_lat: number;
  location_lng: number;
  location_name: string;
  time_needed: TimeNeeded;
  urgency: TaskUrgency;
  status: TaskStatus;
  skills_needed: string[];
  estimated_effort: number;
  max_volunteers: number;
  current_volunteers: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // Joined data
  creator?: Profile;
  distance?: number;
}

export interface TaskVolunteer {
  id: string;
  task_id: string;
  volunteer_id: string;
  joined_at: string;
  status: string;
}

export interface TaskMessage {
  id: string;
  task_id: string;
  user_id: string;
  message: string;
  created_at: string;
  profile?: Profile;
}

export interface Feedback {
  id: string;
  task_id: string;
  from_user_id: string;
  to_user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

export const TIME_LABELS: Record<TimeNeeded, string> = {
  '15min': '15 min',
  '30min': '30 min',
  '1hour': '1 hour',
  '2hours': '2 hours',
  'half_day': 'Half day',
};

export const URGENCY_LABELS: Record<TaskUrgency, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'Urgent',
};

export const SKILL_OPTIONS = [
  'Lifting & Moving',
  'Driving',
  'Tech Help',
  'Tutoring',
  'Grocery Shopping',
  'Pet Care',
  'Yard Work',
  'Cleaning',
  'Cooking',
  'Childcare',
  'Elder Care',
  'Translation',
  'Home Repairs',
  'Other',
];