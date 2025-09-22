import admin from 'firebase-admin';
import serviceAccount from '@/../serviceAccountKey.json';
import { firebaseConfig } from '@/lib/firebase';

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return;
  }

  if (serviceAccount.project_id === 'your-project-id') {
    console.warn(
      'Firebase Admin SDK not initialized. Please populate serviceAccountKey.json'
    );
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: firebaseConfig.storageBucket,
    });
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
  }
};

const getAdminDb = () => {
  initializeFirebaseAdmin();
  if (!admin.apps.length) {
    throw new Error('Firebase Admin has not been initialized.');
  }
  return admin.firestore();
};

const getAdminStorage = () => {
  initializeFirebaseAdmin();
  if (!admin.apps.length) {
    throw new Error('Firebase Admin has not been initialized.');
  }
  return admin.storage();
};

export const adminDb = getAdminDb();
export const adminStorage = getAdminStorage();
