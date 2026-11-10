/* ============================================================
   MÓDULO: PAINÉIS / CAMPOS (Ficha Nova)
   ============================================================ */

import { estaEmModoEdicao, estado, GRID, PAD_X, PAD_Y } from './paginas.js';

const PAINEL_LARG_MIN = 180;
const PAINEL_ALT_MIN = 120;

let painelSendoEditadoId = null;

export function renderizarPainel(painel, renderizarPaineisCallback, renderizarBlocoCallback) {
    const el = document.createElement('div');
    el.className = 'painel';
    el.dataset.painelId = painel.id;
    el.style.left = painel.x + 'px'; el.style.top = painel.y + 'px';
    el.style.width = painel.largura + 'px'; el.style.height = painel.altura + 'px';

    const header = document.createElement('div');
    header.className = 'painel-header';

    const titulo = document.createElement('input');
    titulo.className = 'painel-titulo'; titulo.value = painel.titulo;
    titulo.addEventListener('input', (e) => {
        if (!estaEmModoEdicao()) { e.target.value = painel.titulo; return; }
        painel.titulo = e.target.value;
    });
    titulo.addEventListener('pointerdown', (e) => { if (!estaEmModoEdicao()) e.preventDefault(); });

    const btnAddBloco = document.createElement('button');
    btnAddBloco.className = 'painel-btn-add-bloco';
    btnAddBloco.innerHTML = '<i class="fas fa-plus"></i>';
    btnAddBloco.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!estaEmModoEdicao()) return;
        adicionarBlocoNoPainel(painel);
        renderizarPaineisCallback();
    });

    const engrenagem = document.createElement('button');
    engrenagem.className = 'painel-engrenagem';
    engrenagem.innerHTML = '<i class="fas fa-cog"></i>';
    engrenagem.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!estaEmModoEdicao()) return;
        window.abrirBottomSheetCampo(painel.id);
    });

    header.appendChild(titulo); header.appendChild(btnAddBloco); header.appendChild(engrenagem);
    el.appendChild(header);

    const area = document.createElement('div');
    area.className = 'painel-conteudo';
    if (!painel.blocos) painel.blocos = [];
    painel.blocos.forEach(b => {
        area.appendChild(renderizarBlocoCallback(b, painel.id, renderizarPaineisCallback));
    });
    el.appendChild(area);

    ['topo', 'base', 'esq', 'dir'].forEach(lado => {
        const borda = document.createElement('div');
        borda.className = `painel-borda painel-borda-${lado}`;
        borda.addEventListener('pointerdown', (e) => {
            if (!estaEmModoEdicao()) return;
            iniciarResizePainel(e, painel, lado);
        });
        el.appendChild(borda);
    });

    header.addEventListener('pointerdown', (e) => {
        if (!estaEmModoEdicao()) return;
        if (e.target.closest('button') || e.target.tagName === 'INPUT') return;
        iniciarArrastoPainel(e, painel);
    });

    return el;
}

