import { auth } from '../firebase/config.js';
import {
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';

const INTERVALO_VERIFICACAO = 120_000;
const proximosEnvios = new Map();
const enviosPendentes = new Map();

function chaveVerificacao(uid) {
  return 'codex_verificacao_email:' + uid;
}

export function segundosParaReenviar(uid) {
  let proximo = proximosEnvios.get(uid) ?? 0;
  try {
    proximo = Math.max(proximo, Number(localStorage.getItem(chaveVerificacao(uid))) || 0);
  } catch {
    // O intervalo continua valendo na sessão se o armazenamento estiver indisponível.
  }
  return Math.max(0, Math.ceil((proximo - Date.now()) / 1000));
}

export async function enviarVerificacao(user) {
  if (!user || user.uid !== auth.currentUser?.uid || user.emailVerified) return false;
  const { uid } = user;
  if (enviosPendentes.has(uid)) return enviosPendentes.get(uid);

  async function enviar() {
    if (uid !== auth.currentUser?.uid || user.emailVerified || segundosParaReenviar(uid)) return false;
    auth.languageCode = 'pt-BR';
    await sendEmailVerification(user);
    const proximo = Date.now() + INTERVALO_VERIFICACAO;
    proximosEnvios.set(uid, proximo);
    try {
      localStorage.setItem(chaveVerificacao(uid), String(proximo));
    } catch {
      // O prazo em memória ainda protege os reenvios nesta aba.
    }
    return true;
  }

  const envio = navigator.locks
    ? navigator.locks.request(chaveVerificacao(uid), enviar)
    : enviar();
  enviosPendentes.set(uid, envio);
  try {
    return await envio;
  } finally {
    enviosPendentes.delete(uid);
  }
}

export async function consultarEmailConfirmado(user) {
  if (!user || user.uid !== auth.currentUser?.uid) return false;
  await reload(user);
  if (user.emailVerified && user.uid === auth.currentUser?.uid) {
    await user.getIdToken(true);
    return true;
  }
  return false;
}

export function recuperarSenha(email) {
  auth.languageCode = 'pt-BR';
  return sendPasswordResetEmail(auth, email);
}

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
