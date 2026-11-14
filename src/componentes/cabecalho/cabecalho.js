/* ============================================================
   CODEX — Componente: Cabeçalho (Título CodeX)
   ============================================================ */

export function criarCabecalho({ rotaHome = '/inicio' } = {}) {
    const container = document.createElement('div');
    container.id = 'home-btn';
    container.className = 'codex-header-container';

    const link = document.createElement('a');
    link.className = 'codex-title';
    link.href = `#${rotaHome}`;
    link.setAttribute('data-rota', rotaHome);
    link.innerHTML = 'Code<span>X</span>'; // Aquele "X" dourado clássico

    container.appendChild(link);
    return container;
}