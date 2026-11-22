/* ============================================================
   MÓDULO: PÁGINAS (Barrel File - Maestro)
   ============================================================ */

export * from './estado.js';

import { mostrarAviso, confirmarAcao } from '../../../../componentes/dialogos/dialogos.js';
import { 
    estado, salvarEstado, gerarId, getPaginaAtiva, estaEmModoEdicao, gerarNomeUnico, iniciarHistorico, desfazerAlteracao
} from './estado.js';
import { 
    configurarMenu, renderizarMenu, trocarPagina, adicionarPagina, duplicarPaginaAtual, excluirPagina
} from './menu.js';
import { 
    configurarBottomSheetPagina, abrirBottomSheetPagina
} from './configuracoes.js';
import { atualizarBotaoColar, configurarCopiarColar, copiarPagina, copiarElemento } from './copiar-colar.js';
import { configurarJSON } from './json.js';
import { aplicarTamanhoDaFolha, configurarTamanhoDaFolha } from '../tamanho-folha.js';

import { renderizarPainel, configurarSheetCampo, encontrarPrimeiroSlotLivre, adicionarBlocoNoPainel } from '../paineis.js';
import { renderizarBloco, configurarSheetBloco } from '../blocos/index.js';

export { renderizarMenu, trocarPagina, adicionarPagina, duplicarPaginaAtual, excluirPagina };

let refs = null;
let atalhosEdicao;

export function desmontarAtalhosEdicao() {
    atalhosEdicao?.abort();
}

// --- VARIÁVEL DE ESTADO DE SELEÇÃO ---
export let elementoSelecionado = null; // { tipo: 'campo' | 'bloco', painelId, blocoId? }

export function setElementoSelecionado(tipo, painelId, blocoId = null) {
    elementoSelecionado = tipo ? { tipo, painelId, blocoId } : null;
    for (const botao of document.querySelectorAll('#pagina-ficha-nova .btn-acao-selecao')) {
        botao.disabled = !elementoSelecionado;
    }
    atualizarBotaoColar();
    
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
        botao: document.querySelector('#btn-acao-colar'),
        obterCampo: () => elementoSelecionado?.tipo === 'campo' ? elementoSelecionado.painelId : null,
        renderizar: renderizarPaineis
    });
    configurarJSON();

    configurarSheetCampo(() => renderizarPaineis());
    configurarSheetBloco(renderizarPaineis);

    if (refs.inputTitulo) {
        refs.inputTitulo.addEventListener('input', (e) => {
            const pag = getPaginaAtiva();
            if (pag) { pag.nome = e.target.value; salvarEstado(); renderizarMenu(); }
        });
    }

    configurarBotaoAnimacao();
    configurarBotaoLayout();
    configurarBotaoRedimensionamento('#btn-redimensionar-conjunto', 'redimensionarEmConjunto');
    configurarBotaoRedimensionamento('#btn-redimensionar-blocos-campo', 'redimensionarBlocosDoCampo');
    configurarBotoesAcao(); 
    configurarBotaoAdicionarBloco();
    configurarBotaoLimpar();

    if (refs.conteudo) {
        refs.conteudo.addEventListener('pointerdown', (e) => {
            if (e.target === refs.conteudo || e.target.classList.contains('folha-conteudo')) {
                setElementoSelecionado(null);
            }
        });
    }

    renderizarMenu();
    carregarConteudoPaginaAtiva();
    const tela = refs.conteudo.closest('#pagina-ficha-nova');
    configurarTamanhoDaFolha(tela, refs.conteudo);
    iniciarHistorico();
    configurarAtalhosEdicao(tela);
}

function configurarAtalhosEdicao(tela) {
    desmontarAtalhosEdicao();
    atalhosEdicao = new AbortController();
    document.addEventListener('keydown', evento => {
        if (!estaEmModoEdicao() || !tela.isConnected || tela.classList.contains('wizard-ativo') ||
            evento.defaultPrevented || evento.repeat || document.querySelector('dialog[open]') ||
            evento.target.closest?.('input:not([readonly]), textarea:not([readonly]), select, [contenteditable="true"]')) return;

        if (evento.key === 'Delete' && !evento.ctrlKey && !evento.metaKey && elementoSelecionado) {
            evento.preventDefault();
            tela.querySelector('#btn-acao-excluir')?.click();
        } else if ((evento.ctrlKey || evento.metaKey) && !evento.shiftKey && !evento.altKey && evento.key.toLowerCase() === 'z') {
            if (!desfazerAlteracao()) return;
            evento.preventDefault();
            document.querySelectorAll('.page-settings-sheet.active').forEach(sheet => sheet.classList.remove('active'));
            configurarBotaoLayout();
            configurarBotaoAnimacao();
            renderizarMenu();
            carregarConteudoPaginaAtiva();
        }
    }, { signal: atalhosEdicao.signal });
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
    aplicarTamanhoDaFolha(refs.conteudo.closest('.folha'), pag);
    refs.inputTitulo.value = pag.nome;

    const elSistemaNome = document.querySelector('#folha-sistema-nome');
    if (elSistemaNome) {
        elSistemaNome.textContent = estado.nomeSistema || '';
        elSistemaNome.style.display = estado.nomeSistema ? 'block' : 'none';
    }

    const descEl = document.querySelector('#folha-descricao-pagina');
    if (descEl) {
        descEl.textContent = pag.descricao || '';
        descEl.style.display = pag.descricao ? 'block' : 'none';
    }
    setElementoSelecionado(null);
    renderizarPaineis();
    refs.conteudo.closest('#pagina-ficha-nova')?.dispatchEvent(new Event('codex:pagina-ficha-atualizada'));
}

