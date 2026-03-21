// ==========================================
// FIREBASE SETUP - اتبع الخطوات دي
// ==========================================
// 1. روح console.firebase.google.com
// 2. Create project → اسم العيادة
// 3. Add Web App → احصل على config
// 4. Authentication → Sign-in methods → Google ✓
// 5. Firestore Database → Create database → Start in test mode
// 6. حط بياناتك هنا ↓
// ==========================================

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBsPtn0sYBUibD0t1nh73NN-Q6qJkgzWA8",
  authDomain: "dental-clinc-1d42b.firebaseapp.com",
  projectId: "dental-clinc-1d42b",
  storageBucket: "dental-clinc-1d42b.firebasestorage.app",
  messagingSenderId: "110842624322",
  appId: "1:110842624322:web:1c1449c320d312d10f70db",
  measurementId: "G-6D06W7N7LZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
