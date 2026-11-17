/* ============================================================
   CODEX — Página: Ficha (seleção de sistema)
   ============================================================ */

let refs = null;

export function montarPagina(container) {
    const pagina = container.querySelector('#pagina-ficha');
    if (!pagina) {
        console.warn('[ficha] #pagina-ficha não encontrada');
        return;
    }

    refs = {
        pagina
    };

    // Nenhum evento extra necessário:
    // - os cards usam data-rota → o núcleo (navegacao.js) cuida da navegação
    // - O cabeçalho é injetado globalmente pelo ciclo-vida.js
}

export function desmontarPagina() {
    refs = null;
}