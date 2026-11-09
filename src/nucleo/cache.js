/* ============================================================
   CODEX — Cache de Módulos
   Evita reimportar o mesmo módulo de página várias vezes.
   ============================================================ */

const cacheModulos = new Map();

/**
 * Importa (ou reaproveita do cache) o módulo de uma página.
 * @param {string} caminho - ex.: '/src/paginas/inicio/script.js'
 * @returns {Promise<object>}
 */
export async function carregarModulo(caminho) {
    if (cacheModulos.has(caminho)) {
        return cacheModulos.get(caminho);
    }

    const promessa = import(/* @vite-ignore */ caminho);
    cacheModulos.set(caminho, promessa);

    try {
        return await promessa;
    } catch (erro) {
        cacheModulos.delete(caminho);
        throw erro;
    }
}

/**
 * Remove um módulo do cache (força recarregar na próxima vez).
 */
export function limparModulo(caminho) {
    cacheModulos.delete(caminho);
}

/**
 * Limpa todo o cache de módulos.
 */
export function limparCache() {
    cacheModulos.clear();
}

/**
 * Verifica se um módulo já está em cache.
 */
export function estaEmCache(caminho) {
    return cacheModulos.has(caminho);
}