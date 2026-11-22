/* ============================================================
   CODEX — Wizard: Passo 2 (Renderização)
   ============================================================ */

import { estado, gerarId, salvarEstado, GRID } from '../paginas/estado.js';
import { adicionarBlocoNoPainel } from '../paineis.js';
import { renderizarBloco } from '../blocos/renderizar.js';
import { configurarSeletorDestinoWizard } from './passo2-paginas.js';
import { copiarElemento } from '../paginas/copiar-colar.js'; // Importando a nova função

window._codexWizardObterCampoAtual = () => window._codexWizardCampoAtual || null;

window._codexWizardAtualizarCampo = () => {
    if (window._codexWizardRefs && window._codexWizardCampoAtual && typeof window._codexWizardDesenhar === 'function') {
        window._codexWizardDesenhar(window._codexWizardRefs, window._codexWizardCampoAtual);
    }
};

export function criarAmbienteDeCampo(refs, cbRenderizarMenu, contadorCampo, campoAtual) {
    if (!campoAtual) {
        campoAtual = {
            id: gerarId('p_'),
            titulo: 'Campo ' + contadorCampo,
            x: 40, y: 30,
            largura: 500,
            altura: 400,
            blocos: []
        };
    }

    if (!Array.isArray(campoAtual.blocos)) campoAtual.blocos = [];

    refs._campoAtual = campoAtual;
    refs._cbRenderizarMenu = () => {}; 
    refs._contadorCampo = contadorCampo;

    window._codexWizardRefs = refs;
    window._codexWizardCampoAtual = campoAtual;

    desenharTelaWizard(refs, campoAtual);
    configurarSeletorDestinoWizard(refs);

    configurarBotoesAcaoWizard(refs);
}

function obterBlocoSelecionado(refs) {
    const elBlocoSel = refs.pagina.querySelector('.painel-conteudo .bloco.selecionado');
    if (!elBlocoSel) return null;
    const blocoId = elBlocoSel.dataset.blocoId;
    if (!blocoId) return null;
    return refs._campoAtual.blocos.find(b => b.id === blocoId) || null;
}

function configurarBotoesAcaoWizard(refs) {
    const btnAddBloco = refs.pagina.querySelector('#btn-add-bloco');
    const btnConfig = refs.pagina.querySelector('#btn-acao-config');
    const btnCopiar = refs.pagina.querySelector('#btn-acao-copiar');
    const btnExcluir = refs.pagina.querySelector('#btn-acao-excluir');

    if (btnAddBloco) {
        const novoBtnAdd = btnAddBloco.cloneNode(true);
        btnAddBloco.parentNode.replaceChild(novoBtnAdd, btnAddBloco);
        novoBtnAdd.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            adicionarBlocoNoPainel(refs._campoAtual);
            salvarEstado();
            desenharTelaWizard(refs, refs._campoAtual);
            configurarSeletorDestinoWizard(refs);
        };
    }

    if (btnConfig) {
        const novoBtnConfig = btnConfig.cloneNode(true);
        btnConfig.parentNode.replaceChild(novoBtnConfig, btnConfig);
        novoBtnConfig.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const bloco = obterBlocoSelecionado(refs);
            if (bloco) {
                window._codexWizardCampoAtual = refs._campoAtual;
                window._codexWizardRefs = refs;
                if (typeof window.abrirBottomSheetBloco === 'function') {
                    window.abrirBottomSheetBloco(refs._campoAtual.id, bloco.id, false);
                }
            } else {
                alert("Clique em um bloco primeiro para configurá-lo.");
            }
        };
    }

    if (btnCopiar) {
        const novoBtnCopiar = btnCopiar.cloneNode(true);
        btnCopiar.parentNode.replaceChild(novoBtnCopiar, btnCopiar);
        novoBtnCopiar.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const bloco = obterBlocoSelecionado(refs);
            if (bloco) {
                // Usa a nova função que mostra o Toast
                copiarElemento('bloco', bloco);
            } else {
                alert("Clique em um bloco primeiro para copiá-lo.");
            }
        };
    }

    if (btnExcluir) {
        const novoBtnExcluir = btnExcluir.cloneNode(true);
        btnExcluir.parentNode.replaceChild(novoBtnExcluir, btnExcluir);
        novoBtnExcluir.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const bloco = obterBlocoSelecionado(refs);
            if (bloco) {
                const label = (bloco.tituloBloco || bloco.texto || '(sem título)').slice(0, 30);
                if (confirm(`Excluir o bloco "${label}"?`)) {
                    refs._campoAtual.blocos = refs._campoAtual.blocos.filter(b => b.id !== bloco.id);
                    salvarEstado();
                    desenharTelaWizard(refs, refs._campoAtual);
                    configurarSeletorDestinoWizard(refs);
                }
            } else {
                alert("Selecione um bloco primeiro.");
            }
        };
    }
}

