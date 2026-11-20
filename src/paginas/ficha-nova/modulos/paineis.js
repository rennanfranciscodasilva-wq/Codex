/* ============================================================
   MÓDULO: PAINÉIS (Renderizar, Interagir e Configurar)
   ============================================================ */

import { 
    estado, salvarEstado, GRID, getPaginaAtiva, estaEmModoEdicao, setElementoSelecionado, gerarId, gerarNomeUnico 
} from './paginas/index.js';
import { renderizarBloco, configurarSheetBloco } from './blocos/index.js';

/* ============================================================
   1. RENDERIZAR PAINEL
   ============================================================ */
export function renderizarPainel(painel, renderizarPaineisCallback, renderizarBlocoCallback) {
    const el = document.createElement('div');
    el.className = 'painel';
    el.dataset.painelId = painel.id;
    el.style.left = painel.x + 'px';
    el.style.top = painel.y + 'px';
    el.style.width = painel.largura + 'px';
    el.style.height = painel.altura + 'px';

    // --- CABEÇALHO COM ALÇA DE ARRASTO ---
    const header = document.createElement('div');
    header.className = 'painel-header';

    const alcaArrasto = document.createElement('div');
    alcaArrasto.className = 'painel-alca-arrasto';
    alcaArrasto.innerHTML = '<i class="fas fa-grip-vertical"></i>';
    alcaArrasto.title = 'Arraste para mover o campo';

    alcaArrasto.addEventListener('pointerdown', (e) => {
        if (!estaEmModoEdicao()) return;
        e.preventDefault();
        e.stopPropagation();
        setElementoSelecionado('campo', painel.id);
        iniciarArrastoPainel(e, painel);
    });

    const inputTitulo = document.createElement('input');
    inputTitulo.type = 'text';
    inputTitulo.className = 'painel-titulo';
    inputTitulo.value = painel.titulo;
    inputTitulo.readOnly = estaEmModoEdicao(); 
    inputTitulo.addEventListener('input', (e) => {
        painel.titulo = e.target.value;
        salvarEstado();
    });

    header.appendChild(alcaArrasto);
    header.appendChild(inputTitulo);
    el.appendChild(header);

    // --- CONTEÚDO ---
    const conteudo = document.createElement('div');
    conteudo.className = 'painel-conteudo';
    el.appendChild(conteudo);

    // Renderiza os blocos
    if (painel.blocos) {
        painel.blocos.forEach(bloco => {
            conteudo.appendChild(renderizarBlocoCallback(bloco, painel.id, renderizarPaineisCallback));
        });
    }

    // --- SELECIONAR AO CLICAR (NO MODO EDIÇÃO) ---
    el.addEventListener('pointerdown', (e) => {
        if (!estaEmModoEdicao()) return;
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.target.closest('.bloco')) return; 
        if (e.target.closest('.painel-alca-arrasto')) return; 

        e.stopPropagation();
        setElementoSelecionado('campo', painel.id);
    });

    // --- BORDAS DE RESIZE ---
    ['topo', 'base', 'esq', 'dir'].forEach(lado => {
        const borda = document.createElement('div');
        borda.className = `painel-borda painel-borda-${lado}`;
        borda.addEventListener('pointerdown', (e) => {
            if (!estaEmModoEdicao()) return;
            e.stopPropagation();
            setElementoSelecionado('campo', painel.id);
            iniciarResizePainel(e, painel, lado);
        });
        el.appendChild(borda);
    });

    return el;
}

/* ============================================================
   2. ARRASTO E RESIZE
   ============================================================ */
export function iniciarArrastoPainel(e, painel) {
    e.preventDefault();
    
    const elPainel = document.querySelector(`.painel[data-painel-id="${painel.id}"]`);
    const elArea = document.querySelector(`#pagina-ficha-nova .folha-conteudo`);
    if (!elPainel || !elArea) return;

    document.body.style.cursor = 'grabbing';
    elPainel.style.cursor = 'grabbing';
    elPainel.style.touchAction = 'none';

    const folha = document.querySelector('#pagina-ficha-nova .folha');
    if (!folha) return;
    const zoomAtual = parseFloat(folha.style.zoom || '1') || 1;
    const startX = e.clientX, startY = e.clientY, origX = painel.x, origY = painel.y;

    const onMove = (ev) => {
        let novoX = origX + (ev.clientX - startX) / zoomAtual;
        let novoY = origY + (ev.clientY - startY) / zoomAtual;
        
        if (estado.modoLayout === 'grid') {
            novoX = Math.round(novoX / GRID) * GRID; 
            novoY = Math.round(novoY / GRID) * GRID;
        }

        const maxX = elArea.clientWidth - painel.largura - 10, maxY = elArea.clientHeight - painel.altura - 10;
        if (novoX < 10) novoX = 10; if (novoY < 10) novoY = 10;
        if (novoX > maxX) novoX = maxX; if (novoY > maxY) novoY = maxY;

        painel.x = Math.round(novoX); 
        painel.y = Math.round(novoY);
        elPainel.style.left = Math.round(novoX) + 'px'; 
        elPainel.style.top = Math.round(novoY) + 'px';
    };
    
    const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.body.style.cursor = 'default';
        elPainel.style.cursor = 'grab';
        elPainel.style.touchAction = '';
        salvarEstado();
    };
    
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
}

