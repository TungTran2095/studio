'use server';

import admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;

if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount!)),
      storageBucket: 'studio-3896827022-acbf1.appspot.com',
    });
    console.log('Firebase Admin SDK initialized.');
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
  }
}

export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
