/* ============================================================
   CODEX — Estado Global
   Guarda SOMENTE informações realmente compartilhadas.
   Estado de páginas (ex.: categoria selecionada) fica NA página.
   ============================================================ */

const estadoInicial = {
    tema: 'escuro',
    usuario: null,        // { nome, email } quando logado
    rotaAtual: '/',
    rotaAnterior: null
};

let estado = { ...estadoInicial };
const ouvintes = new Set();

/**
 * Retorna cópia do estado (evita mutação externa acidental).
 */
export function obterEstado() {
    return { ...estado };
}

/**
 * Atualiza parte do estado e notifica ouvintes.
 * @param {object} parcial - ex.: { usuario: {...} }
 */
export function definirEstado(parcial) {
    estado = { ...estado, ...parcial };
    notificar();
}

/**
 * Reseta o estado para o inicial.
 */
export function resetarEstado() {
    estado = { ...estadoInicial };
    notificar();
}

/**
 * Registra um ouvinte. Retorna função para cancelar.
 * @param {(estado: object) => void} callback
 */
export function observarEstado(callback) {
    ouvintes.add(callback);
    return () => ouvintes.delete(callback);
}

function notificar() {
    const copia = { ...estado };
    ouvintes.forEach((cb) => {
        try { cb(copia); } catch (e) { console.error('[estado] ouvinte falhou:', e); }
    });
}