export function iniciarResizePainel(e, painel, lado) {
    e.preventDefault(); 
    e.stopPropagation();
    
    const elPainel = document.querySelector(`.painel[data-painel-id="${painel.id}"]`);
    const elArea = document.querySelector(`#pagina-ficha-nova .folha-conteudo`);
    if (!elPainel || !elArea) return;

    const folha = document.querySelector('#pagina-ficha-nova .folha');
    if (!folha) return;
    const zoomAtual = parseFloat(folha.style.zoom || '1') || 1;
    const startX = e.clientX, startY = e.clientY;
    const orig = { x: painel.x, y: painel.y, largura: painel.largura, altura: painel.altura };
    const minLargura = 180;
    const minAltura = 120;

    const onMove = (ev) => {
        const dx = (ev.clientX - startX) / zoomAtual, dy = (ev.clientY - startY) / zoomAtual;
        let { x, y, largura, altura } = orig;
        
        if (lado === 'dir') largura = orig.largura + dx;
        if (lado === 'esq') { largura = orig.largura - dx; x = orig.x + dx; }
        if (lado === 'base') altura = orig.altura + dy;
        if (lado === 'topo') { altura = orig.altura - dy; y = orig.y + dy; }

        if (largura < minLargura) { if (lado === 'esq') x = orig.x + (orig.largura - minLargura); largura = minLargura; }
        if (altura < minAltura) { if (lado === 'topo') y = orig.y + (orig.altura - minAltura); altura = minAltura; }

        if (x < 10) { largura += x - 10; x = 10; }
        if (y < 10) { altura += y - 10; y = 10; }
        if (x + largura > elArea.clientWidth - 10) largura = elArea.clientWidth - 10 - x;
        if (y + altura > elArea.clientHeight - 10) altura = elArea.clientHeight - 10 - y;

        painel.x = Math.round(x); painel.y = Math.round(y);
        painel.largura = Math.round(largura); painel.altura = Math.round(altura);
        
        elPainel.style.left = painel.x + 'px'; 
        elPainel.style.top = painel.y + 'px'; 
        elPainel.style.width = painel.largura + 'px'; 
        elPainel.style.height = painel.altura + 'px';
    };
    
    const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        salvarEstado();
    };
    
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
}

/* ============================================================
   3. CONFIGURAÇÕES DO CAMPO (BOTTOM SHEET) E CRIAÇÃO
   ============================================================ */
let campoRenderizarCallback = null;

export function configurarSheetCampo(renderizarCallback) {
    campoRenderizarCallback = renderizarCallback;
    const sheet = document.querySelector('#campo-settings-sheet');
    const dragHandle = document.querySelector('#campo-sheet-header-drag');
    const btnClose = document.querySelector('#campo-sheet-close-btn');
    const inputNome = document.querySelector('#campo-sheet-nome');

    if (!sheet) return;

    let isDragging = false, startX = 0, startY = 0, initialX = 0, initialY = 0;
    if (dragHandle) {
        dragHandle.addEventListener('pointerdown', (e) => {
            if (e.target.closest('input, button')) return;
            isDragging = true; startX = e.clientX; startY = e.clientY;
            const rect = sheet.getBoundingClientRect(); initialX = rect.left; initialY = rect.top;
            sheet.style.transition = 'none'; sheet.setPointerCapture(e.pointerId);
        });
        sheet.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            sheet.style.left = `${initialX + (e.clientX - startX)}px`; 
            sheet.style.top = `${initialY + (e.clientY - startY)}px`;
            sheet.style.bottom = 'auto'; sheet.style.right = 'auto';
        });
        sheet.addEventListener('pointerup', (e) => {
            if (!isDragging) return;
            isDragging = false; 
            sheet.style.transition = 'transform 0.3s, opacity 0.3s'; 
            sheet.releasePointerCapture(e.pointerId);
        });
    }

    if (btnClose) {
        btnClose.addEventListener('click', () => sheet.classList.remove('active'));
    }

    if (inputNome) {
        inputNome.addEventListener('input', (e) => {
            const sel = document.querySelector('.painel.selecionado');
            if (!sel) return;
            const pag = getPaginaAtiva();
            if (!pag) return;
            const p = pag.paineis.find(p => p.id === sel.dataset.painelId);
            if (p) {
                p.titulo = e.target.value;
                const inputTitulo = sel.querySelector('.painel-titulo');
                if (inputTitulo) inputTitulo.value = e.target.value;
                salvarEstado();
            }
        });
    }

    window.abrirBottomSheetCampo = (painelId) => {
        const pag = getPaginaAtiva();
        if (!pag) return;
        const p = pag.paineis.find(p => p.id === painelId);
        if (!p) return;

        if (inputNome) inputNome.value = p.titulo || '';
        sheet.classList.add('active');
    };
}

export function encontrarPrimeiroSlotLivre(paineis, largura, altura) {
    // Lógica simples de encontrar espaço (fallback se não houver)
    return { x: 40, y: 30 };
}

export function adicionarBlocoNoPainel(painel) {
    const novoBloco = {
        id: gerarId('b_'),
        tipo: 'textual',
        modelo: 'padrao',
        x: 20, y: 20,
        largura: 200,
        altura: 100,
        texto: ''
    };
    painel.blocos.push(novoBloco);
}