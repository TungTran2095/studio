import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// This function initializes Firebase Admin SDK.
// It will only be initialized once.
const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return admin;
  }

  // First, try to use the full service account JSON from an environment variable.
  // This is the recommended approach for Vercel, Cloud Run, etc.
  if (process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON) as ServiceAccount;
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: serviceAccount.project_id + '.appspot.com',
      });
      console.log('Firebase Admin Initialized via FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON');
      return admin;
    } catch (error) {
       console.error('Error parsing FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON:', error);
       throw new Error('Failed to initialize Firebase Admin from environment variable. Check the JSON format.');
    }
  }
  
  // Fallback for local development: try to use the serviceAccountKey.json file.
  try {
    const serviceAccountKey = require('@/../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey),
      storageBucket: serviceAccountKey.project_id + '.appspot.com',
    });
    console.log('Firebase Admin Initialized via serviceAccountKey.json');
    return admin;
  } catch (error: any) {
     if (error.code === 'MODULE_NOT_FOUND') {
        console.error('Firebase Admin Initialization Error: `serviceAccountKey.json` not found.');
        throw new Error('Failed to initialize Firebase Admin. Set up FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON environment variable or create a serviceAccountKey.json file.');
     }
     console.error('Firebase Admin Initialization Error:', error);
     throw new Error('Failed to initialize Firebase Admin from serviceAccountKey.json.');
  }
};

export const getAdminDb = () => {
    const adminInstance = initializeFirebaseAdmin();
    return adminInstance.firestore();
}

export const getAdminStorage = () => {
    const adminInstance = initializeFirebaseAdmin();
    return adminInstance.storage();
}
