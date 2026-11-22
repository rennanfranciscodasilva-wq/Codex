/* ============================================================
   MÓDULO: MENU LATERAL (Ficha Nova)
   ============================================================ */

import { mostrarAviso, confirmarAcao } from '../../../../componentes/dialogos/dialogos.js';
import { 
    estado, 
    salvarEstado, 
    gerarId, 
    getPaginaAtiva, 
    estaEmModoEdicao,
    gerarNomeUnico,
    MAX_PAGINAS
} from './estado.js';

let refsMenu = null;
let refsBtnAdd = null; 
let carregarConteudoCallback = null;

export function configurarMenu(elementos, abrirBottomSheet, carregarConteudo) {
    refsMenu = elementos.menu;
    carregarConteudoCallback = carregarConteudo;
    
    if (elementos.btnAdd) {
        refsBtnAdd = elementos.btnAdd;
        const novoBtn = refsBtnAdd.cloneNode(true);
        refsBtnAdd.parentNode.replaceChild(novoBtn, refsBtnAdd);
        refsBtnAdd = novoBtn;
        refsBtnAdd.addEventListener('click', adicionarPagina);
    }
}

export function renderizarMenu() {
    if (!refsMenu) return;
    
    refsMenu.innerHTML = '';
    estado.paginas.forEach((pag, index) => {
        const isAtiva = pag.id === estado.paginaAtivaId;
        const btn = document.createElement('button');
        btn.className = `folha-pagina-btn ${isAtiva ? 'ativa' : ''}`;
        btn.dataset.pageId = pag.id;
        const nome = pag.nome?.trim() || `Página ${index + 1}`;
        btn.title = nome;
        btn.setAttribute('aria-label', nome);
        
        // MOSTRA APENAS O NÚMERO
        btn.innerHTML = `<span style="font-weight: bold; font-size: 1.1rem;">${index + 1}</span>`;
        
        btn.addEventListener('click', () => trocarPagina(pag.id));

        // ADICIONA O "X" APENAS SE FOR A PÁGINA ATIVA
        if (isAtiva && estado.paginas.length > 1) {
            const btnX = document.createElement('div');
            btnX.className = 'btn-excluir-pagina-orbita';
            btnX.innerHTML = '<i class="fas fa-times"></i>';
            btnX.title = 'Excluir esta página';

            btnX.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();

                if (estado.paginas.length <= 1) {
                    mostrarAviso("Você precisa ter pelo menos uma página no sistema.");
                    return;
                }

                let mensagem = "Tem certeza que deseja excluir esta página?";
                
                if (pag.paineis && pag.paineis.length > 0) {
                    const nomesCampos = pag.paineis
                        .map(p => p.titulo || '(sem título)')
                        .filter(Boolean)
                        .join(", ");
                    if (nomesCampos) {
                        mensagem = `Tem certeza que deseja excluir esta página? Ela contém: ${nomesCampos}`;
                    }
                }

                if ((await confirmarAcao(mensagem))) {
                    const index = estado.paginas.findIndex(p => p.id === pag.id);
                    if (index === -1) return;
                    estado.paginas.splice(index, 1);

                    if (estado.paginaAtivaId === pag.id) {
                        estado.paginaAtivaId = estado.paginas[0].id;
                        if (carregarConteudoCallback) carregarConteudoCallback();
                    }
                    salvarEstado();
                    renderizarMenu();
                }
            });

            btn.appendChild(btnX);
        }

        refsMenu.appendChild(btn);
    });
    
    if (refsBtnAdd) {
        refsMenu.appendChild(refsBtnAdd);
        refsBtnAdd.style.display = estado.paginas.length >= MAX_PAGINAS ? 'none' : 'flex';
    }
}

export function adicionarPagina() {
    if (!estaEmModoEdicao()) return;
    if (estado.paginas.length >= MAX_PAGINAS) return mostrarAviso(`Limite de ${MAX_PAGINAS} páginas.`);

    const novaPagina = {
        id: gerarId('pag_'),
        nome: `Página ${estado.paginas.length + 1}`,
        icone: null,
        descricao: '',
        paineis: []
    };
    estado.paginas.push(novaPagina);
    salvarEstado();
    trocarPagina(novaPagina.id);
}

export function trocarPagina(id) {
    // Se estiver no Wizard, não faz nada (o passo2-paginas.js cuida disso)
    const paginaFichaNova = document.querySelector('#pagina-ficha-nova');
    const isWizard = paginaFichaNova?.classList.contains('wizard-ativo');
    if (isWizard) return; 

    if (estado.paginaAtivaId === id) return;
    
    const folha = document.querySelector('#pagina-ficha-nova .folha');
    
    if (!estado.animacaoAtiva || !folha) {
        estado.paginaAtivaId = id;
        salvarEstado();
        renderizarMenu();
        if (carregarConteudoCallback) carregarConteudoCallback();
        return;
    }
    
    folha.classList.remove('virando-pagina');
    void folha.offsetWidth; 
    
    folha.classList.add('virando-pagina');
    
    setTimeout(() => {
        estado.paginaAtivaId = id;
        salvarEstado();
        renderizarMenu();
        if (carregarConteudoCallback) carregarConteudoCallback();
        folha.classList.remove('virando-pagina');
    }, 400);
}

export function excluirPagina(id) {
    if (estado.paginas.length <= 1) return mostrarAviso("Mínimo de 1 página.");
    const index = estado.paginas.findIndex(p => p.id === id);
    if (index === -1) return;
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
    if (estado.paginas.length >= MAX_PAGINAS) return mostrarAviso(`Limite de ${MAX_PAGINAS} páginas.`);
    
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