function configurarBotoesAcao() {
    const btnConfig = document.querySelector('#btn-acao-config');
    const btnCopiar = document.querySelector('#btn-acao-copiar');
    const btnExcluir = document.querySelector('#btn-acao-excluir');

    if (btnConfig) {
        btnConfig.addEventListener('click', () => {
            if (!elementoSelecionado) return mostrarAviso("Selecione um campo ou bloco primeiro.");
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
            if (!elementoSelecionado) return mostrarAviso("Selecione um campo ou bloco primeiro.");
            const { tipo, painelId, blocoId } = elementoSelecionado;
            const pag = getPaginaAtiva();

            if (tipo === 'campo') {
                const p = pag.paineis.find(p => p.id === painelId);
                if (p) {
                    // Chama a nova função que mostra o Toast
                    copiarElemento('campo', p);
                }
            } else if (tipo === 'bloco') {
                const p = pag.paineis.find(p => p.id === painelId);
                const b = p ? p.blocos.find(b => b.id === blocoId) : null;
                if (b) {
                    // Chama a nova função que mostra o Toast
                    copiarElemento('bloco', b);
                }
            }
        });
    }

    if (btnExcluir) {
        btnExcluir.addEventListener('click', async () => {
            if (!elementoSelecionado) return mostrarAviso("Selecione um campo ou bloco primeiro.");
            const { tipo, painelId, blocoId } = elementoSelecionado;
            const pag = getPaginaAtiva();

            if (tipo === 'campo') {
                const p = pag.paineis.find(p => p.id === painelId);
                if (p && (await confirmarAcao(`Excluir o campo "${p.titulo}"?`, { pausavel: true }))) {
                    pag.paineis = pag.paineis.filter(p => p.id !== painelId);
                    setElementoSelecionado(null);
                    salvarEstado({ elementoExcluido: { paginaId: pag.id, painelId } });
                    renderizarPaineis();
                }
            } else if (tipo === 'bloco') {
                const p = pag.paineis.find(p => p.id === painelId);
                const b = p ? p.blocos.find(b => b.id === blocoId) : null;
                if (b && (await confirmarAcao(`Excluir o bloco "${b.tituloBloco || 'Sem título'}"?`, { pausavel: true }))) {
                    p.blocos = p.blocos.filter(b => b.id !== blocoId);
                    setElementoSelecionado(null);
                    salvarEstado({ elementoExcluido: { paginaId: pag.id, painelId, blocoId } });
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
            return mostrarAviso("Selecione um CAMPO primeiro para adicionar um bloco dentro dele.", { pausavel: true });
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
    btn.classList.toggle('ativo', estado.animacaoAtiva);
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
    const novoBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(novoBtn, btn);
    const folha = novoBtn.closest('#pagina-ficha-nova')?.querySelector('.folha');

    function atualizarModoLayout() {
        const gradeAtiva = estado.modoLayout === 'grid';
        const nomeModo = gradeAtiva ? 'Modo grid' : 'Modo livre';
        novoBtn.classList.toggle('ativo', gradeAtiva);
        novoBtn.title = nomeModo;
        novoBtn.dataset.tooltip = nomeModo;
        novoBtn.setAttribute('aria-label', nomeModo);
        novoBtn.setAttribute('aria-pressed', String(gradeAtiva));
        folha?.classList.toggle('layout-grid', gradeAtiva);
    }

    atualizarModoLayout();
    novoBtn.addEventListener('click', () => {
        estado.modoLayout = estado.modoLayout === 'livre' ? 'grid' : 'livre';
        atualizarModoLayout();
        salvarEstado();
    });
}

function configurarBotaoRedimensionamento(seletor, opcao) {
    const botao = document.querySelector(seletor);
    if (!botao) return;

    function atualizar() {
        const ativo = estado[opcao];
        botao.setAttribute('aria-pressed', String(ativo));
        botao.classList.toggle('ativo', ativo);
    }

    botao.onclick = () => {
        estado[opcao] = !estado[opcao];
        atualizar();
    };
    atualizar();
}

function configurarBotaoLimpar() {
    const btnLimpar = document.querySelector('#btn-limpar-ficha');
    if (!btnLimpar) return;
    const novoBtn = btnLimpar.cloneNode(true);
    btnLimpar.parentNode.replaceChild(novoBtn, btnLimpar);
    novoBtn.addEventListener('click', async () => {
        if (document.querySelector('#pagina-ficha-nova.wizard-ativo')) return;
        if (!(await confirmarAcao('Apagar todas as páginas, campos e blocos desta ficha e deixar uma página em branco?'))) return;

        const pagina = { id: gerarId('pag_'), nome: 'Página 1', icone: 'fa-book', descricao: '', paineis: [] };
        estado.paginas = [pagina];
        estado.paginaAtivaId = pagina.id;
        salvarEstado({ redefinirLayout: true });
        renderizarMenu();
        carregarConteudoPaginaAtiva();
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
