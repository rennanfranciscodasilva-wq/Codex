/* ============================================================
   CODEX — Roteador
   ============================================================ */

import { montarPagina } from './ciclo-vida.js';
import { definirEstado } from './estado.js';

const BASE_PAGINA = '/src/paginas';

const rotas = {
    '/inicio':              { pasta: 'inicio',       css: true, js: true },
    '/login':               { pasta: 'login',        css: true, js: true },
    '/ficha':               { pasta: 'ficha',        css: true, js: true },
    '/ficha/nova':          { pasta: 'ficha-nova',   css: true, js: true },
    '/ficha/personagens':   { pasta: 'personagens',  css: true, js: true }, 
    '/ficha/ficha-nova':    { pasta: 'ficha-nova',   css: true, js: true }, 
    '/ficha/old-dragon':    { pasta: 'placeholder',  css: true, js: true },
    '/ficha/vastura':       { pasta: 'placeholder',  css: true, js: true },
    '/materiais':           { pasta: 'placeholder',  css: true, js: true },
    '/itens':               { pasta: 'placeholder',  css: true, js: true },
    '/equipamentos':        { pasta: 'placeholder',  css: true, js: true },
    '/deuses':              { pasta: 'placeholder',  css: true, js: true },
    '/magias':              { pasta: 'placeholder',  css: true, js: true },
    '/bestiario':           { pasta: 'placeholder',  css: true, js: true },
    '/perfil':              { pasta: 'perfil',       css: true, js: true }
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
    const [rotaBase, queryString] = rotaNormalizada.split(/\?(.*)/s);
    const config = Object.hasOwn(rotas, rotaBase) ? rotas[rotaBase] : null;

    if (!config) {
        console.warn(`[roteador] rota desconhecida: ${rotaNormalizada} → fallback`);
        return navegar(ROTA_FALLBACK, { substituir: true });
    }

    const idParam = new URLSearchParams(queryString).get('id');
    const hashDestino = '#' + rotaNormalizada;
    if (window.location.hash !== hashDestino) {
        if (substituir) {
            history.replaceState(null, '', hashDestino);
        } else {
            history.pushState(null, '', hashDestino);
        }
    }
    if (rotaAtualMontada === rotaNormalizada) return;
    rotaAtualMontada = null;

    // Salva no estado global antes de montar
    window.estadoGlobal = { rotaAtual: rotaBase, idFicha: idParam };
    definirEstado({ rotaAtual: rotaBase, idFicha: idParam });

    const pasta = config.pasta;
    await montarPagina({
        rota: rotaBase,
        caminhoHtml: `${BASE_PAGINA}/${pasta}/${pasta === 'placeholder' ? 'placeholder' : 'index'}.html`,
        caminhoCss:  config.css ? `${BASE_PAGINA}/${pasta}/${pasta === 'placeholder' ? 'placeholder' : 'estilo'}.css` : null,
        caminhoJs:   config.js  ? `${BASE_PAGINA}/${pasta}/script.js`  : null,
        container: containerApp
    });

    if (window.location.hash === hashDestino) rotaAtualMontada = rotaNormalizada;
}

export function obterRotaAtual() {
    return obterRotaDoHash()?.split('?')[0] || ROTA_INICIAL;
}

function aoMudarHash() {
    const rota = obterRotaDoHash() || ROTA_INICIAL;
    navegar(rota, { substituir: true });
}

function obterRotaDoHash() {
    return window.location.hash.slice(1) || null;
}

function normalizarRota(rota) {
    if (!rota) return ROTA_INICIAL;
    const indiceQuery = rota.indexOf('?');
    const caminho = indiceQuery === -1 ? rota : rota.slice(0, indiceQuery);
    const query = indiceQuery === -1 ? '' : rota.slice(indiceQuery);
    const base = caminho.trim().replace(/^\/?|\/+$/g, '');
    return '/' + base + query;
}
