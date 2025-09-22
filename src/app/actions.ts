'use server';

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import type { WorkLogEntry } from '@/lib/types';
import { FieldValue } from 'firebase-admin/firestore';

const ActionInputSchema = z.object({
  userId: z.string(),
  title: z.string(),
  description: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  fileData: z.object({
    content: z.string(), // base64 string
    name: z.string(),
    type: z.string(),
  }).optional(),
});

type ActionInput = z.infer<typeof ActionInputSchema>;

export async function createWorkLogEntry(input: ActionInput): Promise<{
  newEntry?: WorkLogEntry;
  error?: string;
}> {
  try {
    const validation = ActionInputSchema.safeParse(input);
    if (!validation.success) {
      throw new Error(validation.error.errors.map(e => e.message).join(', '));
    }
    const { userId, title, description, startTime, endTime, fileData } = validation.data;

    let fileUrl = '';
    let uploadedFileName = '';

    if (fileData) {
      const { content, name, type } = fileData;
      const base64Data = content.split(',')[1];
      const fileBuffer = Buffer.from(base64Data, 'base64');
      const filePath = `uploads/${userId}/${Date.now()}_${name}`;
      const file = adminStorage.bucket().file(filePath);

      const token = uuidv4();

      await file.save(fileBuffer, {
        metadata: {
          contentType: type,
           metadata: {
             firebaseStorageDownloadTokens: token
           }
        },
      });
      
      fileUrl = `https://firebasestorage.googleapis.com/v0/b/${adminStorage.bucket().name}/o/${encodeURIComponent(filePath)}?alt=media&token=${token}`;
      uploadedFileName = name;
    }

    const docData = {
      userId,
      title,
      description,
      startTime,
      endTime,
      fileName: uploadedFileName,
      fileUrl,
      category: 'Other',
      timestamp: FieldValue.serverTimestamp(),
    };

    const docRef = await adminDb.collection('worklogs').add(docData);

    const newEntry: WorkLogEntry = {
      id: docRef.id,
      ...docData,
      timestamp: new Date(), // Use client-side date for immediate UI update
    };

    return { newEntry };

  } catch (error: any) {
    console.error('Server Action Error:', error);
    return { error: error.message || 'An unknown server error occurred.' };
  }
}
