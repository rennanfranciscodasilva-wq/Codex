/* ============================================================
   MÓDULO: PÁGINAS (Barrel File - Maestro)
   ============================================================ */

export * from './estado.js';

import { 
    estado, salvarEstado, gerarId, getPaginaAtiva, estaEmModoEdicao, gerarNomeUnico
} from './estado.js';
import { 
    configurarMenu, renderizarMenu, trocarPagina, adicionarPagina, duplicarPaginaAtual, excluirPagina
} from './menu.js';
import { 
    configurarBottomSheetPagina, abrirBottomSheetPagina
} from './configuracoes.js';
import { configurarCopiarColar, copiarPagina } from './copiar-colar.js';
import { configurarJSON } from './json.js';

import { renderizarPainel, configurarSheetCampo, encontrarPrimeiroSlotLivre, adicionarBlocoNoPainel } from '../paineis.js';
import { renderizarBloco, configurarSheetBloco } from '../blocos/index.js';

export { renderizarMenu, trocarPagina, adicionarPagina, duplicarPaginaAtual, excluirPagina };

let refs = null;

// --- VARIÁVEL DE ESTADO DE SELEÇÃO ---
export let elementoSelecionado = null; // { tipo: 'campo' | 'bloco', painelId, blocoId? }

export function setElementoSelecionado(tipo, painelId, blocoId = null) {
    elementoSelecionado = tipo ? { tipo, painelId, blocoId } : null;
    
    // Atualiza as bordas visuais na tela
    document.querySelectorAll('.painel.selecionado').forEach(el => el.classList.remove('selecionado'));
    document.querySelectorAll('.bloco.selecionado').forEach(el => el.classList.remove('selecionado'));

    if (elementoSelecionado) {
        if (tipo === 'campo') {
            const elPainel = document.querySelector(`.painel[data-painel-id="${painelId}"]`);
            if (elPainel) elPainel.classList.add('selecionado');
        } else if (tipo === 'bloco') {
            const elBloco = document.querySelector(`.painel[data-painel-id="${painelId}"] .bloco[data-bloco-id="${blocoId}"]`);
            if (elBloco) elBloco.classList.add('selecionado');
        }
    }
}

export function iniciarPaginas(elementos) {
    refs = elementos;

    const cache = localStorage.getItem('codex_ficha_dados');
    if (cache) {
        try {
            const dados = JSON.parse(cache);
            estado.paginas = dados.paginas || [];
            estado.paginaAtivaId = dados.paginaAtivaId || null;
            if (dados.animacaoAtiva !== undefined) estado.animacaoAtiva = dados.animacaoAtiva;
            if (dados.modoLayout !== undefined) estado.modoLayout = dados.modoLayout;
        } catch (e) {}
    }

    if (estado.paginas.length === 0) {
        estado.paginas.push({ id: gerarId('pag_'), nome: 'Página 1', icone: 'fa-book', descricao: '', paineis: [] });
        estado.paginaAtivaId = estado.paginas[0].id;
    }

    configurarMenu(elementos, abrirBottomSheetPagina, carregarConteudoPaginaAtiva);
    configurarBottomSheetPagina({
        carregarConteudo: carregarConteudoPaginaAtiva,
        copiarPagina: copiarPagina,
        duplicarPagina: duplicarPaginaAtual,
        excluirPagina: excluirPagina,
        renderizarMenu: renderizarMenu
    });
    configurarCopiarColar({
        renderizarPaineis: renderizarPaineis,
        trocarPagina: trocarPagina,
        encontrarPrimeiroSlotLivre: encontrarPrimeiroSlotLivre
    });
    configurarJSON(carregarConteudoPaginaAtiva, renderizarMenu);

    configurarSheetCampo(() => renderizarPaineis());
    configurarSheetBloco(() => renderizarPaineis());

    if (refs.inputTitulo) {
        refs.inputTitulo.addEventListener('input', (e) => {
            const pag = getPaginaAtiva();
            if (pag) { pag.nome = e.target.value; salvarEstado(); renderizarMenu(); }
        });
    }

    configurarBotaoAnimacao();
    configurarBotaoLayout();
    configurarBotoesAcao(); 
    configurarBotaoAdicionarBloco();
    configurarTooltipsDireita();
    configurarBotaoLimpar();

    // Clique na folha vazia limpa a seleção
    if (refs.conteudo) {
        refs.conteudo.addEventListener('pointerdown', (e) => {
            if (e.target === refs.conteudo || e.target.classList.contains('folha-conteudo')) {
                setElementoSelecionado(null);
            }
        });
    }

    renderizarMenu();
    carregarConteudoPaginaAtiva();
}

export function atualizarModoEdicao() {
    renderizarMenu();
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

    const sel = elementoSelecionado;

    pag.paineis.forEach(p => {
        conteudo.appendChild(renderizarPainel(p, renderizarPaineis, renderizarBloco));
    });

    if (sel) setElementoSelecionado(sel.tipo, sel.painelId, sel.blocoId);
}

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
    setElementoSelecionado(null);
    renderizarPaineis();
}

