'use server';

import { z } from 'zod';
import { classifyWorkLogEntry } from '@/ai/flows/classify-work-log-entry';
import type { WorkLogEntry } from '@/lib/types';

const FormSchema = z.object({
  title: z.string().min(1, 'Tên công việc là bắt buộc.'),
  description: z.string().min(1, 'Chi tiết công việc là bắt buộc.'),
});

export async function createWorkLogEntry(
  data: { title: string; description: string, fileName?: string }
): Promise<{ success: boolean; newEntry?: WorkLogEntry; error?: string }> {
  const validatedFields = FormSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
    };
  }
  
  const { title, description } = validatedFields.data;
  
  try {
    const classification = await classifyWorkLogEntry({ title, description });

    const newEntry: WorkLogEntry = {
      id: crypto.randomUUID(),
      title,
      description,
      fileName: data.fileName,
      category: classification.category,
      timestamp: new Date(),
    };
    
    // In a real app, you would save this to a database.
    
    return { success: true, newEntry };
  } catch (e) {
    console.error(e);
    return { success: false, error: 'Đã có lỗi xảy ra từ AI. Vui lòng thử lại.' };
  }
}
