/* ============================================================
   MÓDULO: COPIAR E COLAR (Ficha Nova)
   ============================================================ */

import { 
    estado, 
    salvarEstado, 
    gerarId, 
    getPaginaAtiva, 
    estaEmModoEdicao,
    gerarNomeUnico,
    areaTransferenciaCodex,
    MAX_PAGINAS
} from './estado.js';

let refsRenderizar = null;
let refsTrocarPagina = null;
let refsEncontrarSlot = null;

export function configurarCopiarColar(callbacks) {
    refsRenderizar = callbacks.renderizarPaineis;
    refsTrocarPagina = callbacks.trocarPagina;
    refsEncontrarSlot = callbacks.encontrarPrimeiroSlotLivre;

    if (window._atalhosCodexConfigurados === true) return;
    window._atalhosCodexConfigurados = true;

    let campoSelecionadoId = null;

    document.addEventListener('pointerdown', (e) => {
        const painelEl = e.target.closest('.painel');
        if (painelEl) {
            document.querySelectorAll('.painel.selecionado').forEach(p => p.classList.remove('selecionado'));
            painelEl.classList.add('selecionado');
            campoSelecionadoId = painelEl.dataset.painelId;
        } else if (!e.target.closest('.folha-menu-lateral')) {
            document.querySelectorAll('.painel.selecionado').forEach(p => p.classList.remove('selecionado'));
            campoSelecionadoId = null;
        }
    });

    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            if (!estaEmModoEdicao() || !areaTransferenciaCodex.tipo) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            e.preventDefault();
            colarElemento(campoSelecionadoId);
        }
    });
}

export function copiarPagina(id) {
    const pag = estado.paginas.find(p => p.id === id);
    if (!pag) return;
    areaTransferenciaCodex.tipo = 'pagina';
    areaTransferenciaCodex.dados = JSON.parse(JSON.stringify(pag));
    alert("Página copiada! Aperte Ctrl+V na folha para colar.");
}

function colarElemento(campoSelecionadoId) {
    const item = areaTransferenciaCodex;
    if (!item || !item.tipo) return;

    if (item.tipo === 'pagina') {
        if (estado.paginas.length >= MAX_PAGINAS) return alert("Limite de páginas atingido.");
        const novaPag = JSON.parse(JSON.stringify(item.dados));
        novaPag.id = gerarId('pag_');
        novaPag.nome = gerarNomeUnico(novaPag.nome, estado.paginas);
        
        novaPag.paineis.forEach(p => {
            p.id = gerarId('p_');
            p.titulo = gerarNomeUnico(p.titulo, novaPag.paineis);
            p.x += 20; p.y += 20;
            p.blocos.forEach(b => { b.id = gerarId('b_'); });
        });
        
        estado.paginas.push(novaPag);
        salvarEstado();
        if (refsTrocarPagina) refsTrocarPagina(novaPag.id);

    } else if (item.tipo === 'campo') {
        if (!campoSelecionadoId) {
            const pag = getPaginaAtiva();
            if (!pag) return;
            const novoCampo = JSON.parse(JSON.stringify(item.dados));
            novoCampo.id = gerarId('p_');
            novoCampo.titulo = gerarNomeUnico(novoCampo.titulo, pag.paineis);
            novoCampo.blocos.forEach(b => { b.id = gerarId('b_'); });
            
            if (refsEncontrarSlot) {
                const slot = refsEncontrarSlot(pag.paineis, novoCampo.largura, novoCampo.altura);
                novoCampo.x = slot.x; novoCampo.y = slot.y;
            }

            pag.paineis.push(novoCampo);
            salvarEstado();
            if (refsRenderizar) refsRenderizar();
        } else {
            alert("Para colar um campo, clique na folha vazia primeiro.");
        }

    } else if (item.tipo === 'bloco') {
        if (!campoSelecionadoId) {
            alert("Selecione o campo onde deseja colar o bloco primeiro.");
            return;
        }
        const pag = getPaginaAtiva();
        const painel = pag.paineis.find(p => p.id === campoSelecionadoId);
        if (!painel) return;

        const novoBloco = JSON.parse(JSON.stringify(item.dados));
        novoBloco.id = gerarId('b_');
        novoBloco.x += 10; novoBloco.y += 10;

        painel.blocos.push(novoBloco);
        salvarEstado();
        if (refsRenderizar) refsRenderizar();
    }
}