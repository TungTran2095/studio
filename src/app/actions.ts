'use server';
import { getAdminDb, getAdminStorage } from '@/lib/firebase-admin';
import type { WorkLogEntry } from '@/lib/types';
import { classifyWorkLogEntry } from '@/ai/flows/classify-work-log-entry';

export async function submitWorkLog(formData: FormData) {
  const adminDb = getAdminDb();
  const adminStorage = getAdminStorage();

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
      const bucket = adminStorage.bucket();
      const filePath = `attachments/${userId}/${Date.now()}_${attachment.name}`;
      const fileBuffer = Buffer.from(await attachment.arrayBuffer());

      const file = bucket.file(filePath);
      
      await file.save(fileBuffer, {
        metadata: {
          contentType: attachment.type,
        },
      });

      // Use getSignedUrl to generate a long-lived public URL
      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: '03-09-2491', // A very long-lived URL
      });
      
      fileUrl = url;
      fileName = attachment.name;
    }
    
    // Wait for AI classification result
    const classificationResult = await classificationPromise;
    const category = classificationResult.category || 'Other';


    const docData: Omit<WorkLogEntry, 'id' | 'timestamp'> & { timestamp: any } = {
      userId,
      title,
      description,
      startTime,
      endTime,
      category,
      timestamp: new Date(),
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
    // Return a more specific error message if available
    const errorMessage = error.message?.includes('The specified bucket does not exist')
      ? 'Firebase Storage error: The bucket does not seem to exist or is not accessible. Details: ' + error.message
      : error.message || 'Lỗi không xác định từ server.';
    return { error: errorMessage };
  }
}
