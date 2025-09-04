import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAtaEB8Sw4Nj9tjsGAAsyTdS8XsVvpvK0E",
  authDomain: "capstone-recycling-system.firebaseapp.com",
  projectId: "capstone-recycling-system",
  storageBucket: "capstone-recycling-system.firebasestorage.app",
  messagingSenderId: "175035875160",
  appId: "1:175035875160:web:01a59fc73c851aa7842f2d"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;