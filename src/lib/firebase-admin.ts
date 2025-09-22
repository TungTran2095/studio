import admin from 'firebase-admin';
import { firebaseConfig } from '@/lib/firebase';
import serviceAccount from '@/../serviceAccountKey.json';

const initializeFirebaseAdmin = () => {
  if (admin.apps.length === 0) {
      try {
        const serviceAccountKey = serviceAccount as admin.ServiceAccount;
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccountKey),
          storageBucket: firebaseConfig.storageBucket,
        });
      } catch (error: any) {
        console.error('Firebase Admin initialization error:', error.message);
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
