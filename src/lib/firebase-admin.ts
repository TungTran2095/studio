import admin from 'firebase-admin';
import { firebaseConfig } from '@/lib/firebase';

const initializeFirebaseAdmin = () => {
  if (admin.apps.length === 0) {
    // Ensure environment variables are loaded, especially in development
    // In a deployed environment (like Vercel/Next.js), these are typically set in the project settings
    if (!process.env.FIREBASE_PROJECT_ID) {
       console.error("Firebase environment variables are not set.");
       // Fallback to serviceAccountKey.json if it exists, for local dev legacy support
       try {
         const serviceAccount = require('@/../serviceAccountKey.json');
         admin.initializeApp({
           credential: admin.credential.cert(serviceAccount),
           storageBucket: firebaseConfig.storageBucket,
         });
         return admin;
       } catch (e) {
          throw new Error("Firebase environment variables are not set and serviceAccountKey.json was not found.");
       }
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // The private key must be formatted correctly.
        // When stored in .env, newlines are often escaped as `\\n`.
        // We need to replace them back to `\n` for the SDK to parse it correctly.
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      }),
      storageBucket: firebaseConfig.storageBucket,
    });
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
