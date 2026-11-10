/* ============================================================
   MÓDULO: PÁGINAS (Maestro) - Ficha Nova
   ============================================================ */

import { 
    renderizarPainel, 
    configurarSheetCampo, 
    encontrarPrimeiroSlotLivre 
} from './paineis.js';
import { 
    renderizarBloco, 
    configurarSheetBloco 
} from './blocos.js';

export const MAX_PAGINAS = 10;
export const GRID = 20;
export const PAD_X = 40;
export const PAD_Y = 30;

const ICONES_DISPONIVEIS = [
    'fa-book', 'fa-scroll', 'fa-fire', 'fa-hat-wizard',
    'fa-dragon', 'fa-shield-alt', 'fa-gem', 'fa-feather-alt',
    'fa-skull', 'fa-tree', 'fa-dice-d20', 'fa-wand-magic-sparkles',
    'fa-flask', 'fa-eye', 'fa-hand-fist', 'fa-heart',
    'fa-compass', 'fa-map', 'fa-crown', 'fa-key',
    'fa-sword', 'fa-moon'
];

export let estado = {
    paginas: [],
    paginaAtivaId: null,
    animacaoAtiva: true,
    modoLayout: 'livre'
};

let refs = null;
let animando = false;
let paginaSendoEditadaId = null;

/* INIT */
export function iniciarPaginas(elementos) {
    refs = elementos;

    if (estado.paginas.length === 0) {
        estado.paginas.push({
            id: Date.now().toString(),
            nome: 'Página 1',
            icone: 'fa-book',
            descricao: '',
            paineis: []
        });
        estado.paginaAtivaId = estado.paginas[0].id;
    }

    refs.btnAdd.addEventListener('click', adicionarPagina);
    
    configurarBottomSheet(); // Menu da Página
    configurarBotaoAnimacao();
    configurarBotaoLayout();
    configurarTooltipsDireita();
    
    // Configura os menus dos módulos externos
    configurarSheetCampo(() => renderizarPaineis());
    configurarSheetBloco(() => renderizarPaineis());

    renderizarMenu();
    carregarConteudoPaginaAtiva();
}

export function atualizarModoEdicao() {
    renderizarMenu();
    renderizarPaineis();
}

export function estaEmModoEdicao() {
    const el = document.querySelector('#pagina-ficha-nova');
    return el && el.classList.contains('modo-edicao');
}

export function getPaginaAtiva() {
    return estado.paginas.find(p => p.id === estado.paginaAtivaId);
}

/* RENDERIZAÇÃO DA PÁGINA */
function carregarConteudoPaginaAtiva() {
    if (!refs.conteudo) return;
    const pag = getPaginaAtiva();
    if (!pag) return;

    refs.inputTitulo.value = pag.nome;

    const descEl = document.querySelector('#folha-descricao-pagina');
    if (descEl) {
        descEl.textContent = pag.descricao || '';
        descEl.style.display = pag.descricao ? 'block' : 'none';
    }
    renderizarPaineis();
}

export function renderizarPaineis() {
    const conteudo = refs.conteudo;
    if (!conteudo) return;
    const pag = getPaginaAtiva();
    if (!pag) return;

    conteudo.innerHTML = '';
    conteudo.classList.add('tem-paineis');

    if (!pag.paineis || pag.paineis.length === 0) {
        const placeholder = document.createElement('div');
        placeholder.className = 'folha-conteudo-placeholder';
        placeholder.textContent = `Conteúdo da ${pag.nome}`;
        conteudo.appendChild(placeholder);
        return;
    }

    pag.paineis.forEach(p => {
        conteudo.appendChild(renderizarPainel(p, renderizarPaineis, renderizarBloco));
    });
}

/* AÇÕES DA PÁGINA */
function adicionarPagina() {
    if (animando || !estaEmModoEdicao()) return;
    if (estado.paginas.length >= MAX_PAGINAS) return alert(`Limite de ${MAX_PAGINAS} páginas.`);

    const novaPagina = {
        id: Date.now().toString(),
        nome: `Página ${estado.paginas.length + 1}`,
        icone: ICONES_DISPONIVEIS[Math.floor(Math.random() * ICONES_DISPONIVEIS.length)],
        descricao: '',
        paineis: []
    };
    estado.paginas.push(novaPagina);
    trocarPagina(novaPagina.id);
}

function trocarPagina(id) {
    if (estado.paginaAtivaId === id || animando) return;
    if (!estado.animacaoAtiva) {
        estado.paginaAtivaId = id;
        renderizarMenu();
        carregarConteudoPaginaAtiva();
        return;
    }
    animando = true;
    const folha = document.querySelector('#pagina-ficha-nova .folha');
    folha.classList.add('virando-pagina');
    setTimeout(() => {
        estado.paginaAtivaId = id;
        renderizarMenu();
        carregarConteudoPaginaAtiva();
        folha.classList.remove('virando-pagina');
        animando = false;
    }, 600);
}

