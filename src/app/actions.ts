'use server';

import { z } from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { classifyWorkLogEntry } from '@/ai/flows/classify-work-log-entry';
import type { WorkLogEntry } from '@/lib/types';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const FormSchema = z.object({
  title: z.string().min(1, 'Tên công việc là bắt buộc.'),
  description: z.string().min(1, 'Chi tiết công việc là bắt buộc.'),
  startTime: z.string().regex(timeRegex, 'Định dạng giờ không hợp lệ.'),
  endTime: z.string().regex(timeRegex, 'Định dạng giờ không hợp lệ.'),
});

export async function createWorkLogEntry(
  data: { 
    title: string; 
    description: string; 
    startTime: string; 
    endTime: string; 
    fileName?: string;
    fileUrl?: string;
    userId: string;
  }
): Promise<{ success: boolean; newEntry?: WorkLogEntry; error?: string }> {
  const validatedFields = FormSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      error: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
    };
  }
  
  const { title, description, startTime, endTime } = validatedFields.data;
  
  try {
    const classification = await classifyWorkLogEntry({ title, description });
    const timestamp = new Date();

    const docRef = await addDoc(collection(db, 'worklogs'), {
      userId: data.userId,
      title,
      description,
      startTime,
      endTime,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      category: classification.category,
      timestamp: timestamp,
    });
    
    const newEntry: WorkLogEntry = {
      id: docRef.id,
      userId: data.userId,
      title,
      description,
      startTime,
      endTime,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      category: classification.category,
      timestamp: timestamp,
    };
    
    return { success: true, newEntry };
  } catch (e) {
    console.error("Error adding document: ", e);
    return { success: false, error: 'Đã có lỗi xảy ra khi lưu trữ. Vui lòng thử lại.' };
  }
}
