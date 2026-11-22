/* ============================================================
   CODEX — Roteador
   ============================================================ */

import { montarPagina } from './ciclo-vida.js';
import { definirEstado } from './estado.js';

const paginasHtml = import.meta.glob('../paginas/*/*.html', { query: '?raw', import: 'default' });
const paginasCss = import.meta.glob('../paginas/*/{estilo,placeholder}.css', { query: '?inline', import: 'default' });
const paginasJs = import.meta.glob('../paginas/*/script.js');

const rotas = {
    '/inicio':              { pasta: 'inicio' },
    '/login':               { pasta: 'login' },
    '/ficha':               { pasta: 'ficha' },
    '/ficha/nova':          { pasta: 'ficha-nova' },
    '/ficha/personagens':   { pasta: 'personagens' },
    '/ficha/ficha-nova':    { pasta: 'ficha-nova' },
    '/ficha/old-dragon':    { pasta: 'placeholder' },
    '/ficha/vastura':       { pasta: 'placeholder' },
    '/materiais':           { pasta: 'placeholder' },
    '/itens':               { pasta: 'placeholder' },
    '/equipamentos':        { pasta: 'placeholder' },
    '/deuses':              { pasta: 'placeholder' },
    '/magias':              { pasta: 'placeholder' },
    '/bestiario':           { pasta: 'placeholder' },
    '/perfil':              { pasta: 'perfil' }
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
    const base = '../paginas/' + pasta;
    const caminhoCss = base + (pasta === 'placeholder' ? '/placeholder.css' : '/estilo.css');
    const montada = await montarPagina({
        rota: rotaBase,
        carregarHtml: paginasHtml[base + (pasta === 'placeholder' ? '/placeholder.html' : '/index.html')],
        caminhoCss,
        carregarCss: paginasCss[caminhoCss],
        caminhoJs: base + '/script.js',
        importarModulo: paginasJs[base + '/script.js'],
        container: containerApp
    });

    if (montada && window.location.hash === hashDestino) rotaAtualMontada = rotaNormalizada;
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