export function desenharTelaWizard(refs, campoAtual) {
    const folhaConteudo = refs.pagina.querySelector('#folha-conteudo');
    if (!folhaConteudo) return;

    const painel = campoAtual || refs._campoAtual;
    if (!painel) return;

    if (!Array.isArray(painel.blocos)) painel.blocos = [];

    window._codexWizardRefs = refs;
    window._codexWizardCampoAtual = painel;
    window._codexWizardDesenhar = desenharTelaWizard;

    folhaConteudo.innerHTML = '';

    const elPainel = document.createElement('div');
    elPainel.className = 'painel';
    elPainel.dataset.painelId = painel.id;
    elPainel.style.left = painel.x + 'px';
    elPainel.style.top = painel.y + 'px';
    elPainel.style.width = painel.largura + 'px';
    elPainel.style.height = painel.altura + 'px';

    const header = document.createElement('div');
    header.className = 'painel-header';
    const inputTitulo = document.createElement('input');
    inputTitulo.type = 'text';
    inputTitulo.className = 'painel-titulo';
    inputTitulo.value = painel.titulo;
    inputTitulo.addEventListener('input', (e) => { painel.titulo = e.target.value; });
    header.appendChild(inputTitulo);
    elPainel.appendChild(header);

    const conteudo = document.createElement('div');
    conteudo.className = 'painel-conteudo';
    elPainel.appendChild(conteudo);

    const atualizarSelecaoVisual = (blocoEl) => {
        conteudo.querySelectorAll('.bloco').forEach(b => b.classList.remove('selecionado'));
        if (blocoEl) blocoEl.classList.add('selecionado');
    };

    let offsetX = 10, offsetY = 10;

    painel.blocos.forEach((bloco) => {
        if (bloco.x === undefined) bloco.x = offsetX;
        if (bloco.y === undefined) bloco.y = offsetY;
        if (!bloco.largura) bloco.largura = 200;
        if (!bloco.altura) bloco.altura = 100;
        
        const elBloco = renderizarBloco(bloco, painel.id, () => desenharTelaWizard(refs, painel));
        
        elBloco.onclick = (e) => {
            if (e.target.closest('.bloco-alca-arrasto')) return;
            e.stopPropagation();
            atualizarSelecaoVisual(elBloco);
        };

        const alca = elBloco.querySelector('.bloco-alca-arrasto');
        if (alca) {
            alca.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                atualizarSelecaoVisual(elBloco);

                const startX = e.clientX, startY = e.clientY, origX = bloco.x, origY = bloco.y;
                const folha = document.querySelector('#pagina-ficha-nova .folha');
                const zoomAtual = folha.getBoundingClientRect().width / folha.offsetWidth || 1;

                const onMove = (ev) => {
                    let novoX = origX + (ev.clientX - startX) / zoomAtual;
                    let novoY = origY + (ev.clientY - startY) / zoomAtual;
                    if (estado.modoLayout === 'grid') {
                        novoX = Math.round(novoX / GRID) * GRID;
                        novoY = Math.round(novoY / GRID) * GRID;
                    }
                    if (novoX < 10) novoX = 10; if (novoY < 10) novoY = 10;
                    
                    bloco.x = Math.round(novoX);
                    bloco.y = Math.round(novoY);
                    elBloco.style.left = bloco.x + 'px';
                    elBloco.style.top = bloco.y + 'px';
                };

                const onUp = () => {
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                    salvarEstado();
                };

                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
            }, { capture: true });
        }

        // --- LÓGICA DE REDIMENSIONAMENTO ---
        ['topo', 'base', 'esq', 'dir'].forEach(lado => {
            const borda = elBloco.querySelector(`.bloco-borda-${lado}`);
            if (!borda) return;

            borda.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                atualizarSelecaoVisual(elBloco);

                const startX = e.clientX, startY = e.clientY;
                const orig = { x: bloco.x, y: bloco.y, largura: bloco.largura, altura: bloco.altura };
                const folha = document.querySelector('#pagina-ficha-nova .folha');
                const zoomAtual = folha.getBoundingClientRect().width / folha.offsetWidth || 1;
                
                let minLargura = 50;
                if (bloco.tipo === 'numerico') minLargura = bloco.modTipo === 'com' ? 140 : 80;
                let minAltura = 28;

                const onMove = (ev) => {
                    const dx = (ev.clientX - startX) / zoomAtual;
                    const dy = (ev.clientY - startY) / zoomAtual;
                    let { x, y, largura, altura } = orig;

                    if (lado === 'dir') largura = orig.largura + dx;
                    if (lado === 'esq') { largura = orig.largura - dx; x = orig.x + dx; }
                    if (lado === 'base') altura = orig.altura + dy;
                    if (lado === 'topo') { altura = orig.altura - dy; y = orig.y + dy; }

                    if (largura < minLargura) { if (lado === 'esq') x = orig.x + (orig.largura - minLargura); largura = minLargura; }
                    if (altura < minAltura) { if (lado === 'topo') y = orig.y + (orig.altura - minAltura); altura = minAltura; }

                    if (x < 10) { largura += x - 10; x = 10; }
                    if (y < 10) { altura += y - 10; y = 10; }

                    bloco.x = Math.round(x);
                    bloco.y = Math.round(y);
                    bloco.largura = Math.round(largura);
                    bloco.altura = Math.round(altura);

                    elBloco.style.left = bloco.x + 'px';
                    elBloco.style.top = bloco.y + 'px';
                    elBloco.style.width = bloco.largura + 'px';
                    elBloco.style.height = bloco.altura + 'px';
                };

                const onUp = () => {
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                    salvarEstado();
                };

                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
            }, { capture: true });
        });
        
        conteudo.appendChild(elBloco);

        offsetX += 30;
        offsetY += 30;
        if (offsetX > 200) offsetX = 10;
        if (offsetY > 200) offsetY = 10;
    });

    folhaConteudo.appendChild(elPainel);
}
