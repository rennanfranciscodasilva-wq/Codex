/* ============================================================
   CODEX — Serviço de Armazenamento (localStorage)
   Wrapper com prefixo "codex:" para evitar colisões.
   ============================================================ */

const PREFIXO = 'codex:';

/**
 * Salva um valor (serializado em JSON).
 * @param {string} chave
 * @param {any} valor
 */
export function salvar(chave, valor) {
    try {
        const json = JSON.stringify(valor);
        localStorage.setItem(PREFIXO + chave, json);
        return true;
    } catch (e) {
        console.error('[armazenamento] falha ao salvar:', chave, e);
        return false;
    }
}

/**
 * Lê um valor (deserializado). Retorna `padrao` se não existir.
 * @param {string} chave
 * @param {any} padrao
 */
export function ler(chave, padrao = null) {
    try {
        const json = localStorage.getItem(PREFIXO + chave);
        if (json === null) return padrao;
        return JSON.parse(json);
    } catch (e) {
        console.error('[armazenamento] falha ao ler:', chave, e);
        return padrao;
    }
}

/**
 * Remove uma chave.
 * @param {string} chave
 */
export function remover(chave) {
    try {
        localStorage.removeItem(PREFIXO + chave);
        return true;
    } catch (e) {
        console.error('[armazenamento] falha ao remover:', chave, e);
        return false;
    }
}

/**
 * Verifica se uma chave existe.
 * @param {string} chave
 */
export function existe(chave) {
    return localStorage.getItem(PREFIXO + chave) !== null;
}

/**
 * Limpa TODAS as chaves do Codex (não afeta outras do domínio).
 */
export function limparTudo() {
    const chaves = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(PREFIXO)) chaves.push(k);
    }
    chaves.forEach((k) => localStorage.removeItem(k));
}