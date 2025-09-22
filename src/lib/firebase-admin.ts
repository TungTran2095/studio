'use server';

import admin from 'firebase-admin';

// Check if the service account JSON is provided
const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;

if (!admin.apps.length) {
  if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
        storageBucket: 'studio-3896827022-acbf1.appspot.com',
      });
      console.log('Firebase Admin SDK initialized.');
    } catch (error: any) {
      console.error('Firebase Admin SDK initialization error:', error.message);
    }
  } else {
    console.warn('FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is not set. Firebase Admin SDK not initialized.');
  }
}

// Safely export admin services
const getAdminDb = () => {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin has not been initialized.');
  }
  return admin.firestore();
};

const getAdminStorage = () => {
  if (!admin.apps.length) {
    throw new Error('Firebase Admin has not been initialized.');
  }
  return admin.storage();
};

export const adminDb = getAdminDb();
export const adminStorage = getAdminStorage();
