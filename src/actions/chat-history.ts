'use server';

import { supabase } from '@/lib/supabase-client';
import { z } from 'zod';

// --- Types and Schemas ---

// Simple schema for a single message to be saved
const SaveMessageSchema = z.object({
  role: z.enum(['user', 'bot']),
  content: z.string().min(1),
});

// Define the return type for fetching messages
interface FetchHistoryResult {
  success: boolean;
  data: {
    id: number;
    created_at: string;
    role: 'user' | 'bot';
    content: string;
  }[];
  error?: string;
}

// Define the return type for saving a message
interface SaveMessageResult {
  success: boolean;
  error?: string;
}


// --- Server Actions ---

/**
 * Fetches chat history from the 'message_history' table in Supabase.
 * Orders messages by creation time (oldest first).
 */
export async function fetchChatHistory(): Promise<FetchHistoryResult> {
  console.log('[fetchChatHistory] Attempting to fetch chat history...');
  if (!supabase) {
      console.error('[fetchChatHistory] Supabase client is not initialized.');
      return { success: false, data: [], error: 'Supabase client not initialized.' };
  }
  try {
    const { data, error } = await supabase
      .from('message_history')
      .select('*') // Select all columns
      .order('created_at', { ascending: true }); // Order by timestamp ASC

    if (error) {
      console.error('[fetchChatHistory] Supabase error:', error);
      // Check specifically for RLS errors
      if (error.message.includes('new row violates row-level security policy')) {
           console.error('[fetchChatHistory] RLS policy might be preventing reads. Check Supabase table policies.');
           return { success: false, data: [], error: 'Permission denied. Check RLS policies.' };
      }
      return { success: false, data: [], error: error.message };
    }

    console.log(`[fetchChatHistory] Successfully fetched ${data?.length ?? 0} messages.`);
    // Ensure data is not null before returning
    return { success: true, data: data ?? [] };
  } catch (err: any) {
    console.error('[fetchChatHistory] Unexpected error:', err);
    return { success: false, data: [], error: err.message || 'An unknown error occurred.' };
  }
}

/**
 * Saves a single chat message to the 'message_history' table in Supabase.
 */
export async function saveChatMessage(
  input: z.infer<typeof SaveMessageSchema>
): Promise<SaveMessageResult> {
  console.log('[saveChatMessage] Attempting to save message:', { role: input.role, content: input.content.substring(0, 50) + '...' });
  if (!supabase) {
    console.error('[saveChatMessage] Supabase client is not initialized.');
    return { success: false, error: 'Supabase client not initialized.' };
   }

  // Validate input
  const validationResult = SaveMessageSchema.safeParse(input);
  if (!validationResult.success) {
    console.error('[saveChatMessage] Invalid input:', validationResult.error);
    return { success: false, error: 'Invalid message data.' };
  }

  const { role, content } = validationResult.data;

  try {
    console.log('[saveChatMessage] Preparing to insert into Supabase:', { role, content: content.substring(0, 50) + '...' });
    const { error } = await supabase
      .from('message_history')
      .insert([{ role, content }]); // Insert the validated data

    if (error) {
      console.error('[saveChatMessage] Supabase insert error:', error);
       // Check specifically for RLS errors during insert
       if (error.message.includes('new row violates row-level security policy')) {
           console.error('[saveChatMessage] RLS policy prevented insert. Check Supabase table policies.');
           return { success: false, error: 'Permission denied. Check RLS policies.' };
       }
      return { success: false, error: error.message };
    }

    console.log('[saveChatMessage] Message saved successfully to Supabase.');
    return { success: true };
  } catch (err: any) {
    console.error('[saveChatMessage] Unexpected error during insert:', err);
    return { success: false, error: err.message || 'An unknown error occurred.' };
  }
}
