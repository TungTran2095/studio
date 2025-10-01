'use server';

import { createClient } from '@supabase/supabase-js';
import { WorkLogEntry, UserProfile, ChatMessage, ChatConversation } from '@/lib/types';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Get all worklogs for admin dashboard
 */
export async function getAllWorkLogs(): Promise<{ worklogs: WorkLogEntry[]; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('worklogs')
      .select(`
        *,
        profiles!worklogs_user_id_fkey (
          full_name,
          employee_id,
          email
        )
      `)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return { worklogs: data as WorkLogEntry[] };
  } catch (e: any) {
    console.error('getAllWorkLogs error:', e);
    return { worklogs: [], error: e.message };
  }
}

/**
 * Get worklogs by user for admin
 */
export async function getUserWorkLogs(userId: string): Promise<{ worklogs: WorkLogEntry[]; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('worklogs')
      .select(`
        *,
        profiles!worklogs_user_id_fkey (
          full_name,
          employee_id,
          email
        )
      `)
      .eq('user_id', userId)
      .order('timestamp', { ascending: false });

    if (error) throw error;

    return { worklogs: data as WorkLogEntry[] };
  } catch (e: any) {
    console.error('getUserWorkLogs error:', e);
    return { worklogs: [], error: e.message };
  }
}

/**
 * Get all users for admin management
 */
export async function getAllUsers(): Promise<{ users: UserProfile[]; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { users: data as UserProfile[] };
  } catch (e: any) {
    console.error('getAllUsers error:', e);
    return { users: [], error: e.message };
  }
}

/**
 * Get all chat conversations for admin
 */
export async function getAllConversations(): Promise<{ conversations: ChatConversation[]; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('chat_conversations')
      .select(`
        *,
        profiles!chat_conversations_user_id_fkey (
          full_name,
          employee_id,
          email
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { conversations: data as ChatConversation[] };
  } catch (e: any) {
    console.error('getAllConversations error:', e);
    return { conversations: [], error: e.message };
  }
}

/**
 * Get conversation messages for admin
 */
export async function getConversationMessages(conversationId: number): Promise<{ messages: ChatMessage[]; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return { messages: data as ChatMessage[] };
  } catch (e: any) {
    console.error('getConversationMessages error:', e);
    return { messages: [], error: e.message };
  }
}

/**
 * Update user admin status (admin only)
 */
export async function updateUserAdminStatus(userId: string, isAdmin: boolean): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId);

    if (error) {
      console.error('Error updating admin status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateUserAdminStatus:', error);
    return false;
  }
}

/**
 * Get system statistics for admin dashboard
 */
export async function getSystemStats(): Promise<{ stats: any; error?: string }> {
  try {
    // Get total users
    const { count: totalUsers } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Get total worklogs
    const { count: totalWorkLogs } = await supabaseAdmin
      .from('worklogs')
      .select('*', { count: 'exact', head: true });

    // Get total conversations
    const { count: totalConversations } = await supabaseAdmin
      .from('chat_conversations')
      .select('*', { count: 'exact', head: true });

    // Get worklogs this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const { count: workLogsThisWeek } = await supabaseAdmin
      .from('worklogs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', weekAgo.toISOString());

    const stats = {
      totalUsers: totalUsers || 0,
      totalWorkLogs: totalWorkLogs || 0,
      totalConversations: totalConversations || 0,
      workLogsThisWeek: workLogsThisWeek || 0,
    };

    return { stats };
  } catch (e: any) {
    console.error('getSystemStats error:', e);
    return { stats: {}, error: e.message };
  }
}
