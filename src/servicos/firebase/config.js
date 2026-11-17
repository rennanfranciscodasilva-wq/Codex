import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'; // <-- ADICIONADO

const firebaseConfig = {
  // O Vite vai puxar a NOVA chave que você colocou no arquivo .env.local
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "codexproject-701b2.firebaseapp.com",
  projectId: "codexproject-701b2",
  storageBucket: "codexproject-701b2.firebasestorage.app",
  messagingSenderId: "284416724321",
  appId: "1:284416724321:web:4816808334667063094920"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app); // <-- ADICIONADO E EXPORTADO