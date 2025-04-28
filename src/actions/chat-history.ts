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
  try {
    const { data, error } = await supabase
      .from('message_history')
      .select('*') // Select all columns
      .order('created_at', { ascending: true }); // Order by timestamp

    if (error) {
      console.error('[fetchChatHistory] Supabase error:', error);
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

  // Validate input
  const validationResult = SaveMessageSchema.safeParse(input);
  if (!validationResult.success) {
    console.error('[saveChatMessage] Invalid input:', validationResult.error);
    return { success: false, error: 'Invalid message data.' };
  }

  const { role, content } = validationResult.data;

  try {
    const { error } = await supabase
      .from('message_history')
      .insert([{ role, content }]); // Insert the validated data

    if (error) {
      console.error('[saveChatMessage] Supabase error:', error);
      return { success: false, error: error.message };
    }

    console.log('[saveChatMessage] Message saved successfully.');
    return { success: true };
  } catch (err: any) {
    console.error('[saveChatMessage] Unexpected error:', err);
    return { success: false, error: err.message || 'An unknown error occurred.' };
  }
}

