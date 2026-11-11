/* ============================================================
   MÓDULO: BLOCOS (Ficha Nova)
   ============================================================ */

import { estaEmModoEdicao, estado, GRID, salvarEstado, gerarId, areaTransferenciaCodex } from './paginas.js';
import { configurarEditorFormula, calcularFormula, formulaEventBus } from './automacao.js';

const BLOCO_LARG_MIN = 100;
const BLOCO_ALT_MIN = 100; // Aumentado para caber título, conteúdo e rodapé

let blocoSendoEditadoId = null;
let painelPaiIdTemp = null;

export function renderizarBloco(bloco, painelPaiId, renderizarPaineisCallback) {
    const el = document.createElement('div');
    el.className = 'bloco';
    el.dataset.blocoId = bloco.id;
    el.style.left = bloco.x + 'px'; 
    el.style.top = bloco.y + 'px';
    el.style.width = bloco.largura + 'px'; 
    el.style.height = bloco.altura + 'px';

    if (!bloco.tipo) bloco.tipo = 'textual';
    if (!bloco.modelo) bloco.modelo = 'padrao';
    if (!bloco.alignTitulo) bloco.alignTitulo = 'left';
    if (!bloco.alignConteudo) bloco.alignConteudo = 'left';

    if (bloco.tipo === 'textual' && bloco.modelo.includes('expansivel')) {
        el.classList.add('expansivel');
    }

    // --- TÍTULO (Topo) ---
    if (bloco.tipo === 'textual' || bloco.tipo === 'numerico') {
        if (bloco.modelo.includes('titulo')) {
            const tituloWrapper = document.createElement('div');
            tituloWrapper.className = 'bloco-titulo-wrapper';
            tituloWrapper.style.justifyContent = bloco.alignTitulo; 
            
            if (bloco.larguraTitulo) {
                tituloWrapper.style.width = bloco.larguraTitulo + 'px';
                tituloWrapper.style.maxWidth = 'none';
            }

            const inputTitulo = document.createElement('input');
            inputTitulo.type = 'text';
            inputTitulo.className = 'bloco-titulo-input';
            inputTitulo.placeholder = 'Título';
            inputTitulo.value = bloco.tituloBloco || '';
            inputTitulo.style.textAlign = bloco.alignTitulo;
            
            const editavelNoModoJogador = bloco.modelo.includes('editavel');
            inputTitulo.readOnly = !editavelNoModoJogador && !estaEmModoEdicao();

            inputTitulo.addEventListener('input', (e) => {
                bloco.tituloBloco = e.target.value;
            });
            
            tituloWrapper.addEventListener('pointerdown', (e) => {
                if (!estaEmModoEdicao()) return;
                const rect = tituloWrapper.getBoundingClientRect();
                const isBordaDireita = (e.clientX >= rect.right - 8);
                
                if (isBordaDireita) {
                    e.preventDefault();
                    e.stopPropagation();
                    const startX = e.clientX;
                    const startWidth = tituloWrapper.offsetWidth;
                    
                    const onMove = (ev) => {
                        const folha = document.querySelector('#pagina-ficha-nova .folha');
                        if (!folha) return;
                        const zoomAtual = parseFloat(folha.style.zoom || '1') || 1;
                        let novaLargura = startWidth + (ev.clientX - startX) / zoomAtual;
                        if (novaLargura < 150) novaLargura = 150;
                        if (novaLargura > el.offsetWidth) novaLargura = el.offsetWidth;

                        tituloWrapper.style.width = novaLargura + 'px';
                        tituloWrapper.style.maxWidth = 'none';
                        bloco.larguraTitulo = Math.round(novaLargura);
                    };

                    const onUp = () => {
                        document.removeEventListener('pointermove', onMove);
                        document.removeEventListener('pointerup', onUp);
                        salvarEstado();
                    };
                    document.addEventListener('pointermove', onMove);
                    document.addEventListener('pointerup', onUp);
                }
            });

            tituloWrapper.appendChild(inputTitulo);
            el.appendChild(tituloWrapper);
        }
    }

    // --- CONTEÚDO ---
    const conteudoInterno = document.createElement('div');
    conteudoInterno.className = 'bloco-interno';

    if (bloco.tipo === 'textual') {
        const textarea = document.createElement('textarea');
        textarea.className = 'bloco-textarea';
        textarea.value = bloco.texto || '';
        textarea.placeholder = 'Escreva aqui...';
        textarea.style.textAlign = bloco.alignConteudo;
        
        textarea.addEventListener('input', (e) => {
            bloco.texto = e.target.value;
        });

        textarea.addEventListener('change', () => {
            salvarEstado();
        });
        
        textarea.addEventListener('pointerdown', (e) => {
            const isExpansivel = bloco.modelo && bloco.modelo.includes('expansivel');
            if (isExpansivel) {
                const rect = textarea.getBoundingClientRect();
                const isAlcaInferior = (e.clientY >= rect.bottom - 15);
                
                if (isAlcaInferior) {
                    e.preventDefault();
                    e.stopPropagation();
                    const startY = e.clientY;
                    const startHeight = el.offsetHeight;
                    
                    const onMove = (ev) => {
                        const folha = document.querySelector('#pagina-ficha-nova .folha');
                        if (!folha) return;
                        const zoomAtual = parseFloat(folha.style.zoom || '1') || 1;
                        let novaAltura = startHeight + (ev.clientY - startY) / zoomAtual;
                        if (novaAltura < BLOCO_ALT_MIN) novaAltura = BLOCO_ALT_MIN;
                        
                        el.style.height = novaAltura + 'px';
                        bloco.altura = Math.round(novaAltura);
                    };
                    
                    const onUp = () => {
                        document.removeEventListener('pointermove', onMove);
                        document.removeEventListener('pointerup', onUp);
                        salvarEstado();
                    };
                    document.addEventListener('pointermove', onMove);
                    document.addEventListener('pointerup', onUp);
                    return; 
                }
            }
        });

        conteudoInterno.appendChild(textarea);

    } else if (bloco.tipo === 'numerico') {
        const numWrapper = document.createElement('div');
        numWrapper.className = 'bloco-numerico-wrapper';
        numWrapper.style.justifyContent = bloco.alignConteudo; 
        numWrapper.style.flexDirection = bloco.modPosicao === 'embaixo' ? 'column' : 'row';

        const inputNum = document.createElement('input');
        inputNum.type = 'number';
        inputNum.className = 'bloco-input-numerico';
        
        const atualizarValorCalculado = () => {
            if (bloco.formula && bloco.formula.length > 0) {
                const resultado = calcularFormula(bloco.formula);
                inputNum.value = (resultado === '' || resultado === 'Erro') ? 0 : resultado;
                inputNum.readOnly = true;
                inputNum.style.background = 'rgba(0,0,0,0.05)';
                inputNum.title = "Valor calculado automaticamente";
            } else {
                inputNum.value = bloco.valorNumerico || '';
                inputNum.readOnly = !estaEmModoEdicao();
                inputNum.style.background = 'transparent';
                inputNum.title = "";
            }
        };

        atualizarValorCalculado();

        const modDisplay = document.createElement('div');
        modDisplay.className = 'bloco-modificador-display';

        const calcularModificador = () => {
            if (bloco.modTipo !== 'com') {
                modDisplay.style.display = 'none';
                return;
            }
            modDisplay.style.display = 'flex';

            const val = parseInt(inputNum.value) || 0;
            const medio = parseInt(bloco.modMedio) || 10;
            const cada = parseInt(bloco.modCada) || 2;
            const bonus = parseInt(bloco.modBonus) || 1;

            const diferenca = val - medio;
            const mod = Math.floor(diferenca / cada) * bonus;

            const sinal = mod > 0 ? '+' : '';
            modDisplay.textContent = `${sinal}${mod}`;
            modDisplay.style.color = mod > 0 ? '#2e7d32' : (mod < 0 ? '#c62828' : '#6b4f1d');
        };

        inputNum.addEventListener('change', (e) => {
            if (bloco.formula && bloco.formula.length > 0) return;
            bloco.valorNumerico = e.target.value;
            calcularModificador();
            salvarEstado();
            if (typeof formulaEventBus !== 'undefined') {
                formulaEventBus.dispatchEvent(new Event('formulaAtualizada'));
            }
        });

        inputNum.addEventListener('input', (e) => {
            if (bloco.formula && bloco.formula.length > 0) return;
            calcularModificador();
        });

        inputNum.addEventListener('pointerdown', (e) => {
            e.stopPropagation(); 
        });

        if (typeof formulaEventBus !== 'undefined') {
            formulaEventBus.addEventListener('formulaAtualizada', () => {
                if (document.body.contains(el)) {
                    atualizarValorCalculado();
                    calcularModificador();
                }
            });
        }

        numWrapper.appendChild(inputNum);
        numWrapper.appendChild(modDisplay);
        conteudoInterno.appendChild(numWrapper);

        setTimeout(calcularModificador, 0);

    } else if (bloco.tipo === 'imagem') {
        const img = document.createElement('img');
        img.className = 'bloco-imagem';
        img.src = bloco.urlImagem || '';
        img.alt = 'Imagem';
        if (!bloco.urlImagem) img.style.display = 'none';
        conteudoInterno.appendChild(img);
    }

    el.appendChild(conteudoInterno);

    // --- RODAPÉ (Footer com Botões) ---
    const footer = document.createElement('div');
    footer.className = 'bloco-footer';

    const btnCopiar = document.createElement('button');
    btnCopiar.className = 'bloco-btn-acao bloco-copiar';
    btnCopiar.title = 'Copiar Bloco';
    btnCopiar.innerHTML = '<i class="fas fa-copy"></i>';
    btnCopiar.addEventListener('pointerdown', (e) => e.stopPropagation());
    btnCopiar.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!estaEmModoEdicao()) return;
        
        // CORREÇÃO: Mutando as propriedades do objeto importado
        areaTransferenciaCodex.tipo = 'bloco';
        areaTransferenciaCodex.dados = JSON.parse(JSON.stringify(bloco));
        alert("Bloco copiado! Selecione o campo de destino e aperte Ctrl+V.");
    });

    const btnExcluir = document.createElement('button');
    btnExcluir.className = 'bloco-btn-acao bloco-excluir';
    btnExcluir.title = 'Excluir Bloco';
    btnExcluir.innerHTML = '<i class="fas fa-trash-alt"></i>';
    btnExcluir.addEventListener('pointerdown', (e) => e.stopPropagation());
    btnExcluir.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!estaEmModoEdicao()) return;
        excluirBloco(painelPaiId, bloco.id, renderizarPaineisCallback);
    });

    const btnEngrenagem = document.createElement('button');
    btnEngrenagem.className = 'bloco-btn-acao bloco-engrenagem';
    btnEngrenagem.title = 'Configurar Bloco';
    btnEngrenagem.innerHTML = '<i class="fas fa-cog"></i>';
    btnEngrenagem.addEventListener('pointerdown', (e) => e.stopPropagation());
    btnEngrenagem.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!estaEmModoEdicao()) return;
        window.abrirBottomSheetBloco(painelPaiId, bloco.id);
    });

    footer.appendChild(btnCopiar);
    footer.appendChild(btnExcluir);
    footer.appendChild(btnEngrenagem);
    el.appendChild(footer);

    // --- ARRASTAR ---
    el.addEventListener('pointerdown', (e) => {
        if (!estaEmModoEdicao()) {
            if (!bloco.modelo || !bloco.modelo.includes('expansivel')) return;
        }
        
        if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT' || e.target.classList.contains('bloco-titulo-input')) {
            return;
        }

        if (e.target.classList.contains('bloco-borda') || e.target.closest('.bloco-btn-acao')) {
            return;
        }

        iniciarArrastoBloco(e, bloco, painelPaiId);
    });

    // --- BORDAS ---
    ['topo', 'base', 'esq', 'dir'].forEach(lado => {
        const borda = document.createElement('div');
        borda.className = `bloco-borda bloco-borda-${lado}`;
        borda.dataset.lado = lado;
        
        borda.addEventListener('pointerdown', (e) => {
            const isExpansivel = bloco.modelo && bloco.modelo.includes('expansivel');
            if (!estaEmModoEdicao() && !isExpansivel) return;
            if (bloco.modelo && bloco.modelo.includes('titulo') && isExpansivel && !estaEmModoEdicao()) {
                if (lado === 'topo' || lado === 'esq') return;
            }
            iniciarResizeBloco(e, bloco, lado, painelPaiId);
        });
        el.appendChild(borda);
    });

    return el;
}

