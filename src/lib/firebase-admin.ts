import admin from 'firebase-admin';
import { firebaseConfig } from '@/lib/firebase';
import serviceAccount from '@/../serviceAccountKey.json';

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return;
  }

  try {
     const serviceAccountKey = serviceAccount as admin.ServiceAccount;
     
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey),
      storageBucket: firebaseConfig.storageBucket,
    });
    console.log('Firebase Admin initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin initialization error:', error.message);
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
