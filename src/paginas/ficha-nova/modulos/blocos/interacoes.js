/* ============================================================
   MÓDULO: INTERAÇÕES DE BLOCO (arrasto, resize, excluir)
   ============================================================ */

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

    // --- CURSOR DE MÃOZINHA ---
    document.body.style.cursor = 'grabbing';
    elBloco.style.cursor = 'grabbing';

    const folha = document.querySelector('#pagina-ficha-nova .folha');
    if (!folha) return;
    const zoomAtual = parseFloat(folha.style.zoom || '1') || 1;
    const startX = e.clientX, startY = e.clientY, origX = bloco.x, origY = bloco.y;

    const onMove = (ev) => {
        let novoX = origX + (ev.clientX - startX) / zoomAtual;
        let novoY = origY + (ev.clientY - startY) / zoomAtual;
        
        // 1. Snap no grid
        if (estado.modoLayout === 'grid') {
            novoX = Math.round(novoX / GRID) * GRID; 
            novoY = Math.round(novoY / GRID) * GRID;
        }

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
        
        // --- REMOVE O CURSOR DE MÃOZINHA ---
        document.body.style.cursor = 'default';
        elBloco.style.cursor = 'grab';
        
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

    const folha = document.querySelector('#pagina-ficha-nova .folha');
    if (!folha) return;
    const zoomAtual = parseFloat(folha.style.zoom || '1') || 1;
    const startX = e.clientX, startY = e.clientY;
    const orig = { x: bloco.x, y: bloco.y, largura: bloco.largura, altura: bloco.altura };

    let minLargura = BLOCO_LARG_MIN;
    if (bloco.tipo === 'numerico') {
        minLargura = bloco.modTipo === 'com' ? 140 : 80;
    }

    let blocoAltMin = 28;

    const onMove = (ev) => {
        const dx = (ev.clientX - startX) / zoomAtual, dy = (ev.clientY - startY) / zoomAtual;
        let { x, y, largura, altura } = orig;
        if (lado === 'dir') largura = orig.largura + dx;
        if (lado === 'esq') { largura = orig.largura - dx; x = orig.x + dx; }
        if (lado === 'base') altura = orig.altura + dy;
        if (lado === 'topo') { altura = orig.altura - dy; y = orig.y + dy; }

        if (largura < minLargura) { if (lado === 'esq') x = orig.x + (orig.largura - minLargura); largura = minLargura; }
        if (altura < blocoAltMin) { if (lado === 'topo') y = orig.y + (orig.altura - blocoAltMin); altura = blocoAltMin; }

        if (x < 10) { largura += x - 10; x = 10; }
        if (y < 10) { altura += y - 10; y = 10; }
        if (x + largura > elArea.clientWidth - 10) largura = elArea.clientWidth - 10 - x;
        if (y + altura > elArea.clientHeight - 10) altura = elArea.clientHeight - 10 - y;

        // Snap no Grid para o Resize
        if (estado.modoLayout === 'grid') {
            if (lado === 'dir') largura = Math.round((x + largura) / GRID) * GRID - x;
            if (lado === 'base') altura = Math.round((y + altura) / GRID) * GRID - y;
            if (lado === 'esq') { const novaLarg = Math.round((x + largura) / GRID) * GRID; largura = x + largura - novaLarg; x = novaLarg; }
            if (lado === 'topo') { const novaAlt = Math.round((y + altura) / GRID) * GRID; altura = y + altura - novaAlt; y = novaAlt; }
        }

        x = Math.round(x); y = Math.round(y);
        largura = Math.round(largura); altura = Math.round(altura);

        bloco.x = x; bloco.y = y; bloco.largura = largura; bloco.altura = altura;
        elBloco.style.left = x + 'px'; elBloco.style.top = y + 'px'; 
        elBloco.style.width = largura + 'px'; elBloco.style.height = altura + 'px';
    };
    
    const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        salvarEstado();
    };
    
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
}

export function excluirBloco(painelPaiId, blocoId, renderizarPaineisCallback) {
    const pag = getPaginaAtiva();
    if (!pag) return;
    const painel = pag.paineis.find(p => p.id === painelPaiId);
    if (!painel || !painel.blocos) return;

    const bloco = painel.blocos.find(b => b.id === blocoId);
    if (!bloco) return;

    const nome = bloco.tituloBloco || bloco.texto || '(sem título)';
    const label = nome.length > 30 ? nome.slice(0, 30) + '…' : nome;
    if (!confirm(`Excluir o bloco "${label}"?`)) return;

    if (blocoSendoEditadoId === blocoId) {
        blocoSendoEditadoId = null;
        document.querySelector('#bloco-settings-sheet')?.classList.remove('active');
    }

    painel.blocos = painel.blocos.filter(b => b.id !== blocoId);
    salvarEstado();
    if (renderizarPaineisCallback) renderizarPaineisCallback();
    if (typeof formulaEventBus !== 'undefined') formulaEventBus.dispatchEvent(new Event('formulaAtualizada'));
}