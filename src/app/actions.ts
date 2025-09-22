'use server';

import { z } from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WorkLogEntry } from '@/lib/types';
import { classifyWorkLogEntry } from '@/ai/flows/classify-work-log-entry';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const ActionInputSchema = z.object({
  userId: z.string(),
  title: z.string().min(1, 'Tên công việc là bắt buộc.'),
  description: z.string().min(1, 'Chi tiết công việc là bắt buộc.'),
  startTime: z.string().regex(timeRegex, 'Định dạng giờ không hợp lệ.'),
  endTime: z.string().regex(timeRegex, 'Định dạng giờ không hợp lệ.'),
  fileName: z.string().optional(),
  fileUrl: z.string().url('URL tệp không hợp lệ.').optional(),
});

export async function createWorkLogEntry(
  data: z.infer<typeof ActionInputSchema>
): Promise<{ success: boolean; newEntry?: WorkLogEntry; error?: string }> {
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
    const timestamp = new Date();

    // Call AI classification - this can be re-enabled later
    // const classification = await classifyWorkLogEntry({ title, description });
    const category = "Other"; // Default category

    const docRef = await addDoc(collection(db, 'worklogs'), {
      userId,
      title,
      description,
      startTime,
      endTime,
      fileName: fileName || '',
      fileUrl: fileUrl || '',
      category,
      timestamp: serverTimestamp(),
    });
    
    const newEntry: WorkLogEntry = {
      id: docRef.id,
      userId,
      title,
      description,
      startTime,
      endTime,
      fileName,
      fileUrl,
      category,
      timestamp,
    };
    
    return { success: true, newEntry };
  } catch (e: any) {
    console.error("Error adding document: ", e);
    // More specific error for security rules
    if (e.code === 'permission-denied') {
       return { success: false, error: 'Lỗi quyền truy cập. Vui lòng kiểm tra lại quy tắc bảo mật của Firestore.' };
    }
    return { success: false, error: 'Đã có lỗi xảy ra phía server.' };
  }
}
