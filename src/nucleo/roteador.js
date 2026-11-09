/* ============================================================
   CODEX — Roteador
   ============================================================ */

import { montarPagina } from './ciclo-vida.js';
import { definirEstado } from './estado.js';

const BASE_PAGINA = '/src/paginas';

const rotas = {
    '/inicio':              { pasta: 'inicio',       css: true, js: true },

    /* Ficha — seleção de sistema */
    '/ficha':               { pasta: 'ficha',        css: true, js: true },

    /* Ficha — sub-rotas */
    '/ficha/nova':          { pasta: 'ficha-nova',   css: true, js: true },
    '/ficha/old-dragon':    { pasta: 'placeholder',  css: true, js: true },
    '/ficha/vastura':       { pasta: 'placeholder',  css: true, js: true },

    /* Demais seções */
    '/materiais':           { pasta: 'placeholder',  css: true, js: true },
    '/itens':               { pasta: 'placeholder',  css: true, js: true },
    '/equipamentos':        { pasta: 'placeholder',  css: true, js: true },
    '/deuses':              { pasta: 'placeholder',  css: true, js: true },
    '/magias':              { pasta: 'placeholder',  css: true, js: true },
    '/bestiario':           { pasta: 'placeholder',  css: true, js: true },
    '/perfil':              { pasta: 'placeholder',  css: true, js: true }
};

const ROTA_INICIAL = '/inicio';
const ROTA_FALLBACK = '/inicio';

let containerApp = null;
let inicializado = false;
let rotaAtualMontada = null;

export function iniciarRoteador(container) {
    if (inicializado) return;
    containerApp = container;
    inicializado = true;

    window.addEventListener('hashchange', aoMudarHash);

    const rota = obterRotaDoHash() || ROTA_INICIAL;
    navegar(rota, { substituir: true });
}

export async function navegar(rota, { substituir = false } = {}) {
    const rotaNormalizada = normalizarRota(rota);
    const config = rotas[rotaNormalizada];

    if (!config) {
        console.warn(`[roteador] rota desconhecida: ${rotaNormalizada} → fallback`);
        return navegar(ROTA_FALLBACK, { substituir: true });
    }

    // Se a rota é a mesma que já está montada, não remonta
    if (rotaNormalizada === rotaAtualMontada) {
        return;
    }

    const hashAtual = obterRotaDoHash();
    if (hashAtual !== rotaNormalizada) {
        const novoHash = `#${rotaNormalizada}`;
        if (substituir) {
            history.replaceState(null, '', novoHash);
        } else {
            history.pushState(null, '', novoHash);
        }
    }

    definirEstado({ rotaAtual: rotaNormalizada });

    const pasta = config.pasta;
    await montarPagina({
        rota: rotaNormalizada,
        caminhoHtml: `${BASE_PAGINA}/${pasta}/index.html`,
        caminhoCss:  config.css ? `${BASE_PAGINA}/${pasta}/estilo.css` : null,
        caminhoJs:   config.js  ? `${BASE_PAGINA}/${pasta}/script.js`  : null,
        container: containerApp
    });

    rotaAtualMontada = rotaNormalizada;
}

export function obterRotaAtual() {
    return obterRotaDoHash() || ROTA_INICIAL;
}

/* ---------- Helpers internos ---------- */

function aoMudarHash() {
    const rota = obterRotaDoHash() || ROTA_INICIAL;
    navegar(rota, { substituir: true });
}

function obterRotaDoHash() {
    const hash = window.location.hash.replace(/^#/, '');
    return hash || null;
}

function normalizarRota(rota) {
    if (!rota) return ROTA_INICIAL;
    let r = rota.trim();
    if (!r.startsWith('/')) r = '/' + r;
    if (r.length > 1 && r.endsWith('/')) r = r.slice(0, -1);
    return r;
}