export function configurarSheetCampo(renderizarPaineisCallback) {
    const sheet = document.querySelector('#campo-settings-sheet');
    const dragHandle = document.querySelector('#campo-sheet-header-drag');
    const btnClose = document.querySelector('#campo-sheet-close-btn');
    const inputNome = document.querySelector('#campo-sheet-nome');

    if (!sheet) return;

    let isDragging = false, startX = 0, startY = 0, initialX = 0, initialY = 0;
    const onPointerDown = (e) => {
        if (e.target.closest('input, button, textarea, select')) return;
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = sheet.getBoundingClientRect(); initialX = rect.left; initialY = rect.top;
        sheet.style.transition = 'none'; sheet.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
        if (!isDragging) return;
        sheet.style.left = `${initialX + (e.clientX - startX)}px`; sheet.style.top = `${initialY + (e.clientY - startY)}px`;
        sheet.style.bottom = 'auto'; sheet.style.right = 'auto';
    };
    const onPointerUp = (e) => {
        if (!isDragging) return;
        isDragging = false; sheet.style.transition = 'transform 0.3s, opacity 0.3s'; sheet.releasePointerCapture(e.pointerId);
    };
    if (dragHandle) {
        dragHandle.addEventListener('pointerdown', onPointerDown);
        sheet.addEventListener('pointermove', onPointerMove); sheet.addEventListener('pointerup', onPointerUp);
    }

    if (btnClose) btnClose.addEventListener('click', () => {
        sheet.classList.remove('active'); painelSendoEditadoId = null;
    });

    inputNome.addEventListener('input', (e) => {
        const pag = estado.paginas.find(p => p.id === estado.paginaAtivaId);
        const p = pag.paineis.find(p => p.id === painelSendoEditadoId);
        if (p) {
            p.titulo = e.target.value;
            const elInput = document.querySelector(`.painel[data-painel-id="${p.id}"] .painel-titulo`);
            if (elInput) elInput.value = p.titulo;
        }
    });

    window.abrirBottomSheetCampo = (id) => {
        const pag = estado.paginas.find(p => p.id === estado.paginaAtivaId);
        const p = pag.paineis.find(p => p.id === id);
        if (!p) return;
        painelSendoEditadoId = id;
        inputNome.value = p.titulo;
        sheet.style.left = 'auto'; sheet.style.top = 'auto'; sheet.style.right = '2rem'; sheet.style.bottom = '2rem';
        sheet.classList.add('active');
    };
}

function adicionarBlocoNoPainel(painel) {
    if (!painel.blocos) painel.blocos = [];
    const w = 140, h = 60, gap = 8, offsetX = 10, offsetY = 10;
    const colisao = (x, y) => painel.blocos.some(b => !(x + w + gap <= b.x || x >= b.x + b.largura + gap || y + h + gap <= b.y || y >= b.y + b.altura + gap));
    let slot = { x: offsetX, y: offsetY };
    
    for (let linha = 0; ; linha++) {
        for (let col = 0; col < 2; col++) {
            const x = offsetX + (col * (w + gap)), y = offsetY + (linha * (h + gap));
            if (y + h > (painel.altura || 220) - 20) break; 
            if (!colisao(x, y)) { slot = { x, y }; linha = 999; break; }
        }
        if (linha === 999) break;
    }

    painel.blocos.push({
        id: 'b_' + Date.now().toString(), tipo: 'textual', modelo: 'padrao',
        texto: '', x: slot.x, y: slot.y, largura: w, altura: h
    });
}

export function encontrarPrimeiroSlotLivre(paineis, largura, altura) {
    const folha = document.querySelector('#pagina-ficha-nova .folha');
    const folhaLarg = (folha ? folha.clientWidth : 1200) - (PAD_X * 2);
    const folhaAlt = (folha ? folha.clientHeight : 1100) - (PAD_Y * 2);
    const gap = 16, colunas = Math.max(1, Math.floor((folhaLarg + gap) / (largura + gap))), alturaSlot = altura + gap;
    const colisao = (x, y) => paineis.some(p => !(x + largura + gap <= p.x || x >= p.x + p.largura + gap || y + altura + gap <= p.y || y >= p.y + p.altura + gap));

    for (let linha = 0; ; linha++) {
        for (let col = 0; col < colunas; col++) {
            const x = PAD_X + (col * (largura + gap)), y = PAD_Y + (linha * alturaSlot);
            if (y + altura > folhaAlt + PAD_Y) break;
            if (!colisao(x, y)) return { x, y };
        }
        if (linha * alturaSlot > folhaAlt + alturaSlot * 2) break;
    }
    return { x: PAD_X, y: PAD_Y };
}