function excluirPagina(id) {
    if (estado.paginas.length <= 1) return alert("Mínimo de 1 página.");
    const index = estado.paginas.findIndex(p => p.id === id);
    estado.paginas.splice(index, 1);
    if (estado.paginaAtivaId === id) {
        estado.paginaAtivaId = estado.paginas[0].id;
        carregarConteudoPaginaAtiva();
    }
    fecharBottomSheet();
    renderizarMenu();
}

function renderizarMenu() {
    refs.menu.innerHTML = '';
    estado.paginas.forEach((pag, index) => {
        const isAtiva = pag.id === estado.paginaAtivaId;
        const btn = document.createElement('button');
        btn.className = `folha-pagina-btn ${isAtiva ? 'ativa' : ''}`;
        btn.dataset.pageId = pag.id;
        btn.innerHTML = pag.icone ? `<i class="fas ${pag.icone}"></i>` : index + 1;
        
        btn.addEventListener('click', () => trocarPagina(pag.id));
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (estaEmModoEdicao()) abrirBottomSheet(pag.id);
        });
        refs.menu.appendChild(btn);
    });
    refs.menu.appendChild(refs.btnAdd);
    refs.btnAdd.style.display = estado.paginas.length >= MAX_PAGINAS ? 'none' : 'flex';
}

function configurarBottomSheet() {
    const sheet = document.querySelector('#page-settings-sheet');
    const dragHandle = document.querySelector('#sheet-header-drag');
    const btnClose = document.querySelector('#sheet-close-btn');
    const inputNome = document.querySelector('#sheet-page-name');
    const inputDesc = document.querySelector('#sheet-page-desc');
    const gridIcones = document.querySelector('#sheet-icons-grid');
    const btnExcluir = document.querySelector('#btn-excluir-pagina');
    
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

    ICONES_DISPONIVEIS.forEach(icone => {
        const btnIcone = document.createElement('button');
        btnIcone.className = 'sheet-icon-btn';
        btnIcone.innerHTML = `<i class="fas ${icone}"></i>`;
        btnIcone.addEventListener('click', () => {
            const pag = estado.paginas.find(p => p.id === paginaSendoEditadaId);
            if (pag) { pag.icone = icone; renderizarMenu(); }
        });
        gridIcones.appendChild(btnIcone);
    });

    inputNome.addEventListener('input', (e) => {
        const pag = estado.paginas.find(p => p.id === paginaSendoEditadaId);
        if (pag) { pag.nome = e.target.value; refs.inputTitulo.value = pag.nome; }
    });

    inputDesc.addEventListener('input', (e) => {
        const pag = estado.paginas.find(p => p.id === paginaSendoEditadaId);
        if (pag) { pag.descricao = e.target.value; carregarConteudoPaginaAtiva(); }
    });

    btnExcluir.addEventListener('click', () => { if (paginaSendoEditadaId) excluirPagina(paginaSendoEditadaId); });
    btnClose.addEventListener('click', fecharBottomSheet);
}

function abrirBottomSheet(id) {
    const pag = estado.paginas.find(p => p.id === id);
    if (!pag) return;
    paginaSendoEditadaId = id;
    document.querySelector('#sheet-page-name').value = pag.nome;
    document.querySelector('#sheet-page-desc').value = pag.descricao || '';
    document.querySelector('#page-settings-sheet').classList.add('active');
}

function fecharBottomSheet() {
    document.querySelector('#page-settings-sheet')?.classList.remove('active');
    paginaSendoEditadaId = null;
}

function configurarBotaoAnimacao() {
    const btn = document.querySelector('#btn-toggle-animacao');
    if (!btn) return;
    if (estado.animacaoAtiva) btn.classList.add('ativo');
    btn.addEventListener('click', () => {
        estado.animacaoAtiva = !estado.animacaoAtiva;
        btn.classList.toggle('ativo');
    });
}

function configurarBotaoLayout() {
    const btn = document.querySelector('#btn-modo-layout');
    if (!btn) return;
    btn.addEventListener('click', () => {
        estado.modoLayout = estado.modoLayout === 'livre' ? 'grid' : 'livre';
        btn.classList.toggle('ativo');
        const folha = document.querySelector('#pagina-ficha-nova .folha');
        folha.classList.toggle('layout-grid', estado.modoLayout === 'grid');
    });
}

function configurarTooltipsDireita() {
    document.querySelectorAll('.folha-menu-lateral.direito .folha-btn-ferramenta').forEach(btn => {
        const texto = btn.getAttribute('data-tooltip');
        if (!texto || btn.querySelector('.folha-btn-tooltip')) return;
        const tooltip = document.createElement('span');
        tooltip.className = 'folha-btn-tooltip';
        tooltip.textContent = texto;
        btn.appendChild(tooltip);
    });
}

export function acionarAdicionarCampo() {
    if (!estaEmModoEdicao()) return;
    const pag = getPaginaAtiva();
    const novo = {
        id: 'p_' + Date.now().toString(),
        titulo: 'Novo Campo',
        x: PAD_X, y: PAD_Y,
        largura: 320, altura: 220,
        blocos: []
    };
    const slot = encontrarPrimeiroSlotLivre(pag.paineis, novo.largura, novo.altura);
    novo.x = slot.x; novo.y = slot.y;
    pag.paineis.push(novo);
    renderizarPaineis();
}