/* ---------- EXCLUSÃO DE BLOCO ---------- */

function excluirBloco(painelPaiId, blocoId, renderizarPaineisCallback) {
    const pag = estado.paginas.find(p => p.id === estado.paginaAtivaId);
    if (!pag) return;
    const painel = pag.paineis.find(p => p.id === painelPaiId);
    if (!painel || !painel.blocos) return;

    const bloco = painel.blocos.find(b => b.id === blocoId);
    if (!bloco) return;

    const nome = bloco.tituloBloco || bloco.texto || '(sem título)';
    const label = nome.length > 30 ? nome.slice(0, 30) + '…' : nome;
    if (!confirm(`Excluir o bloco "${label}"?`)) return;

    if (blocoSendoEditadoId === blocoId) {
        blocoSendoEditadoId = null;
        painelPaiIdTemp = null;
        document.querySelector('#bloco-settings-sheet')?.classList.remove('active');
    }

    painel.blocos = painel.blocos.filter(b => b.id !== blocoId);
    salvarEstado();
    if (renderizarPaineisCallback) renderizarPaineisCallback();
    if (typeof formulaEventBus !== 'undefined') formulaEventBus.dispatchEvent(new Event('formulaAtualizada'));
}

export function configurarSheetBloco(renderizarPaineisCallback) {
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
        sheet.style.left = `${initialX + (e.clientX - startX)}px`; sheet.style.top = `${initialY + (e.clientY - startY)}px`;
        sheet.style.bottom = 'auto'; sheet.style.right = 'auto';
    };
    const onPointerUp = (e) => {
        if (!isDragging) return;
        isDragging = false; sheet.style.transition = 'transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, visibility 0.3s ease';
        sheet.releasePointerCapture(e.pointerId);
    };

    if (dragHandle) {
        dragHandle.addEventListener('pointerdown', onPointerDown);
        sheet.addEventListener('pointermove', onPointerMove); sheet.addEventListener('pointerup', onPointerUp);
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
            const pag = estado.paginas.find(p => p.id === estado.paginaAtivaId);
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
                const pag = estado.paginas.find(p => p.id === estado.paginaAtivaId);
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
        
        const pag = estado.paginas.find(p => p.id === estado.paginaAtivaId);
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

    window.abrirBottomSheetBloco = (painelId, blocoId) => {
        const pag = estado.paginas.find(p => p.id === estado.paginaAtivaId);
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

        if (!sheet.style.left) {
            sheet.style.left = 'auto'; sheet.style.top = 'auto'; 
            sheet.style.right = '2rem'; sheet.style.bottom = '2rem';
        }
        
        sheet.classList.add('active');
    };

    function salvarConfiguracoes() {
        const pag = estado.paginas.find(p => p.id === estado.paginaAtivaId);
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

/* ---------- ARRASTO E RESIZE (BLOCO) ---------- */

function iniciarArrastoBloco(e, bloco, painelPaiId) {
    e.preventDefault();
    const pag = estado.paginas.find(p => p.id === estado.paginaAtivaId);
    if (!pag) return;
    const painel = pag.paineis.find(p => p.id === painelPaiId);
    if (!painel) return;
    
    const elBloco = document.querySelector(`.painel[data-painel-id="${painelPaiId}"] .bloco[data-bloco-id="${bloco.id}"]`);
    const elArea = document.querySelector(`.painel[data-painel-id="${painelPaiId}"] .painel-conteudo`);
    if (!elBloco || !elArea) return;

    const folha = document.querySelector('#pagina-ficha-nova .folha');
    if (!folha) return;
    const zoomAtual = parseFloat(folha.style.zoom || '1') || 1;
    const startX = e.clientX, startY = e.clientY, origX = bloco.x, origY = bloco.y;

    const onMove = (ev) => {
        let novoX = origX + (ev.clientX - startX) / zoomAtual;
        let novoY = origY + (ev.clientY - startY) / zoomAtual;
        const maxX = elArea.clientWidth - bloco.largura - 10, maxY = elArea.clientHeight - bloco.altura - 10;
        
        if (novoX < 10) novoX = 10; if (novoY < 10) novoY = 10;
        if (novoX > maxX) novoX = maxX; if (novoY > maxY) novoY = maxY;

        if (estado.modoLayout === 'grid') {
            novoX = Math.round(novoX / GRID) * GRID; novoY = Math.round(novoY / GRID) * GRID;
            const outro = painel.blocos.find(b => b.id !== bloco.id && !(novoX + bloco.largura <= b.x || novoX >= b.x + b.largura || novoY + bloco.altura <= b.y || novoY >= b.y + b.altura));
            if (outro) {
                outro.x = origX; outro.y = origY;
                const elOutro = document.querySelector(`.painel[data-painel-id="${painelPaiId}"] .bloco[data-bloco-id="${outro.id}"]`);
                if (elOutro) { elOutro.style.left = outro.x + 'px'; elOutro.style.top = outro.y + 'px'; }
            }
        }
        bloco.x = novoX; bloco.y = novoY;
        elBloco.style.left = novoX + 'px'; elBloco.style.top = novoY + 'px';
    };
    const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        salvarEstado();
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
}

function iniciarResizeBloco(e, bloco, lado, painelPaiId) {
    e.preventDefault(); e.stopPropagation();
    const pag = estado.paginas.find(p => p.id === estado.paginaAtivaId);
    if (!pag) return;
    const painel = pag.paineis.find(p => p.id === painelPaiId);
    if (!painel) return;
    const elBloco = document.querySelector(`.painel[data-painel-id="${painelPaiId}"] .bloco[data-bloco-id="${bloco.id}"]`);
    const elArea = document.querySelector(`.painel[data-painel-id="${painelPaiId}"] .painel-conteudo`);
    if (!elBloco || !elArea) return;

    const folha = document.querySelector('#pagina-ficha-nova .folha');
    if (!folha) return;
    const zoomAtual = parseFloat(folha.style.zoom || '1') || 1;
    const startX = e.clientX, startY = e.clientY;
    const orig = { x: bloco.x, y: bloco.y, largura: bloco.largura, altura: bloco.altura };

    let minLargura = BLOCO_LARG_MIN;
    if (bloco.tipo === 'numerico') {
        minLargura = bloco.modTipo === 'com' ? 140 : 80;
    }

    const onMove = (ev) => {
        const dx = (ev.clientX - startX) / zoomAtual, dy = (ev.clientY - startY) / zoomAtual;
        let { x, y, largura, altura } = orig;
        if (lado === 'dir') largura = orig.largura + dx;
        if (lado === 'esq') { largura = orig.largura - dx; x = orig.x + dx; }
        if (lado === 'base') altura = orig.altura + dy;
        if (lado === 'topo') { altura = orig.altura - dy; y = orig.y + dy; }

        if (largura < minLargura) { if (lado === 'esq') x = orig.x + (orig.largura - minLargura); largura = minLargura; }
        if (altura < BLOCO_ALT_MIN) { if (lado === 'topo') y = orig.y + (orig.altura - BLOCO_ALT_MIN); altura = BLOCO_ALT_MIN; }

        if (x < 10) { largura += x - 10; x = 10; }
        if (y < 10) { altura += y - 10; y = 10; }
        if (x + largura > elArea.clientWidth - 10) largura = elArea.clientWidth - 10 - x;
        if (y + altura > elArea.clientHeight - 10) altura = elArea.clientHeight - 10 - y;

        bloco.x = x; bloco.y = y; bloco.largura = largura; bloco.altura = altura;
        elBloco.style.left = x + 'px'; elBloco.style.top = y + 'px'; 
        elBloco.style.width = largura + 'px'; elBloco.style.height = altura + 'px';
    };
    const onUp = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        salvarEstado();
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
}