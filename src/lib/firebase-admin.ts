'use server';

import admin from 'firebase-admin';
import serviceAccount from '@/../serviceAccountKey.json';

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return;
  }

  // Check if the service account has been populated
  if (serviceAccount.project_id === 'your-project-id') {
    console.warn(
      'Firebase Admin SDK not initialized. Please populate serviceAccountKey.json'
    );
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'studio-3896827022-acbf1.appspot.com',
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
