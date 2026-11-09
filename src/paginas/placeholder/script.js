/* ============================================================
   CODEX — Página: Placeholder
   ============================================================ */

import { obterEstado } from '../../nucleo/estado.js';
import { criarCabecalho } from '../../componentes/cabecalho/cabecalho.js';

const TITULOS = {
    '/ficha/nova':       { titulo: 'NOVA FICHA',      desc: 'A criação de ficha do zero ainda está sendo forjada.' },
    '/ficha/old-dragon': { titulo: 'OLD DRAGON',      desc: 'A ficha Old Dragon ainda está sendo preparada.' },
    '/ficha/vastura':    { titulo: 'VASTURA',         desc: 'A ficha Vastura ainda está sendo preparada.' },
    '/materiais':        { titulo: 'MATERIAIS',       desc: 'A forja de materiais ainda está aquecendo.' },
    '/itens':            { titulo: 'ITENS',           desc: 'O catálogo de itens ainda está em preparação.' },
    '/equipamentos':     { titulo: 'EQUIPAMENTOS',    desc: 'O arsenal ainda está sendo montado.' },
    '/deuses':           { titulo: 'DEUSES',          desc: 'O panteão ainda está se revelando.' },
    '/magias':           { titulo: 'MAGIAS',          desc: 'O grimório de magias ainda está sendo escrito.' },
    '/bestiario':        { titulo: 'BESTIÁRIO',       desc: 'As criaturas ainda estão à espreita.' },
    '/perfil':           { titulo: 'PERFIL',          desc: 'O perfil do aventureiro ainda está em construção.' }
};

export function montarPagina(container) {
    const pagina = container.querySelector('#pagina-placeholder');
    if (!pagina) return;

    // Injeta título CodeX no topo (sempre visível)
    if (!pagina.querySelector('#home-btn')) {
        const titulo = criarCabecalho({ rotaHome: '/inicio' });
        pagina.insertBefore(titulo, pagina.firstChild);
    }

    const rota = obterEstado().rotaAtual || '/inicio';
    const dados = TITULOS[rota] || { titulo: 'EM CONSTRUÇÃO', desc: 'Esta seção ainda está sendo forjada.' };

    const tituloEl = pagina.querySelector('#placeholder-titulo');
    const descEl = pagina.querySelector('#placeholder-desc');

    if (tituloEl) tituloEl.textContent = dados.titulo;
    if (descEl) descEl.textContent = dados.desc;
}

export function desmontarPagina() {
    // Nada a limpar
}