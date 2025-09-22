'use server';

import admin from 'firebase-admin';

const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return;
  }

  const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;

  if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
        storageBucket: 'studio-3896827022-acbf1.appspot.com',
      });
    } catch (error: any) {
      console.error('Firebase Admin SDK initialization error:', error.message);
    }
  }
};


// Safely export admin services
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
