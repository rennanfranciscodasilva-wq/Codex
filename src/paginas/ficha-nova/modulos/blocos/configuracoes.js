/* ============================================================
   MÓDULO: CONFIGURAÇÕES DO BLOCO (Ficha Nova)
   ============================================================ */

import { confirmarAcao } from '../../../../componentes/dialogos/dialogos.js';
import { estado, salvarEstado, getPaginaAtiva, estaEmModoEdicao } from '../paginas/index.js';
import { configurarEditorFormula, formulaEventBus } from '../automacao.js';
import { configurarDescricao } from '../descricao.js';

let blocoSendoEditadoId = null;
let painelPaiIdTemp = null;
let renderizarPaineisCallback = null;

function atualizarBlocoNaFolha() {
    if (document.querySelector('#pagina-ficha-nova.wizard-ativo')) {
        window._codexWizardAtualizarCampo?.();
    } else {
        renderizarPaineisCallback?.();
    }
}

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

    const blocoImgControles = document.querySelector('#bloco-img-controles');
    const sliderImgZoom = document.querySelector('#bloco-img-zoom');
    const sliderImgX = document.querySelector('#bloco-img-x');
    const sliderImgY = document.querySelector('#bloco-img-y');

    const btnAddFormula = document.querySelector('#btn-add-formula');
    const resumoFormula = document.querySelector('#bloco-sheet-formula-resumo');
    const textoFormula = document.querySelector('#bloco-sheet-formula-texto');
    const btnEditFormula = document.querySelector('#btn-edit-formula');
    const btnRemoveFormula = document.querySelector('#btn-remove-formula');

    if (!sheet || !selectTipo) return;
    if (sheet.dataset.configurado === 'true') return;
    sheet.dataset.configurado = 'true';

    // --- FUNÇÃO AUXILIAR PARA BUSCAR O BLOCO COM SEGURANÇA ---
    const obterBlocoAtual = () => {
        // 1. Tenta buscar no Wizard
        if (typeof window._codexWizardObterCampoAtual === 'function') {
            const campoAtual = window._codexWizardObterCampoAtual();
            // Verifica se campoAtual existe E se blocos é um array
            if (campoAtual && campoAtual.id === painelPaiIdTemp && Array.isArray(campoAtual.blocos)) {
                return campoAtual.blocos.find(b => b.id === blocoSendoEditadoId) || null;
            }
        }

        // 2. Tenta buscar na ficha normal (estado global)
        const pag = getPaginaAtiva();
        if (pag && Array.isArray(pag.paineis)) {
            const p = pag.paineis.find(p => p.id === painelPaiIdTemp);
            if (p && Array.isArray(p.blocos)) {
                return p.blocos.find(b => b.id === blocoSendoEditadoId) || null;
            }
        }
        
        return null;
    };

    const carregarDescricao = configurarDescricao(sheet, descricao => {
        if (!estaEmModoEdicao()) return;
        const bloco = obterBlocoAtual();
        if (!bloco) return;
        if (descricao === undefined) delete bloco.descricao;
        else bloco.descricao = descricao;
        salvarEstado({ descricaoEditada: { tipo: 'bloco', id: bloco.id, descricao: descricao ?? null } });
        atualizarBlocoNaFolha();
    });

    configurarEditorFormula(() => {
        salvarEstado();
        atualizarBlocoNaFolha();
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
        if (!selectTipo) return;
        const tipo = selectTipo.value;
        const modelo = tipo === 'textual' ? selectModeloTxt?.value : (tipo === 'numerico' ? selectModeloNum?.value : '');
        const temTitulo = modelo && modelo.includes('titulo');

        if (wrapModeloTxt) wrapModeloTxt.style.display = (tipo === 'textual') ? 'flex' : 'none';
        if (wrapModeloNum) wrapModeloNum.style.display = (tipo === 'numerico') ? 'flex' : 'none';
        if (wrapModificador) wrapModificador.style.display = (tipo === 'numerico') ? 'flex' : 'none';
        if (wrapAutomacao) wrapAutomacao.style.display = (tipo === 'numerico') ? 'flex' : 'none';
        if (wrapAlinhamento) wrapAlinhamento.style.display = temTitulo ? 'flex' : 'none';
        if (wrapUrl) wrapUrl.style.display = (tipo === 'imagem') ? 'flex' : 'none';

        if (blocoImgControles) {
            const isImagem = tipo === 'imagem';
            const temUrl = inputUrl && inputUrl.value.trim() !== '';
            blocoImgControles.style.display = (isImagem && temUrl) ? 'flex' : 'none';
        }

        if (tipo === 'numerico' && selectModificador?.value === 'com') {
            if (divModCampos) divModCampos.style.display = 'flex';
        } else {
            if (divModCampos) divModCampos.style.display = 'none';
        }
    };

    if (selectTipo) selectTipo.addEventListener('change', () => { atualizarInterface(); salvarConfiguracoes(); });
    if (selectModeloTxt) selectModeloTxt.addEventListener('change', () => { atualizarInterface(); salvarConfiguracoes(); });
    if (selectModeloNum) selectModeloNum.addEventListener('change', () => { atualizarInterface(); salvarConfiguracoes(); });
    if (selectModificador) selectModificador.addEventListener('change', () => { atualizarInterface(); salvarConfiguracoes(); });
    if (selectModPosicao) selectModPosicao.addEventListener('change', salvarConfiguracoes);
    if (inputModMedio) inputModMedio.addEventListener('input', salvarConfiguracoes);
    if (inputModCada) inputModCada.addEventListener('input', salvarConfiguracoes);
    if (inputModBonus) inputModBonus.addEventListener('input', salvarConfiguracoes);
    if (selectAlignTitulo) selectAlignTitulo.addEventListener('change', salvarConfiguracoes);
    if (selectAlignConteudo) selectAlignConteudo.addEventListener('change', salvarConfiguracoes);
    
    if (inputUrl) {
        inputUrl.addEventListener('input', () => {
            atualizarInterface();
            salvarConfiguracoes();
        });
    }
    
    if (sliderImgZoom) sliderImgZoom.addEventListener('input', salvarConfiguracoes);
    if (sliderImgX) sliderImgX.addEventListener('input', salvarConfiguracoes);
    if (sliderImgY) sliderImgY.addEventListener('input', salvarConfiguracoes);

    if (btnAddFormula) {
        btnAddFormula.addEventListener('click', () => {
            window.abrirEditorFormula(painelPaiIdTemp, blocoSendoEditadoId, null);
        });
    }

    if (btnEditFormula) {
        btnEditFormula.addEventListener('click', (e) => {
            e.preventDefault();
            const b = obterBlocoAtual();
            if (!b) return;
            window.abrirEditorFormula(painelPaiIdTemp, blocoSendoEditadoId, b.formula);
        });
    }

    if (btnRemoveFormula) {
        btnRemoveFormula.addEventListener('click', async (e) => {
            e.preventDefault();
            if((await confirmarAcao("Deseja remover a automatização deste bloco?", { pausavel: true }))) {
                const b = obterBlocoAtual();
                if (!b) return;
                b.formula = [];
                salvarEstado();
                if (typeof formulaEventBus !== 'undefined') formulaEventBus.dispatchEvent(new Event('formulaAtualizada'));
                atualizarResumoFormula();
                atualizarBlocoNaFolha();
            }
        });
    }

    function atualizarResumoFormula() {
        if (!blocoSendoEditadoId || !painelPaiIdTemp || !resumoFormula || !btnAddFormula || !textoFormula) return;
        
        const b = obterBlocoAtual();
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
        blocoSendoEditadoId = blocoId;
        painelPaiIdTemp = painelId;

        const b = obterBlocoAtual();
        if (!b) {
            console.error("Bloco não encontrado para configurar:", painelId, blocoId);
            // Se o bloco não foi encontrado, ainda assim abre a sheet para não travar
            // mas não tenta ler propriedades de um objeto undefined
            if (selectTipo) selectTipo.value = 'textual';
        } else {
            if (selectTipo) selectTipo.value = b.tipo || 'textual';
            
            if (b.tipo === 'textual') {
                if (selectModeloTxt) selectModeloTxt.value = b.modelo || 'padrao';
            } else if (b.tipo === 'numerico') {
                if (selectModeloNum) selectModeloNum.value = b.modelo || 'padrao';
                if (selectModificador) selectModificador.value = b.modTipo || 'sem';
                if (selectModPosicao) selectModPosicao.value = b.modPosicao || 'lado';
                if (inputModMedio) inputModMedio.value = b.modMedio || 10;
                if (inputModCada) inputModCada.value = b.modCada || 2;
                if (inputModBonus) inputModBonus.value = b.modBonus || 1;
            } else if (b.tipo === 'imagem') {
                if (inputUrl) inputUrl.value = b.urlImagem || '';
                if (sliderImgZoom) sliderImgZoom.value = b.imgZoom || 1;
                if (sliderImgX) sliderImgX.value = b.imgX || 0;
                if (sliderImgY) sliderImgY.value = b.imgY || 0;
            }

            if (selectAlignTitulo) selectAlignTitulo.value = b.alignTitulo || 'left';
            if (selectAlignConteudo) selectAlignConteudo.value = b.alignConteudo || 'left';
        }
        
        atualizarInterface();
        atualizarResumoFormula();

        carregarDescricao(b?.descricao, !modoJogador);
        const todosControles = sheet.querySelectorAll('select, input, textarea, button, a');
        if (modoJogador) {
            todosControles.forEach(el => {
                if (el === inputUrl || el === sliderImgZoom || el === sliderImgX || el === sliderImgY || el === btnClose) {
                    el.disabled = false;
                    el.readOnly = false;
                    return;
                }
                el.disabled = true;
                el.style.opacity = '0.4';
                el.style.pointerEvents = 'none';
            });
            if (btnClose) {
                btnClose.disabled = false;
                btnClose.style.opacity = '1';
                btnClose.style.pointerEvents = 'auto';
            }
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

        sheet.classList.add('active');
    };

    function salvarConfiguracoes() {
        const b = obterBlocoAtual();
        if (!b) return;

        if (selectTipo) b.tipo = selectTipo.value;
        if (selectAlignTitulo) b.alignTitulo = selectAlignTitulo.value;
        if (selectAlignConteudo) b.alignConteudo = selectAlignConteudo.value;
        
        if (b.tipo === 'textual') {
            if (selectModeloTxt) b.modelo = selectModeloTxt.value;
            b.valorNumerico = undefined;
            b.formula = [];
        } else if (b.tipo === 'numerico') {
            if (selectModeloNum) b.modelo = selectModeloNum.value;
            if (selectModificador) b.modTipo = selectModificador.value;
            if (selectModPosicao) b.modPosicao = selectModPosicao.value;
            if (inputModMedio) b.modMedio = inputModMedio.value;
            if (inputModCada) b.modCada = inputModCada.value;
            if (inputModBonus) b.modBonus = inputModBonus.value;
            b.texto = undefined;
        } else if (b.tipo === 'imagem') {
            if (inputUrl) b.urlImagem = inputUrl.value;
            if (sliderImgZoom) b.imgZoom = parseFloat(sliderImgZoom.value);
            if (sliderImgX) b.imgX = parseFloat(sliderImgX.value);
            if (sliderImgY) b.imgY = parseFloat(sliderImgY.value);
            
            b.texto = undefined;
            b.valorNumerico = undefined;
            b.formula = [];
        }
        
        salvarEstado(b.tipo === 'imagem'
            ? (estaEmModoEdicao() ? { imagemModelo: b.id } : { preenchimento: true })
            : {});

        atualizarBlocoNaFolha();
    }
}
