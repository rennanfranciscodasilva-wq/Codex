import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyD1hskWg85ewB1f5wHH0WX8ifgJELW4RAo", // <-- Note o "f" no final da parte em negrito
  authDomain: "codexproject-701b2.firebaseapp.com",
  projectId: "codexproject-701b2",
  storageBucket: "codexproject-701b2.firebasestorage.app",
  messagingSenderId: "284416724321",
  appId: "1:284416724321:web:4816808334667063094920"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);