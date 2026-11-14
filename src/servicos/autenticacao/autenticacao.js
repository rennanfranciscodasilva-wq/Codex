import { auth } from '../firebase/config.js';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

// Cria uma nova conta
export async function registrar(email, senha) {
  try {
    const credencial = await createUserWithEmailAndPassword(auth, email, senha);
    return credencial.user;
  } catch (erro) {
    console.error("Erro ao registrar:", erro.code);
    throw erro;
  }
}

// Faz login
export async function entrar(email, senha) {
  try {
    const credencial = await signInWithEmailAndPassword(auth, email, senha);
    return credencial.user;
  } catch (erro) {
    console.error("Erro ao entrar:", erro.code);
    throw erro;
  }
}

// Faz logout
export async function sair() {
  try {
    await signOut(auth);
  } catch (erro) {
    console.error("Erro ao sair:", erro);
    throw erro;
  }
}

// Fica "ouvindo" o estado de login
export function observarAutenticacao(callback) {
  return onAuthStateChanged(auth, callback);
}