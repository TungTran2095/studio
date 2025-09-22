'use server';

import { createClient } from '@supabase/supabase-js';
import type { WorkLogEntry } from '@/lib/types';
import { classifyWorkLogEntry } from '@/ai/flows/classify-work-log-entry';

// IMPORTANT: Use environment variables for Supabase credentials in a real app
// These should be the SERVICE_ROLE_KEY and URL for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export async function submitWorkLog(formData: FormData) {
  try {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const userId = formData.get('userId') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const attachment = formData.get('attachment') as File | null;

    if (!title || !description || !userId || !startTime || !endTime) {
      throw new Error('Thông tin không đầy đủ.');
    }

    // Call AI to classify the entry in parallel
    const classificationPromise = classifyWorkLogEntry({ title, description });

    let fileUrl: string | undefined;
    let fileName: string | undefined;

    if (attachment && attachment.size > 0) {
      const filePath = `public/${userId}/${Date.now()}_${attachment.name}`;
      
      const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
        .from('attachments') // Make sure you have a bucket named 'attachments'
        .upload(filePath, attachment);

      if (uploadError) {
        throw new Error(`Lỗi tải tệp lên: ${uploadError.message}`);
      }
      
      const { data: urlData } = supabaseAdmin.storage
        .from('attachments')
        .getPublicUrl(filePath);

      fileUrl = urlData.publicUrl;
      fileName = attachment.name;
    }

    // Wait for AI classification result
    const classificationResult = await classificationPromise;
    const category = classificationResult.category || 'Other';

    const docData = {
      user_id: userId,
      title,
      description,
      start_time: startTime,
      end_time: endTime,
      category,
      ...(fileUrl && { file_url: fileUrl }),
      ...(fileName && { file_name: fileName }),
    };
    
    const { data: newEntryData, error: insertError } = await supabaseAdmin
      .from('worklogs') // Make sure you have a table named 'worklogs'
      .insert(docData)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Lỗi ghi vào CSDL: ${insertError.message}`);
    }

    const newEntry: WorkLogEntry = {
      ...newEntryData,
      timestamp: new Date(newEntryData.timestamp), // Convert string to Date
    } as WorkLogEntry;

    return { newEntry };

  } catch (error: any) {
    console.error('Server Action Error:', error);
    return { error: error.message || 'Lỗi không xác định từ server.' };
  }
}
