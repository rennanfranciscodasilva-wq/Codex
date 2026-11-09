/* ============================================================
   CODEX — Componente: Cabeçalho
   Cria o título "CodeX" clicável que volta para a Home.
   ============================================================ */

/**
 * Cria o título CodeX.
 * @param {object} opcoes
 * @param {string} opcoes.rotaHome - rota para onde volta (padrão: '/inicio')
 * @returns {HTMLAnchorElement}
 */
export function criarCabecalho({ rotaHome = '/inicio' } = {}) {
    const titulo = document.createElement('a');
    titulo.href = '#';
    titulo.className = 'codex-title';
    titulo.id = 'home-btn';
    titulo.setAttribute('data-rota', rotaHome);
    titulo.setAttribute('aria-label', 'Voltar ao início do Codex');
    titulo.textContent = 'CodeX';
    return titulo;
}