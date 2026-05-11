import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyChnZgXLbJfxW-9-KU2uU9aYHc08U8d_1k",
  authDomain: "lankapos-f23ab.firebaseapp.com",
  databaseURL: "https://lankapos-f23ab-default-rtdb.firebaseio.com",
  projectId: "lankapos-f23ab",
  storageBucket: "lankapos-f23ab.firebasestorage.app",
  messagingSenderId: "967070315115",
  appId: "1:967070315115:web:06d7477bb7f7e9a48fb72e",
  measurementId: "G-7VY8K9T6GC"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
