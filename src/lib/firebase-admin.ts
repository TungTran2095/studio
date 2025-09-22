import admin from 'firebase-admin';
import { firebaseConfig } from '@/lib/firebase';
import serviceAccount from '@/../serviceAccountKey.json';

const initializeFirebaseAdmin = () => {
  if (admin.apps.length === 0) {
      const serviceAccountKey = serviceAccount as admin.ServiceAccount;
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccountKey),
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