function configurarBotoesAcao() {
    const btnConfig = document.querySelector('#btn-acao-config');
    const btnCopiar = document.querySelector('#btn-acao-copiar');
    const btnExcluir = document.querySelector('#btn-acao-excluir');

    if (btnConfig) {
        btnConfig.addEventListener('click', () => {
            if (!elementoSelecionado) return alert("Selecione um campo ou bloco primeiro.");
            const { tipo, painelId, blocoId } = elementoSelecionado;
            
            if (tipo === 'campo') {
                window.abrirBottomSheetCampo(painelId);
            } else if (tipo === 'bloco') {
                window.abrirBottomSheetBloco(painelId, blocoId);
            }
        });
    }

    if (btnCopiar) {
        btnCopiar.addEventListener('click', () => {
            if (!elementoSelecionado) return alert("Selecione um campo ou bloco primeiro.");
            const { tipo, painelId, blocoId } = elementoSelecionado;
            const pag = getPaginaAtiva();

            if (tipo === 'campo') {
                const p = pag.paineis.find(p => p.id === painelId);
                if (p) {
                    import('./index.js').then(mod => {
                        mod.areaTransferenciaCodex.tipo = 'campo';
                        mod.areaTransferenciaCodex.dados = JSON.parse(JSON.stringify(p));
                        alert("Campo copiado! Clique na folha vazia e aperte Ctrl+V.");
                    });
                }
            } else if (tipo === 'bloco') {
                const p = pag.paineis.find(p => p.id === painelId);
                const b = p ? p.blocos.find(b => b.id === blocoId) : null;
                if (b) {
                    import('./index.js').then(mod => {
                        mod.areaTransferenciaCodex.tipo = 'bloco';
                        mod.areaTransferenciaCodex.dados = JSON.parse(JSON.stringify(b));
                        alert("Bloco copiado! Selecione outro campo e aperte Ctrl+V.");
                    });
                }
            }
        });
    }

    if (btnExcluir) {
        btnExcluir.addEventListener('click', () => {
            if (!elementoSelecionado) return alert("Selecione um campo ou bloco primeiro.");
            const { tipo, painelId, blocoId } = elementoSelecionado;
            const pag = getPaginaAtiva();

            if (tipo === 'campo') {
                const p = pag.paineis.find(p => p.id === painelId);
                if (p && confirm(`Excluir o campo "${p.titulo}"?`)) {
                    pag.paineis = pag.paineis.filter(p => p.id !== painelId);
                    setElementoSelecionado(null);
                    salvarEstado();
                    renderizarPaineis();
                }
            } else if (tipo === 'bloco') {
                const p = pag.paineis.find(p => p.id === painelId);
                const b = p ? p.blocos.find(b => b.id === blocoId) : null;
                if (b && confirm(`Excluir o bloco "${b.tituloBloco || 'Sem título'}"?`)) {
                    p.blocos = p.blocos.filter(b => b.id !== blocoId);
                    setElementoSelecionado(null);
                    salvarEstado();
                    renderizarPaineis();
                }
            }
        });
    }
}

function configurarBotaoAdicionarBloco() {
    const btnAddBloco = document.querySelector('#btn-add-bloco');
    if (!btnAddBloco) return;

    const novoBtn = btnAddBloco.cloneNode(true);
    btnAddBloco.parentNode.replaceChild(novoBtn, btnAddBloco);

    novoBtn.addEventListener('click', () => {
        if (!estaEmModoEdicao()) return;
        if (!elementoSelecionado || elementoSelecionado.tipo !== 'campo') {
            return alert("Selecione um CAMPO primeiro para adicionar um bloco dentro dele.");
        }

        const pag = getPaginaAtiva();
        if (!pag) return;
        const painel = pag.paineis.find(p => p.id === elementoSelecionado.painelId);
        if (!painel) return;

        adicionarBlocoNoPainel(painel);
        salvarEstado();
        renderizarPaineis();
    });
}

function configurarBotaoAnimacao() {
    const btn = document.querySelector('#btn-toggle-animacao');
    if (!btn) return;
    if (estado.animacaoAtiva) btn.classList.add('ativo');
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    novoBtn.addEventListener('click', () => {
        estado.animacaoAtiva = !estado.animacaoAtiva;
        novoBtn.classList.toggle('ativo');
        salvarEstado();
    });
}

function configurarBotaoLayout() {
    const btn = document.querySelector('#btn-modo-layout');
    if (!btn) return;
    if (estado.modoLayout === 'grid') btn.classList.add('ativo');
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    novoBtn.addEventListener('click', () => {
        estado.modoLayout = estado.modoLayout === 'livre' ? 'grid' : 'livre';
        novoBtn.classList.toggle('ativo', estado.modoLayout === 'grid');
        const folha = document.querySelector('#pagina-ficha-nova .folha');
        if (folha) folha.classList.toggle('layout-grid', estado.modoLayout === 'grid');
        salvarEstado();
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

function configurarBotaoLimpar() {
    const btnLimpar = document.querySelector('#btn-limpar-ficha');
    if (!btnLimpar) return;
    const novoBtn = btnLimpar.cloneNode(true);
    btnLimpar.parentNode.replaceChild(novoBtn, btnLimpar);
    novoBtn.addEventListener('click', () => {
        if (!estaEmModoEdicao()) return;
        if (confirm("Tem certeza que deseja apagar TUDO nesta ficha?")) {
            estado.paginas.forEach(pag => { pag.paineis = []; });
            setElementoSelecionado(null);
            salvarEstado();
            renderizarPaineis();
        }
    });
}

export function acionarAdicionarCampo() {
    if (!estaEmModoEdicao()) return;
    const pag = getPaginaAtiva();
    if (!pag) return;
    const novo = {
        id: gerarId('p_'),
        titulo: gerarNomeUnico('Novo Campo', pag.paineis),
        x: 40, y: 30,
        largura: 320, altura: 220,
        blocos: []
    };
    const slot = encontrarPrimeiroSlotLivre(pag.paineis, novo.largura, novo.altura);
    novo.x = slot.x; novo.y = slot.y;
    pag.paineis.push(novo);
    salvarEstado(); 
    renderizarPaineis();
}