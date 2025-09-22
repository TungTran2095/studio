'use server';

import { z } from 'zod';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { classifyWorkLogEntry } from '@/ai/flows/classify-work-log-entry';
import type { WorkLogEntry } from '@/lib/types';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// This schema is now strictly for data being passed to the server action
const ActionInputSchema = z.object({
  userId: z.string(),
  title: z.string().min(1, 'Tên công việc là bắt buộc.'),
  description: z.string().min(1, 'Chi tiết công việc là bắt buộc.'),
  startTime: z.string().regex(timeRegex, 'Định dạng giờ không hợp lệ.'),
  endTime: z.string().regex(timeRegex, 'Định dạng giờ không hợp lệ.'),
  fileName: z.string().min(1, "Tên tệp là bắt buộc."),
  fileUrl: z.string().url("URL tệp không hợp lệ."),
});

export async function createWorkLogEntry(
  data: z.infer<typeof ActionInputSchema>
): Promise<{ success: boolean; newEntry?: WorkLogEntry; error?: string }> {
  // Validate the final data object that includes the fileUrl from storage
  const validatedFields = ActionInputSchema.safeParse(data);

  if (!validatedFields.success) {
    console.error("Validation failed:", validatedFields.error.flatten().fieldErrors);
    return {
      success: false,
      error: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
    };
  }
  
  const { title, description, startTime, endTime, fileName, fileUrl, userId } = validatedFields.data;
  
  try {
    const classification = await classifyWorkLogEntry({ title, description });
    const timestamp = new Date();

    const docRef = await addDoc(collection(db, 'worklogs'), {
      userId: userId,
      title,
      description,
      startTime,
      endTime,
      fileName: fileName,
      fileUrl: fileUrl,
      category: classification.category,
      timestamp: timestamp,
    });
    
    const newEntry: WorkLogEntry = {
      id: docRef.id,
      userId: userId,
      title,
      description,
      startTime,
      endTime,
      fileName: fileName,
      fileUrl: fileUrl,
      category: classification.category,
      timestamp: timestamp,
    };
    
    return { success: true, newEntry };
  } catch (e) {
    console.error("Error adding document: ", e);
    return { success: false, error: 'Đã có lỗi xảy ra khi lưu trữ. Vui lòng thử lại.' };
  }
}
