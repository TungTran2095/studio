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

function sanitizeFileName(originalName: string): string {
  const [namePart, ...extParts] = originalName.split('.');
  const extension = extParts.length > 0 ? `.${extParts.pop()}` : '';
  const base = extParts.length > 0 ? `${namePart}.${extParts.join('.')}` : namePart;
  const noDiacritics = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  const safeBase = noDiacritics
    .replace(/[^a-zA-Z0-9-_\.\s]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
    .toLowerCase();
  const safeExt = extension
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.]/g, '')
    .toLowerCase();
  const result = `${safeBase || 'file'}${safeExt}`;
  return result.length > 180 ? result.slice(0, 180) : result;
}

export async function submitWorkLog(formData: FormData) {
  try {
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const userId = formData.get('userId') as string;
    const startTime = formData.get('startTime') as string;
    const endTime = formData.get('endTime') as string;
    const attachmentCount = parseInt(formData.get('attachmentCount') as string) || 0;

    if (!title || !description || !userId || !startTime || !endTime) {
      throw new Error('Thông tin không đầy đủ.');
    }

    // Call AI to classify the entry in parallel
    const classificationPromise = classifyWorkLogEntry({ title, description });

    let fileUrls: string[] = [];
    let fileNames: string[] = [];

    // Process multiple attachments
    for (let i = 0; i < attachmentCount; i++) {
      const attachment = formData.get(`attachment_${i}`) as File | null;
      
      if (attachment && attachment.size > 0) {
        const safeName = sanitizeFileName(attachment.name);
        const filePath = `public/${userId}/${Date.now()}_${i}_${safeName}`;
        
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from('attachments')
          .upload(filePath, attachment, {
            cacheControl: '3600',
            contentType: attachment.type || undefined,
            upsert: false,
          });

        if (uploadError) {
          // Log the detailed error on the server
          console.error('Supabase upload error:', uploadError);
          throw new Error(`Lỗi tải tệp lên: ${uploadError.message}`);
        }
        
        const { data: urlData } = supabaseAdmin.storage
          .from('attachments')
          .getPublicUrl(filePath);

        fileUrls.push(urlData.publicUrl);
        fileNames.push(attachment.name);
      }
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
      ...(fileUrls.length > 0 && { 
        file_url: fileUrls.join('|'), // Store multiple URLs separated by |
        file_name: fileNames.join('|') // Store multiple names separated by |
      }),
    };
    
    const { data: newEntryData, error: insertError } = await supabaseAdmin
      .from('worklogs')
      .insert(docData)
      .select()
      .single();

    if (insertError) {
      // Log the detailed error on the server
      console.error('Supabase insert error:', insertError);
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
