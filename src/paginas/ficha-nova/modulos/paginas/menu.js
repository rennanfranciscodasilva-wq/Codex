/* ============================================================
   MÓDULO: MENU LATERAL (Ficha Nova)
   ============================================================ */

import { 
    estado, 
    salvarEstado, 
    gerarId, 
    getPaginaAtiva, 
    estaEmModoEdicao,
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

let refsMenu = null;
let abrirBottomSheetCallback = null;
let carregarConteudoCallback = null;

export function configurarMenu(elementos, abrirBottomSheet, carregarConteudo) {
    refsMenu = elementos.menu;
    abrirBottomSheetCallback = abrirBottomSheet;
    carregarConteudoCallback = carregarConteudo;
    
    elementos.btnAdd.addEventListener('click', adicionarPagina);
}

export function renderizarMenu() {
    if (!refsMenu) return;
    
    refsMenu.innerHTML = '';
    estado.paginas.forEach((pag, index) => {
        const isAtiva = pag.id === estado.paginaAtivaId;
        const btn = document.createElement('button');
        btn.className = `folha-pagina-btn ${isAtiva ? 'ativa' : ''}`;
        btn.dataset.pageId = pag.id;
        btn.innerHTML = pag.icone ? `<i class="fas ${pag.icone}"></i>` : index + 1;
        
        btn.addEventListener('click', () => trocarPagina(pag.id));
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (estaEmModoEdicao() && abrirBottomSheetCallback) {
                abrirBottomSheetCallback(pag.id);
            }
        });
        refsMenu.appendChild(btn);
    });
    
    const btnAdd = refsMenu.querySelector('#folha-pagina-add') || document.querySelector('#folha-pagina-add');
    if (btnAdd) {
        refsMenu.appendChild(btnAdd);
        btnAdd.style.display = estado.paginas.length >= MAX_PAGINAS ? 'none' : 'flex';
    }
}

export function adicionarPagina() {
    if (!estaEmModoEdicao()) return;
    if (estado.paginas.length >= MAX_PAGINAS) return alert(`Limite de ${MAX_PAGINAS} páginas.`);

    const novaPagina = {
        id: gerarId('pag_'),
        nome: gerarNomeUnico(`Página ${estado.paginas.length + 1}`, estado.paginas),
        icone: ICONES_DISPONIVEIS[Math.floor(Math.random() * ICONES_DISPONIVEIS.length)],
        descricao: '',
        paineis: []
    };
    estado.paginas.push(novaPagina);
    salvarEstado();
    trocarPagina(novaPagina.id);
}

export function trocarPagina(id) {
    if (estado.paginaAtivaId === id) return;
    
    const folha = document.querySelector('#pagina-ficha-nova .folha');
    
    if (!estado.animacaoAtiva) {
        estado.paginaAtivaId = id;
        salvarEstado();
        renderizarMenu();
        if (carregarConteudoCallback) carregarConteudoCallback();
        return;
    }
    
    if (folha) folha.classList.add('virando-pagina');
    setTimeout(() => {
        estado.paginaAtivaId = id;
        salvarEstado();
        renderizarMenu();
        if (carregarConteudoCallback) carregarConteudoCallback();
        if (folha) folha.classList.remove('virando-pagina');
    }, 600);
}

export function excluirPagina(id) {
    if (estado.paginas.length <= 1) return alert("Mínimo de 1 página.");
    const index = estado.paginas.findIndex(p => p.id === id);
    estado.paginas.splice(index, 1);
    if (estado.paginaAtivaId === id) {
        estado.paginaAtivaId = estado.paginas[0].id;
        if (carregarConteudoCallback) carregarConteudoCallback();
    }
    salvarEstado();
    renderizarMenu();
}

export function duplicarPaginaAtual() {
    if (!estaEmModoEdicao()) return;
    if (estado.paginas.length >= MAX_PAGINAS) return alert(`Limite de ${MAX_PAGINAS} páginas.`);
    
    const pagAtual = getPaginaAtiva();
    if (!pagAtual) return;

    const novaPag = JSON.parse(JSON.stringify(pagAtual));
    novaPag.id = gerarId('pag_');
    novaPag.nome = gerarNomeUnico(pagAtual.nome, estado.paginas);
    
    novaPag.paineis.forEach(p => {
        p.id = gerarId('p_');
        p.titulo = gerarNomeUnico(p.titulo, pagAtual.paineis);
        p.blocos.forEach(b => { b.id = gerarId('b_'); });
    });
    
    estado.paginas.push(novaPag);
    salvarEstado();
    trocarPagina(novaPag.id);
}