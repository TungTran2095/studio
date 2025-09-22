import admin from 'firebase-admin';
import type { ServiceAccount } from 'firebase-admin';

// This function initializes Firebase Admin SDK.
// It will only be initialized once.
const initializeFirebaseAdmin = () => {
  if (admin.apps.length > 0) {
    return;
  }

  // Fallback for local development: try to use the serviceAccountKey.json file.
  try {
    const serviceAccountKey = require('@/../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountKey),
      storageBucket: serviceAccountKey.project_id + '.appspot.com',
    });
    console.log('Firebase Admin Initialized via serviceAccountKey.json');
  } catch (error: any) {
     if (error.code === 'MODULE_NOT_FOUND') {
        console.error('Firebase Admin Initialization Error: `serviceAccountKey.json` not found.');
        throw new Error('Failed to initialize Firebase Admin. Create a serviceAccountKey.json file in the root directory.');
     }
     console.error('Firebase Admin Initialization Error:', error);
     throw new Error('Failed to initialize Firebase Admin from serviceAccountKey.json. Check the file format.');
  }
};

// Initialize on load.
initializeFirebaseAdmin();


export const getAdminDb = () => {
    return admin.firestore();
}

export const getAdminStorage = () => {
    return admin.storage();
}