/* Lógica de Arrasto e Resize do Painel */
function iniciarArrastoPainel(e, painel) {
    e.preventDefault();
    const el = document.querySelector(`.painel[data-painel-id="${painel.id}"]`);
    if (!el) return;
    const folha = document.querySelector('#pagina-ficha-nova .folha');
    const zoomAtual = parseFloat(folha.style.zoom || '1') || 1;
    const startX = e.clientX, startY = e.clientY, origX = painel.x, origY = painel.y;

    const onMove = (ev) => {
        let novoX = origX + (ev.clientX - startX) / zoomAtual;
        let novoY = origY + (ev.clientY - startY) / zoomAtual;
        const maxX = folha.clientWidth - painel.largura - PAD_X;
        const maxY = folha.clientHeight - painel.altura - PAD_Y;
        if (novoX < PAD_X) novoX = PAD_X; if (novoY < PAD_Y) novoY = PAD_Y;
        if (novoX > maxX) novoX = maxX; if (novoY > maxY) novoY = maxY;

        if (estado.modoLayout === 'grid') {
            novoX = Math.round(novoX / GRID) * GRID; novoY = Math.round(novoY / GRID) * GRID;
            const outro = estado.paginas.find(p => p.id === estado.paginaAtivaId).paineis.find(p => p.id !== painel.id && !(novoX + painel.largura <= p.x || novoX >= p.x + p.largura || novoY + painel.altura <= p.y || novoY >= p.y + p.altura));
            if (outro) {
                outro.x = origX; outro.y = origY;
                const elOutro = document.querySelector(`.painel[data-painel-id="${outro.id}"]`);
                if (elOutro) { elOutro.style.left = outro.x + 'px'; elOutro.style.top = outro.y + 'px'; }
            }
        }
        painel.x = novoX; painel.y = novoY;
        el.style.left = novoX + 'px'; el.style.top = novoY + 'px';
    };
    const onUp = () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
}

function iniciarResizePainel(e, painel, lado) {
    e.preventDefault(); e.stopPropagation();
    const el = document.querySelector(`.painel[data-painel-id="${painel.id}"]`);
    if (!el) return;
    const startX = e.clientX, startY = e.clientY;
    const orig = { x: painel.x, y: painel.y, largura: painel.largura, altura: painel.altura };
    const folha = document.querySelector('#pagina-ficha-nova .folha');
    const zoomAtual = parseFloat(folha.style.zoom || '1') || 1;

    const onMove = (ev) => {
        const dx = (ev.clientX - startX) / zoomAtual, dy = (ev.clientY - startY) / zoomAtual;
        let { x, y, largura, altura } = orig;
        if (lado === 'dir') largura = orig.largura + dx;
        if (lado === 'esq') { largura = orig.largura - dx; x = orig.x + dx; }
        if (lado === 'base') altura = orig.altura + dy;
        if (lado === 'topo') { altura = orig.altura - dy; y = orig.y + dy; }

        if (largura < PAINEL_LARG_MIN) { if (lado === 'esq') x = orig.x + (orig.largura - PAINEL_LARG_MIN); largura = PAINEL_LARG_MIN; }
        if (altura < PAINEL_ALT_MIN) { if (lado === 'topo') y = orig.y + (orig.altura - PAINEL_ALT_MIN); altura = PAINEL_ALT_MIN; }
        if (x < PAD_X) { largura += x - PAD_X; x = PAD_X; }
        if (y < PAD_Y) { altura += y - PAD_Y; y = PAD_Y; }
        if (x + largura > folha.clientWidth - PAD_X) largura = folha.clientWidth - PAD_X - x;
        if (y + altura > folha.clientHeight - PAD_Y) altura = folha.clientHeight - PAD_Y - y;

        painel.x = x; painel.y = y; painel.largura = largura; painel.altura = altura;
        el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.width = largura + 'px'; el.style.height = altura + 'px';
    };
    const onUp = () => { document.removeEventListener('pointermove', onMove); document.removeEventListener('pointerup', onUp); };
    document.addEventListener('pointermove', onMove); document.addEventListener('pointerup', onUp);
}