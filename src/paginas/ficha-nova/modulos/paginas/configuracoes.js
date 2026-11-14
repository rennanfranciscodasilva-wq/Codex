/* ============================================================
   MÓDULO: CONFIGURAÇÕES DA PÁGINA (Ficha Nova)
   ============================================================ */

import { 
    estado, 
    salvarEstado, 
    gerarId,
    getPaginaAtiva,
    gerarNomeUnico,
    MAX_PAGINAS
} from './estado.js';

const ICONES_DISPONIVEIS = [
    'fa-book', 'fa-scroll', 'fa-fire', 'fa-hat-wizard',
    'fa-dragon', 'fa-shield-alt', 'fa-gem', 'fa-feather-alt',
    'fa-skull', 'fa-tree', 'fa-dice-d20', 'fa-wand-magic-sparkles',
    'fa-flask', 'fa-eye', 'fa-hand-fist', 'fa-heart',
    'fa-compass', 'fa-map', 'fa-crown', 'fa-key',
    'fa-khanda', 'fa-moon'
];

let paginaSendoEditadaId = null;
let carregarConteudoCallback = null;
let copiarPaginaCallback = null;
let duplicarPaginaCallback = null;
let excluirPaginaCallback = null;
let renderizarMenuCallback = null;

export function configurarBottomSheetPagina(callbacks) {
    // callbacks: { carregarConteudo, copiarPagina, duplicarPagina, excluirPagina, renderizarMenu }
    carregarConteudoCallback = callbacks.carregarConteudo;
    copiarPaginaCallback = callbacks.copiarPagina;
    duplicarPaginaCallback = callbacks.duplicarPagina;
    excluirPaginaCallback = callbacks.excluirPagina;
    renderizarMenuCallback = callbacks.renderizarMenu;
    
    const sheet = document.querySelector('#page-settings-sheet');
    const dragHandle = document.querySelector('#sheet-header-drag');
    const btnClose = document.querySelector('#sheet-close-btn');
    const inputNome = document.querySelector('#sheet-page-name');
    const inputDesc = document.querySelector('#sheet-page-desc');
    const gridIcones = document.querySelector('#sheet-icons-grid');
    const btnExcluir = document.querySelector('#btn-excluir-pagina');
    const btnCopiarPag = document.querySelector('#btn-copiar-pagina');
    const btnDuplicarPag = document.querySelector('#btn-duplicar-pagina');
    
    if (!sheet) return;

    gridIcones.innerHTML = '';

    // Drag handle
    let isDragging = false, startX = 0, startY = 0, initialX = 0, initialY = 0;
    const onPointerDown = (e) => {
        if (e.target.closest('input, button, textarea, select')) return;
        isDragging = true; startX = e.clientX; startY = e.clientY;
        const rect = sheet.getBoundingClientRect(); initialX = rect.left; initialY = rect.top;
        sheet.style.transition = 'none'; sheet.setPointerCapture(e.pointerId);
    };
    const onPointerMove = (e) => {
        if (!isDragging) return;
        sheet.style.left = `${initialX + (e.clientX - startX)}px`; 
        sheet.style.top = `${initialY + (e.clientY - startY)}px`;
        sheet.style.bottom = 'auto'; sheet.style.right = 'auto';
    };
    const onPointerUp = (e) => {
        if (!isDragging) return;
        isDragging = false; 
        sheet.style.transition = 'transform 0.3s, opacity 0.3s'; 
        sheet.releasePointerCapture(e.pointerId);
    };
    if (dragHandle) {
        dragHandle.addEventListener('pointerdown', onPointerDown);
        sheet.addEventListener('pointermove', onPointerMove); 
        sheet.addEventListener('pointerup', onPointerUp);
    }

    // Ícones
    ICONES_DISPONIVEIS.forEach(icone => {
        const btnIcone = document.createElement('button');
        btnIcone.className = 'sheet-icon-btn';
        btnIcone.innerHTML = `<i class="fas ${icone}"></i>`;
        btnIcone.addEventListener('click', () => {
            const pag = estado.paginas.find(p => p.id === paginaSendoEditadaId);
            if (pag) { 
                pag.icone = icone; 
                salvarEstado(); 
                if (renderizarMenuCallback) renderizarMenuCallback();
            }
        });
        gridIcones.appendChild(btnIcone);
    });

    inputNome.addEventListener('input', (e) => {
        const pag = estado.paginas.find(p => p.id === paginaSendoEditadaId);
        if (pag) { 
            pag.nome = e.target.value; 
            const inputTitulo = document.querySelector('#folha-titulo-pagina');
            if (inputTitulo) inputTitulo.value = pag.nome;
            salvarEstado(); 
        }
    });

    inputDesc.addEventListener('input', (e) => {
        const pag = estado.paginas.find(p => p.id === paginaSendoEditadaId);
        if (pag) { 
            pag.descricao = e.target.value; 
            if (carregarConteudoCallback) carregarConteudoCallback();
            salvarEstado(); 
        }
    });

    if (btnCopiarPag) {
        btnCopiarPag.addEventListener('click', () => {
            if (paginaSendoEditadaId && copiarPaginaCallback) {
                copiarPaginaCallback(paginaSendoEditadaId);
                fecharBottomSheetPagina();
            }
        });
    }

    if (btnDuplicarPag) {
        btnDuplicarPag.addEventListener('click', () => {
            if (duplicarPaginaCallback) duplicarPaginaCallback();
            fecharBottomSheetPagina();
        });
    }

    if (btnExcluir) {
        btnExcluir.addEventListener('click', () => { 
            if (paginaSendoEditadaId && excluirPaginaCallback) {
                excluirPaginaCallback(paginaSendoEditadaId);
                fecharBottomSheetPagina();
            }
        });
    }
    
    if (btnClose) btnClose.addEventListener('click', fecharBottomSheetPagina);
}

export function abrirBottomSheetPagina(id) {
    const pag = estado.paginas.find(p => p.id === id);
    if (!pag) return;
    paginaSendoEditadaId = id;
    
    const inputNome = document.querySelector('#sheet-page-name');
    const inputDesc = document.querySelector('#sheet-page-desc');
    if (inputNome) inputNome.value = pag.nome;
    if (inputDesc) inputDesc.value = pag.descricao || '';
    
    const sheet = document.querySelector('#page-settings-sheet');
    if (sheet) sheet.classList.add('active');
}

export function fecharBottomSheetPagina() {
    document.querySelector('#page-settings-sheet')?.classList.remove('active');
    paginaSendoEditadaId = null;
}