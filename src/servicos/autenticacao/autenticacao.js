/* ============================================================
   CODEX — Serviço de Autenticação (simulado)
   Lógica extraída do protótipo b.html, agora encapsulada.
   Persiste em localStorage via serviço de armazenamento.
   ============================================================ */

import * as armazenamento from '../armazenamento/local-storage.js';

const CHAVE_USUARIO = 'usuario';
const CHAVE_LOGADO = 'logado';

/**
 * Retorna o usuário logado, ou null.
 * @returns {{ nome: string, email: string } | null}
 */
export function usuarioAtual() {
    if (!estaLogado()) return null;
    return armazenamento.ler(CHAVE_USUARIO, null);
}

/**
 * Verifica se há sessão ativa.
 */
export function estaLogado() {
    return armazenamento.ler(CHAVE_LOGADO, false) === true;
}

/**
 * Registra um novo usuário e já o loga.
 * @param {{ nome: string, email: string, senha: string }} dados
 * @returns {{ ok: boolean, erro?: string, usuario?: object }}
 */
export function registrar({ nome, email, senha }) {
    const nomeLimpo = (nome || '').trim();
    const emailLimpo = (email || '').trim().toLowerCase();
    const senhaLimpa = (senha || '').trim();

    if (!nomeLimpo || !emailLimpo || !senhaLimpa) {
        return { ok: false, erro: 'Preencha todos os campos.' };
    }

    const usuario = {
        nome: nomeLimpo,
        email: emailLimpo,
        senha: senhaLimpa, // ⚠️ simulado — não usar em produção real
        criadoEm: new Date().toISOString()
    };

    armazenamento.salvar(CHAVE_USUARIO, usuario);
    armazenamento.salvar(CHAVE_LOGADO, true);

    return { ok: true, usuario: { nome: usuario.nome, email: usuario.email } };
}

/**
 * Tenta entrar com email/senha.
 * @param {{ email: string, senha: string }} dados
 * @returns {{ ok: boolean, erro?: string, usuario?: object }}
 */
export function entrar({ email, senha }) {
    const emailLimpo = (email || '').trim().toLowerCase();
    const senhaLimpa = (senha || '').trim();

    if (!emailLimpo || !senhaLimpa) {
        return { ok: false, erro: 'Preencha email e senha.' };
    }

    const usuario = armazenamento.ler(CHAVE_USUARIO, null);
    if (!usuario) {
        return { ok: false, erro: 'Nenhuma conta encontrada. Registre-se primeiro.' };
    }

    if (usuario.email !== emailLimpo || usuario.senha !== senhaLimpa) {
        return { ok: false, erro: 'Email ou senha incorretos.' };
    }

    armazenamento.salvar(CHAVE_LOGADO, true);
    return { ok: true, usuario: { nome: usuario.nome, email: usuario.email } };
}

/**
 * Encerra a sessão (mantém a conta salva).
 */
export function sair() {
    armazenamento.salvar(CHAVE_LOGADO, false);
}

/**
 * Remove a conta E a sessão (útil para testes).
 */
export function apagarConta() {
    armazenamento.remover(CHAVE_USUARIO);
    armazenamento.remover(CHAVE_LOGADO);
}