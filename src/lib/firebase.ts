'use client';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: 'studio-3896827022-acbf1',
  appId: '1:476121390495:web:c84e0b3c0f90787d9a71aa',
  apiKey: 'AIzaSyD-6PeUnAVmRQnO0FYo1k0nAUQzRQNfTnE',
  authDomain: 'studio-3896827022-acbf1.firebaseapp.com',
  messagingSenderId: '476121390495',
  storageBucket: 'studio-3896827022-acbf1.appspot.com',
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
