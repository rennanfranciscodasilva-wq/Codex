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
    const rotaBase = rotaNormalizada.split('?')[0]; 
    const config = rotas[rotaBase];

    if (!config) {
        console.warn(`[roteador] rota desconhecida: ${rotaNormalizada} → fallback`);
        return navegar(ROTA_FALLBACK, { substituir: true });
    }

    const hashCompleto = window.location.hash.replace(/^#/, '');
    const queryString = hashCompleto.split('?')[1] || '';
    const params = new URLSearchParams(queryString);
    const idParam = params.get('id'); 

    const hashAtual = obterRotaDoHash();
    
    if (rotaNormalizada === rotaAtualMontada && hashAtual === rotaNormalizada) {
        if (!hashCompleto.includes('?')) {
            return;
        }
    }

    // --- A CORREÇÃO ESTÁ AQUI: Mantém o hash original completo (com o ?id=) ---
    if (hashAtual !== rotaNormalizada) {
        const hashOriginalCompleto = window.location.hash;
        if (substituir) {
            history.replaceState(null, '', hashOriginalCompleto);
        } else {
            history.pushState(null, '', hashOriginalCompleto);
        }
    }

    // Salva no estado global antes de montar
    window.estadoGlobal = { rotaAtual: rotaNormalizada, idFicha: idParam };
    definirEstado({ rotaAtual: rotaNormalizada, idFicha: idParam });

    const pasta = config.pasta;
    await montarPagina({
        rota: rotaBase,
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

function aoMudarHash() {
    const rota = obterRotaDoHash() || ROTA_INICIAL;
    navegar(rota, { substituir: true });
}

function obterRotaDoHash() {
    const hashCompleto = window.location.hash.replace(/^#/, '');
    if (!hashCompleto) return null;
    const rotaLimpa = hashCompleto.split('?')[0];
    return rotaLimpa || null;
}

function normalizarRota(rota) {
    if (!rota) return ROTA_INICIAL;
    let r = rota.trim();
    if (!r.startsWith('/')) r = '/' + r;
    if (r.length > 1 && r.endsWith('/')) r = r.slice(0, -1);
    return r;
}