'use server';

import { z } from 'zod';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { WorkLogEntry } from '@/lib/types';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const ActionInputSchema = z.object({
  userId: z.string(),
  title: z.string().min(1, 'Tên công việc là bắt buộc.'),
  description: z.string().min(1, 'Chi tiết công việc là bắt buộc.'),
  startTime: z.string().regex(timeRegex, 'Định dạng giờ không hợp lệ.'),
  endTime: z.string().regex(timeRegex, 'Định dạng giờ không hợp lệ.'),
  fileName: z.string().optional(),
  fileUrl: z.string().url('URL tệp không hợp lệ.').or(z.literal('')).optional(),
});

export async function createWorkLogEntry(
  data: z.infer<typeof ActionInputSchema>
): Promise<{ success: boolean; newEntry?: WorkLogEntry; error?: string }> {
  const validatedFields = ActionInputSchema.safeParse(data);

  if (!validatedFields.success) {
    // Log lỗi xác thực chi tiết ở phía server
    console.error("Validation failed:", validatedFields.error.flatten().fieldErrors);
    return {
      success: false,
      error: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
    };
  }
  
  const { title, description, startTime, endTime, fileName, fileUrl, userId } = validatedFields.data;
  
  try {
    const category = "Other"; // Tạm thời gán mặc định

    // Dữ liệu để ghi vào Firestore
    const docData = {
      userId,
      title,
      description,
      startTime,
      endTime,
      fileName: fileName || '',
      fileUrl: fileUrl || '',
      category,
      timestamp: serverTimestamp(), // Sử dụng serverTimestamp để ghi vào DB
    };
    
    const docRef = await addDoc(collection(db, 'worklogs'), docData);
    
    // Dữ liệu để trả về client (sử dụng new Date() thay vì serverTimestamp)
    const newEntry: WorkLogEntry = {
      id: docRef.id,
      userId,
      title,
      description,
      startTime,
      endTime,
      fileName: fileName || '',
      fileUrl: fileUrl || '',
      category,
      timestamp: new Date(), // Sử dụng timestamp client-side/server-side cho đối tượng trả về
    };
    
    return { success: true, newEntry };
  } catch (e: any) {
    // **LOG LỖI CHI TIẾT TRÊN SERVER**
    console.error("Error adding document to Firestore: ", e);
    
    // Trả về thông báo lỗi cụ thể hơn
    if (e.code === 'permission-denied') {
       return { success: false, error: 'Lỗi quyền truy cập. Vui lòng kiểm tra lại quy tắc bảo mật của Firestore.' };
    }
    return { success: false, error: `Đã có lỗi xảy ra phía server: ${e.message}` };
  }
}
