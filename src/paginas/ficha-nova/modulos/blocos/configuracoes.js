/* ============================================================
   MÓDULO: CONFIGURAÇÕES DO BLOCO (Ficha Nova)
   ============================================================ */

import { estado, salvarEstado, getPaginaAtiva } from '../paginas/index.js';
import { configurarEditorFormula, formulaEventBus } from '../automacao.js';

let blocoSendoEditadoId = null;
let painelPaiIdTemp = null;
let renderizarPaineisCallback = null;

export function configurarSheetBloco(renderizarCallback) {
    renderizarPaineisCallback = renderizarCallback;
    
    const sheet = document.querySelector('#bloco-settings-sheet');
    const dragHandle = document.querySelector('#bloco-sheet-header-drag');
    const btnClose = document.querySelector('#bloco-sheet-close-btn');
    
    const selectTipo = document.querySelector('#bloco-sheet-tipo');
    const wrapModeloTxt = document.querySelector('#bloco-sheet-modelo-textual-wrapper');
    const selectModeloTxt = document.querySelector('#bloco-sheet-modelo-textual');
    const wrapModeloNum = document.querySelector('#bloco-sheet-modelo-numerico-wrapper');
    const selectModeloNum = document.querySelector('#bloco-sheet-modelo-numerico');
    const wrapModificador = document.querySelector('#bloco-sheet-modificador-wrapper');
    const selectModificador = document.querySelector('#bloco-sheet-modificador');
    const divModCampos = document.querySelector('#bloco-sheet-mod-campos');
    const selectModPosicao = document.querySelector('#bloco-sheet-mod-posicao');
    
    const inputModMedio = document.querySelector('#bloco-sheet-mod-medio');
    const inputModCada = document.querySelector('#bloco-sheet-mod-cada');
    const inputModBonus = document.querySelector('#bloco-sheet-mod-bonus');

    const wrapAlinhamento = document.querySelector('#bloco-sheet-alinhamento-wrapper');
    const selectAlignTitulo = document.querySelector('#bloco-sheet-align-titulo');
    const selectAlignConteudo = document.querySelector('#bloco-sheet-align-conteudo');

    const wrapUrl = document.querySelector('#bloco-sheet-url-wrapper');
    const inputUrl = document.querySelector('#bloco-sheet-url');
    const wrapAutomacao = document.querySelector('#bloco-sheet-automacao-wrapper');

    const btnAddFormula = document.querySelector('#btn-add-formula');
    const resumoFormula = document.querySelector('#bloco-sheet-formula-resumo');
    const textoFormula = document.querySelector('#bloco-sheet-formula-texto');
    const btnEditFormula = document.querySelector('#btn-edit-formula');
    const btnRemoveFormula = document.querySelector('#btn-remove-formula');

    if (!sheet || !selectTipo) return;

    configurarEditorFormula(() => {
        if (renderizarPaineisCallback) renderizarPaineisCallback();
        atualizarResumoFormula(); 
    });

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
        sheet.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, visibility 0.3s ease';
        sheet.releasePointerCapture(e.pointerId);
    };

    if (dragHandle) {
        dragHandle.addEventListener('pointerdown', onPointerDown);
        sheet.addEventListener('pointermove', onPointerMove); 
        sheet.addEventListener('pointerup', onPointerUp);
    }
    
    if (btnClose) {
        btnClose.addEventListener('click', () => { 
            sheet.classList.remove('active'); 
            blocoSendoEditadoId = null; painelPaiIdTemp = null;
        });
    }

    const atualizarInterface = () => {
        const tipo = selectTipo.value;
        const modelo = tipo === 'textual' ? selectModeloTxt.value : (tipo === 'numerico' ? selectModeloNum.value : '');
        const temTitulo = modelo.includes('titulo');

        wrapModeloTxt.style.display = (tipo === 'textual') ? 'flex' : 'none';
        wrapModeloNum.style.display = (tipo === 'numerico') ? 'flex' : 'none';
        wrapModificador.style.display = (tipo === 'numerico') ? 'flex' : 'none';
        wrapAutomacao.style.display = (tipo === 'numerico') ? 'flex' : 'none';
        wrapAlinhamento.style.display = temTitulo ? 'flex' : 'none';
        wrapUrl.style.display = (tipo === 'imagem') ? 'flex' : 'none';

        if (tipo === 'numerico' && selectModificador.value === 'com') {
            divModCampos.style.display = 'flex';
        } else {
            divModCampos.style.display = 'none';
        }
    };

    selectTipo.addEventListener('change', () => { atualizarInterface(); salvarConfiguracoes(); });
    selectModeloTxt.addEventListener('change', () => { atualizarInterface(); salvarConfiguracoes(); });
    selectModeloNum.addEventListener('change', () => { atualizarInterface(); salvarConfiguracoes(); });
    selectModificador.addEventListener('change', () => { atualizarInterface(); salvarConfiguracoes(); });
    selectModPosicao.addEventListener('change', salvarConfiguracoes);
    inputModMedio.addEventListener('input', salvarConfiguracoes);
    inputModCada.addEventListener('input', salvarConfiguracoes);
    inputModBonus.addEventListener('input', salvarConfiguracoes);
    selectAlignTitulo.addEventListener('change', salvarConfiguracoes);
    selectAlignConteudo.addEventListener('change', salvarConfiguracoes);
    inputUrl.addEventListener('input', salvarConfiguracoes);

    if (btnAddFormula) {
        btnAddFormula.addEventListener('click', () => {
            window.abrirEditorFormula(painelPaiIdTemp, blocoSendoEditadoId, null);
        });
    }

    if (btnEditFormula) {
        btnEditFormula.addEventListener('click', (e) => {
            e.preventDefault();
            const pag = getPaginaAtiva();
            if (!pag) return;
            const p = pag.paineis.find(p => p.id === painelPaiIdTemp);
            if (!p) return;
            const b = p.blocos.find(b => b.id === blocoSendoEditadoId);
            if (!b) return;
            window.abrirEditorFormula(painelPaiIdTemp, blocoSendoEditadoId, b.formula);
        });
    }

    if (btnRemoveFormula) {
        btnRemoveFormula.addEventListener('click', (e) => {
            e.preventDefault();
            if(confirm("Deseja remover a automatização deste bloco?")) {
                const pag = getPaginaAtiva();
                if (!pag) return;
                const p = pag.paineis.find(p => p.id === painelPaiIdTemp);
                if (!p) return;
                const b = p.blocos.find(b => b.id === blocoSendoEditadoId);
                if (!b) return;
                b.formula = [];
                salvarEstado();
                if (typeof formulaEventBus !== 'undefined') formulaEventBus.dispatchEvent(new Event('formulaAtualizada'));
                atualizarResumoFormula();
                if (renderizarPaineisCallback) renderizarPaineisCallback();
            }
        });
    }

    function atualizarResumoFormula() {
        if (!blocoSendoEditadoId || !painelPaiIdTemp || !resumoFormula || !btnAddFormula || !textoFormula) return;
        
        const pag = getPaginaAtiva();
        if (!pag) return;
        const p = pag.paineis.find(p => p.id === painelPaiIdTemp);
        if (!p) return;
        const b = p.blocos.find(b => b.id === blocoSendoEditadoId);
        if (!b) return;
        
        if (b.formula && b.formula.length > 0) {
            btnAddFormula.style.display = 'none';
            resumoFormula.style.display = 'block';
            textoFormula.innerHTML = '';
            b.formula.forEach(item => {
                const span = document.createElement('span');
                span.textContent = item.tipo === 'campo' ? `[${item.nome}]` : item.valor;
                if (item.tipo === 'operador') span.style.color = 'var(--cor-dourado)';
                textoFormula.appendChild(span);
            });
        } else {
            btnAddFormula.style.display = 'flex';
            resumoFormula.style.display = 'none';
        }
    }

    window.abrirBottomSheetBloco = (painelId, blocoId, modoJogador = false) => {
        const pag = getPaginaAtiva();
        if (!pag) return;
        const p = pag.paineis.find(p => p.id === painelId);
        if (!p || !p.blocos) return;
        const b = p.blocos.find(b => b.id === blocoId);
        if (!b) return;
        
        blocoSendoEditadoId = blocoId;
        painelPaiIdTemp = painelId;

        selectTipo.value = b.tipo || 'textual';
        
        if (b.tipo === 'textual') {
            selectModeloTxt.value = b.modelo || 'padrao';
        } else if (b.tipo === 'numerico') {
            selectModeloNum.value = b.modelo || 'padrao';
            selectModificador.value = b.modTipo || 'sem';
            selectModPosicao.value = b.modPosicao || 'lado';
            inputModMedio.value = b.modMedio || 10;
            inputModCada.value = b.modCada || 2;
            inputModBonus.value = b.modBonus || 1;
        } else if (b.tipo === 'imagem') {
            inputUrl.value = b.urlImagem || '';
        }

        selectAlignTitulo.value = b.alignTitulo || 'left';
        selectAlignConteudo.value = b.alignConteudo || 'left';
        
        atualizarInterface();
        atualizarResumoFormula();

        // --- LÓGICA DO MODO JOGADOR (SÓ URL EDITÁVEL) ---
        const todosControles = sheet.querySelectorAll('select, input, button, a');
        if (modoJogador) {
            todosControles.forEach(el => {
                if (el === inputUrl) {
                    el.disabled = false;
                    el.readOnly = false;
                    return;
                }
                if (el === btnClose) return;
                if (el.closest('.sheet-header-drag') && !el.classList.contains('sheet-close-btn')) {
                    // Permite arrastar o header (o drag é via pointerdown no dragHandle, não no button)
                }
                el.disabled = true;
                el.style.opacity = '0.4';
                el.style.pointerEvents = 'none';
            });
            // Reabilita o botão de fechar (que foi pego pelo forEach)
            if (btnClose) {
                btnClose.disabled = false;
                btnClose.style.opacity = '1';
                btnClose.style.pointerEvents = 'auto';
            }
            // Reabilita o drag handle para mover o modal
            if (dragHandle) {
                dragHandle.style.pointerEvents = 'auto';
            }
        } else {
            todosControles.forEach(el => {
                el.disabled = false;
                el.readOnly = false;
                el.style.opacity = '';
                el.style.pointerEvents = '';
            });
        }

        if (!sheet.style.left) {
            sheet.style.left = 'auto'; sheet.style.top = 'auto'; 
            sheet.style.right = '2rem'; sheet.style.bottom = '2rem';
        }
        
        sheet.classList.add('active');
    };

    function salvarConfiguracoes() {
        const pag = getPaginaAtiva();
        if (!pag) return;
        const p = pag.paineis.find(p => p.id === painelPaiIdTemp);
        if (!p) return;
        const b = p.blocos.find(b => b.id === blocoSendoEditadoId);
        if (!b) return;

        b.tipo = selectTipo.value;
        b.alignTitulo = selectAlignTitulo.value;
        b.alignConteudo = selectAlignConteudo.value;
        
        if (b.tipo === 'textual') {
            b.modelo = selectModeloTxt.value;
        } else if (b.tipo === 'numerico') {
            b.modelo = selectModeloNum.value;
            b.modTipo = selectModificador.value;
            b.modPosicao = selectModPosicao.value;
            b.modMedio = inputModMedio.value;
            b.modCada = inputModCada.value;
            b.modBonus = inputModBonus.value;
        } else if (b.tipo === 'imagem') {
            b.urlImagem = inputUrl.value;
        }
        
        salvarEstado();
        if (renderizarPaineisCallback) renderizarPaineisCallback(); 
    }
}