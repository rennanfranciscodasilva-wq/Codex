/* ============================================================
   CODEX — Componente: Rodapé
   Renderiza o rodapé padrão do Codex.
   ============================================================ */

/**
 * Cria e retorna o elemento do rodapé.
 * @param {object} opcoes
 * @param {boolean} opcoes.oculto - inicia oculto (ex.: dentro de painel)
 * @returns {HTMLElement}
 */
export function criarRodape({ oculto = false } = {}) {
    const rodape = document.createElement('div');
    rodape.className = 'footer-terms';
    rodape.id = 'footer-terms';

    if (oculto) {
        rodape.style.opacity = '0';
        rodape.style.pointerEvents = 'none';
    }

    rodape.innerHTML = `
        <a href="#" data-rota="/inicio"><i class="fas fa-shield-halved"></i> Privacidade</a>
        <span class="separator">·</span>
        <a href="#" data-rota="/inicio"><i class="fas fa-file-contract"></i> Termos</a>
        <span class="separator">·</span>
        <a href="#" data-rota="/inicio"><i class="fas fa-cookie-bite"></i> Cookies</a>
        <span class="separator">·</span>
        <a href="#" data-rota="/inicio"><i class="fas fa-envelope"></i> Contato</a>
        <span class="separator">·</span>
        <span class="copyright">© 2025 Codex</span>
    `;

    return rodape;
}

/**
 * Mostra/oculta o rodapé.
 * @param {HTMLElement} rodape
 * @param {boolean} visivel
 */
export function definirVisibilidade(rodape, visivel) {
    if (!rodape) return;
    rodape.style.opacity = visivel ? '1' : '0';
    rodape.style.pointerEvents = visivel ? 'auto' : 'none';
}