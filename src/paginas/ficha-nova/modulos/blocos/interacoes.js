/* ============================================================
   MÓDULO: INTERAÇÕES DE BLOCO (arrasto, resize, excluir)
   ============================================================ */

import { ajustarTituloAoRedimensionar, redimensionar } from '../redimensionamento.js';
import { encaixarNasGuias } from '../regua.js';
import { confirmarAcao } from '../../../../componentes/dialogos/dialogos.js';
import { 
    estado, 
    salvarEstado, 
    GRID,
    getPaginaAtiva,
    estaEmModoEdicao
} from '../paginas/index.js';
import { formulaEventBus } from '../automacao.js';

const BLOCO_LARG_MIN = 50;

let blocoSendoEditadoId = null;

export function iniciarArrastoBloco(e, bloco, painelPaiId) {
    e.preventDefault();
    const pag = getPaginaAtiva();
    if (!pag) return;
    const painel = pag.paineis.find(p => p.id === painelPaiId);
    if (!painel) return;
    
    const elBloco = document.querySelector(`.painel[data-painel-id="${painelPaiId}"] .bloco[data-bloco-id="${bloco.id}"]`);
    const elArea = document.querySelector(`.painel[data-painel-id="${painelPaiId}"] .painel-conteudo`);
    if (!elBloco || !elArea) return;

    // --- CURSOR E BLOQUEIO DE SCROLL NO MOBILE ---
    document.body.style.cursor = 'grabbing';
    elBloco.style.cursor = 'grabbing';
    elBloco.style.touchAction = 'none'; // Impede o scroll da tela enquanto arrasta

    const folha = document.querySelector('#pagina-ficha-nova .folha');
    if (!folha) return;
    const zoomAtual = folha.getBoundingClientRect().width / folha.offsetWidth || 1;
    const startX = e.clientX, startY = e.clientY, origX = bloco.x, origY = bloco.y;

    const onMove = (ev) => {
        let novoX = origX + (ev.clientX - startX) / zoomAtual;
        let novoY = origY + (ev.clientY - startY) / zoomAtual;
        
        // 1. Snap no grid
        if (estado.modoLayout === 'grid') {
            novoX = Math.round(novoX / GRID) * GRID; 
            novoY = Math.round(novoY / GRID) * GRID;
        }

        ({ x: novoX, y: novoY } = encaixarNasGuias(folha, elArea, novoX, novoY, bloco.largura, bloco.altura, zoomAtual));

        // 2. Limites
        const maxX = elArea.clientWidth - bloco.largura - 10, maxY = elArea.clientHeight - bloco.altura - 10;
        if (novoX < 10) novoX = 10; if (novoY < 10) novoY = 10;
        if (novoX > maxX) novoX = maxX; if (novoY > maxY) novoY = maxY;

        bloco.x = Math.round(novoX); 
        bloco.y = Math.round(novoY);
        elBloco.style.left = Math.round(novoX) + 'px'; 
        elBloco.style.top = Math.round(novoY) + 'px';
    };
    
    const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        
        // --- REMOVE O CURSOR E O BLOQUEIO DE SCROLL ---
        document.body.style.cursor = 'default';
        elBloco.style.cursor = 'grab';
        elBloco.style.touchAction = '';
        
        salvarEstado();
    };
    
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
}

export function iniciarResizeBloco(e, bloco, lado, painelPaiId) {
    e.preventDefault(); e.stopPropagation();
    const pag = getPaginaAtiva();
    if (!pag) return;
    const painel = pag.paineis.find(p => p.id === painelPaiId);
    if (!painel) return;
    const elBloco = document.querySelector(`.painel[data-painel-id="${painelPaiId}"] .bloco[data-bloco-id="${bloco.id}"]`);
    const elArea = document.querySelector(`.painel[data-painel-id="${painelPaiId}"] .painel-conteudo`);
    if (!elBloco || !elArea) return;

    // --- VERIFICAÇÃO DE MODO JOGADOR ---
    const isExpansivel = bloco.modelo && bloco.modelo.includes('expansivel');
    
    if (!estaEmModoEdicao()) {
        if (!isExpansivel) return;
        if (lado === 'esq' || lado === 'dir') return;
    }

    // --- BLOQUEIO DE SCROLL NO MOBILE ---
    elBloco.style.touchAction = 'none';

    const folha = document.querySelector('#pagina-ficha-nova .folha');
    if (!folha) return;
    const zoomAtual = parseFloat(folha.style.zoom || '1') || 1;
    const startX = e.clientX, startY = e.clientY;
    const orig = { x: bloco.x, y: bloco.y, largura: bloco.largura, altura: bloco.altura };

    let minLargura = BLOCO_LARG_MIN;
    if (bloco.tipo === 'numerico') {
        minLargura = bloco.modTipo === 'com' ? 140 : 80;
    }

    let minAltura = 28;
    let passoAltura = 0;
    const campoTexto = elBloco.querySelector('.bloco-textarea');
    const proporcional = estaEmModoEdicao() && estado.redimensionarEmConjunto;
    if (campoTexto && (proporcional || lado === 'topo' || lado === 'base')) {
        const borda = getComputedStyle(elBloco);
        const interno = getComputedStyle(campoTexto.parentElement);
        passoAltura = parseFloat(getComputedStyle(campoTexto).lineHeight);
        minAltura = passoAltura + parseFloat(borda.borderTopWidth) + parseFloat(borda.borderBottomWidth)
            + parseFloat(interno.paddingTop) + parseFloat(interno.paddingBottom);
    }

    const onMove = (ev) => {
        const dx = (ev.clientX - startX) / zoomAtual, dy = (ev.clientY - startY) / zoomAtual;
        const dimensoes = redimensionar(orig, lado, dx, dy, {
            minLargura, minAltura, passoAltura, proporcional, limiteX: elArea.clientWidth, limiteY: elArea.clientHeight,
            grade: estado.modoLayout === 'grid' ? GRID : 0
        });
        ajustarTituloAoRedimensionar(bloco, elBloco, dimensoes);
        Object.assign(bloco, dimensoes);
        elBloco.style.left = bloco.x + 'px'; elBloco.style.top = bloco.y + 'px';
        elBloco.style.width = bloco.largura + 'px'; elBloco.style.height = bloco.altura + 'px';
    };
    
    const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        elBloco.style.touchAction = ''; // Libera o scroll novamente
        salvarEstado();
    };
    
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
}

export async function excluirBloco(painelPaiId, blocoId, renderizarPaineisCallback) {
    const pag = getPaginaAtiva();
    if (!pag) return;
    const painel = pag.paineis.find(p => p.id === painelPaiId);
    if (!painel || !painel.blocos) return;

    const bloco = painel.blocos.find(b => b.id === blocoId);
    if (!bloco) return;

    const nome = bloco.tituloBloco || bloco.texto || '(sem título)';
    const label = nome.length > 30 ? nome.slice(0, 30) + '…' : nome;
    if (!(await confirmarAcao(`Excluir o bloco "${label}"?`))) return;

    if (blocoSendoEditadoId === blocoId) {
        blocoSendoEditadoId = null;
        document.querySelector('#bloco-settings-sheet')?.classList.remove('active');
    }

    painel.blocos = painel.blocos.filter(b => b.id !== blocoId);
    salvarEstado();
    if (renderizarPaineisCallback) renderizarPaineisCallback();
    if (typeof formulaEventBus !== 'undefined') formulaEventBus.dispatchEvent(new Event('formulaAtualizada'));
}
