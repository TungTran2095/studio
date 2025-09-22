'use server';
import 'dotenv/config';

import { classifyWorkLogEntry } from '@/ai/flows/classify-work-log-entry';
import { adminDb, adminStorage } from '@/lib/firebase-admin';
import type { WorkLogEntry } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

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

    // 1. Classify with AI
    const { category } = await classifyWorkLogEntry({ title, description });

    let fileUrl: string | undefined;
    let fileName: string | undefined;

    // 2. Handle file upload if it exists
    if (attachment && attachment.size > 0) {
      const bucket = adminStorage.bucket();
      const filePath = `attachments/${userId}/${Date.now()}_${attachment.name}`;
      const fileBuffer = Buffer.from(await attachment.arrayBuffer());

      const file = bucket.file(filePath);
      
      const metadataToken = uuidv4();

      await file.save(fileBuffer, {
        metadata: {
          contentType: attachment.type,
          metadata: {
            firebaseStorageDownloadTokens: metadataToken,
          }
        },
      });
      
      // Construct the public URL
      fileUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filePath)}?alt=media&token=${metadataToken}`;
      fileName = attachment.name;
    }

    // 3. Save to Firestore
    const docData: Omit<WorkLogEntry, 'id' | 'timestamp'> & { timestamp: any } = {
      userId,
      title,
      description,
      startTime,
      endTime,
      category: category || 'Other',
      timestamp: new Date(), // Use server timestamp for consistency
      ...(fileUrl && { fileUrl }),
      ...(fileName && { fileName }),
    };

    const docRef = await adminDb.collection('worklogs').add(docData);

    const newEntry: WorkLogEntry = {
      id: docRef.id,
      ...docData,
      timestamp: docData.timestamp,
    };
    
    return { newEntry };

  } catch (error: any) {
    console.error('Server Action Error:', error);
    return { error: error.message || 'Lỗi không xác định từ server.' };
  }
}
