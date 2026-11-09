/* ============================================================
   CODEX — Página: Ficha (seleção de sistema)
   Injeta o título CodeX no topo (sempre visível).
   Os cards usam [data-rota] — o núcleo cuida da navegação.
   ============================================================ */

import { criarCabecalho } from '../../componentes/cabecalho/cabecalho.js';

let refs = null;

export function montarPagina(container) {
    const pagina = container.querySelector('#pagina-ficha');
    if (!pagina) {
        console.warn('[ficha] #pagina-ficha não encontrada');
        return;
    }

    // 1. Injeta título CodeX (só se ainda não existir — idempotente)
    if (!pagina.querySelector('#home-btn')) {
        const titulo = criarCabecalho({ rotaHome: '/inicio' });
        pagina.insertBefore(titulo, pagina.firstChild);
    }

    refs = {
        pagina,
        titulo: pagina.querySelector('#home-btn')
    };

    // Nenhum evento extra necessário:
    // - o título usa data-rota="/inicio" → núcleo navega
    // - os cards usam data-rota → núcleo navega
}

export function desmontarPagina() {
    refs = null;
}