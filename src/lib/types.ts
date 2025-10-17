export type WorkLogEntry = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  timestamp: Date; // Supabase returns string, but we'll convert it
  start_time: string;
  end_time: string;
  file_name?: string;
  file_url?: string;
};

export type UserProfile = {
  id: string;
  email: string;
  full_name: string | null;
  employee_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = {
  id: number;
  conversation_id: number;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export type ChatConversation = {
  id: number;
  user_id: string;
  title: string;
  created_at: string;
};