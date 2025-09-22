import admin from 'firebase-admin';
import { firebaseConfig } from '@/lib/firebase';

const initializeFirebaseAdmin = () => {
  if (admin.apps.length === 0) {
    // This approach is more robust. It attempts to use environment variables first
    // (ideal for production environments like Vercel), and falls back to a
    // local service account file (ideal for local development).
    
    // Check if environment variables are configured
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Replace escaped newlines for Vercel/similar environments
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        }),
        storageBucket: firebaseConfig.storageBucket,
      });
    } else {
      // Fallback to serviceAccountKey.json for local development
      try {
        const serviceAccount = require('@/../serviceAccountKey.json');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: firebaseConfig.storageBucket,
        });
      } catch (error: any) {
        console.error('Firebase Admin Initialization Error:', error);
        throw new Error('Failed to initialize Firebase Admin. Ensure you have configured environment variables or a serviceAccountKey.json file.');
      }
    }
  }
  return admin;
};


export const getAdminDb = () => {
    const adminInstance = initializeFirebaseAdmin();
    return adminInstance.firestore();
}

export const getAdminStorage = () => {
    const adminInstance = initializeFirebaseAdmin();
    return adminInstance.storage();
}
