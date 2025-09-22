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
