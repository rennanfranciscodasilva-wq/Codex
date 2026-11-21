/* ============================================================
   MÓDULO: ESTADO GLOBAL (Ficha Nova) - MULTI-FICHAS
   ============================================================ */

import { extrairValores } from './modelo-importado.js';

export const MAX_PAGINAS = 10;
export const GRID = 20;
export const PAD_X = 40;
export const PAD_Y = 30;

export let estado = {
    paginas: [],
    paginaAtivaId: null,
    animacaoAtiva: true,
    modoLayout: 'livre',
    nomeSistema: '',
    idSistemaAtual: null, // ID do molde (ex: sist_dnd)
    idFichaAtual: null    // ID da ficha do jogador (ex: ficha_joao)
};

export const areaTransferenciaCodex = { tipo: null, dados: null };

export function gerarId(prefixo) {
    return prefixo + Date.now().toString() + Math.random().toString(36).substring(2, 6);
}

export function salvarEstado() {
    if (localStorage.getItem('codex_wizard_novo_sistema') === 'true') return;

    const dados = { 
        paginas: estado.paginas, 
        paginaAtivaId: estado.paginaAtivaId,
        animacaoAtiva: estado.animacaoAtiva,
        modoLayout: estado.modoLayout,
        nomeSistema: estado.nomeSistema,
        idSistemaAtual: estado.idSistemaAtual,
        idFichaAtual: estado.idFichaAtual
    };

    if (!estado.idFichaAtual) {
        localStorage.setItem('codex_ficha_dados', JSON.stringify(dados));
        return;
    }

    const fichasJogador = JSON.parse(localStorage.getItem('codex_fichas_jogador') || '[]');
    const ficha = fichasJogador.find(f => f.id === estado.idFichaAtual);
    if (!ficha) return;

    if (Array.isArray(ficha.valores)) ficha.valores = extrairValores(dados);
    else ficha.dados = dados;
    localStorage.setItem('codex_fichas_jogador', JSON.stringify(fichasJogador));
}

export function getPaginaAtiva() {
    return estado.paginas.find(p => p.id === estado.paginaAtivaId);
}

export function estaEmModoEdicao() {
    const el = document.querySelector('#pagina-ficha-nova');
    return el && el.classList.contains('modo-edicao');
}

export function gerarNomeUnico(nomeBase, lista) {
    if (!lista || lista.length === 0) return nomeBase;
    let nome = nomeBase;
    let count = 1;
    while (lista.some(item => item.titulo === nome || item.nome === nome)) {
        nome = `${nomeBase} ${count}`;
        count++;
    }
    return nome;
}
