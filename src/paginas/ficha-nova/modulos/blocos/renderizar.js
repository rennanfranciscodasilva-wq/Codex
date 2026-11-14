/* ============================================================
   MÓDULO: RENDERIZAR BLOCO (Ficha Nova)
   ============================================================ */

import { 
    estaEmModoEdicao, salvarEstado, areaTransferenciaCodex, setElementoSelecionado
} from '../paginas/index.js';
import { calcularFormula, formulaEventBus } from '../automacao.js';
import { iniciarArrastoBloco, iniciarResizeBloco } from './interacoes.js';

const BLOCO_ALT_MIN = 40;

export function renderizarBloco(bloco, painelPaiId, renderizarPaineisCallback) {
    const el = document.createElement('div');
    el.className = 'bloco';
    el.dataset.blocoId = bloco.id;
    el.style.left = bloco.x + 'px'; el.style.top = bloco.y + 'px';
    el.style.width = bloco.largura + 'px'; el.style.height = bloco.altura + 'px';

    if (!bloco.tipo) bloco.tipo = 'textual';
    if (!bloco.modelo) bloco.modelo = 'padrao';
    if (!bloco.alignTitulo) bloco.alignTitulo = 'left';
    if (!bloco.alignConteudo) bloco.alignConteudo = 'left';

    const isExpansivel = bloco.modelo && bloco.modelo.includes('expansivel');
    if (bloco.tipo === 'textual' && isExpansivel) {
        el.classList.add('expansivel');
    }

    // --- ALÇA DE ARRASTO (VISUAL) ---
    const alcaArrasto = document.createElement('div');
    alcaArrasto.className = 'bloco-alca-arrasto';
    alcaArrasto.innerHTML = '<i class="fas fa-grip-vertical"></i>';
    alcaArrasto.title = 'Arraste para mover';
    el.appendChild(alcaArrasto);

    // --- TÍTULO ---
    if ((bloco.tipo === 'textual' || bloco.tipo === 'numerico') && bloco.modelo.includes('titulo')) {
        el.appendChild(criarTituloWrapper(bloco, el));
    }

    // --- CONTEÚDO ---
    const conteudoInterno = document.createElement('div');
    conteudoInterno.className = 'bloco-interno';

    if (bloco.tipo === 'textual') conteudoInterno.appendChild(criarConteudoTextual(bloco, el));
    else if (bloco.tipo === 'numerico') conteudoInterno.appendChild(criarConteudoNumerico(bloco, el));
    else if (bloco.tipo === 'imagem') conteudoInterno.appendChild(criarConteudoImagem(bloco, painelPaiId));

    el.appendChild(conteudoInterno);

    // --- ARRASTAR E SELECIONAR ---
    el.addEventListener('pointerdown', (e) => {
        if (!estaEmModoEdicao()) return;
        
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            setElementoSelecionado('bloco', painelPaiId, bloco.id);
            return;
        }

        if (e.target.classList.contains('bloco-borda')) return;
        if (e.target.closest('.bloco-img-zoom-btn') || e.target.closest('.bloco-img-engrenagem-btn')) return;
        if (e.target.classList.contains('bloco-titulo-input')) return;

        e.stopPropagation(); 
        e.preventDefault(); 
        
        setElementoSelecionado('bloco', painelPaiId, bloco.id);
        iniciarArrastoBloco(e, bloco, painelPaiId);
    });

    // --- BORDAS ---
    ['topo', 'base', 'esq', 'dir'].forEach(lado => {
        const borda = document.createElement('div');
        borda.className = `bloco-borda bloco-borda-${lado}`;
        borda.dataset.lado = lado;
        
        // Adiciona a classe que permite visualizar no modo jogador se for expansível
        if (isExpansivel) {
            borda.classList.add('borda-expansivel');
        }
        
        borda.addEventListener('pointerdown', (e) => {
            // Se NÃO estiver no modo edição E NÃO for expansível, cancela o resize
            if (!estaEmModoEdicao() && !isExpansivel) return;
            
            // Se estiver no modo jogador e for expansível, só permite redimensionar pela base ou topo
            if (!estaEmModoEdicao() && isExpansivel) {
                if (lado === 'esq' || lado === 'dir') return;
            }
            
            e.stopPropagation();
            setElementoSelecionado('bloco', painelPaiId, bloco.id);
            iniciarResizeBloco(e, bloco, lado, painelPaiId);
        });
        el.appendChild(borda);
    });

    return el;
}

/* --- CRIAR TÍTULO --- */
function criarTituloWrapper(bloco, el) {
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
    
    if (estaEmModoEdicao()) {
        inputTitulo.readOnly = false;
        inputTitulo.style.cursor = 'text';
    } else {
        inputTitulo.readOnly = !editavelNoModoJogador;
        inputTitulo.style.cursor = inputTitulo.readOnly ? 'default' : 'text';
    }

    inputTitulo.addEventListener('input', (e) => {
        bloco.tituloBloco = e.target.value;
        salvarEstado();
    });
    
    tituloWrapper.appendChild(inputTitulo);
    return tituloWrapper;
}

/* --- CONTEÚDO TEXTUAL --- */
function criarConteudoTextual(bloco, el) {
    const textarea = document.createElement('textarea');
    textarea.className = 'bloco-textarea';
    textarea.value = bloco.texto || '';
    textarea.placeholder = 'Escreva aqui...';
    textarea.style.textAlign = bloco.alignConteudo;
    
    textarea.readOnly = estaEmModoEdicao();
    if (estaEmModoEdicao()) {
        textarea.style.cursor = 'default';
        textarea.style.userSelect = 'none';
    } else {
        textarea.style.cursor = 'text';
    }
    
    textarea.addEventListener('input', (e) => {
        if (estaEmModoEdicao()) return;
        bloco.texto = e.target.value;
    });

    textarea.addEventListener('change', () => {
        if (estaEmModoEdicao()) return;
        salvarEstado();
    });
    
    return textarea;
}

/* --- CONTEÚDO NUMÉRICO --- */
function criarConteudoNumerico(bloco, el) {
    const numWrapper = document.createElement('div');
    numWrapper.className = 'bloco-numerico-wrapper';
    numWrapper.style.justifyContent = bloco.alignConteudo; 
    numWrapper.style.flexDirection = bloco.modPosicao === 'embaixo' ? 'column' : 'row';

    numWrapper.addEventListener('pointerdown', (e) => e.stopPropagation(), { capture: true });

    const inputNum = document.createElement('input');
    inputNum.type = 'number';
    inputNum.className = 'bloco-input-numerico';
    inputNum.style.pointerEvents = 'auto';
    inputNum.style.cursor = 'text';
    inputNum.style.zIndex = '99999';
    inputNum.style.userSelect = 'text';
    inputNum.style.position = 'relative';

    const temFormula = bloco.formula && bloco.formula.length > 0;
    
    if (temFormula || estaEmModoEdicao()) {
        inputNum.readOnly = true;
        inputNum.style.background = 'rgba(0,0,0,0.05)';
        inputNum.style.cursor = 'default';
    } else {
        inputNum.readOnly = false;
        inputNum.style.background = 'transparent';
        inputNum.style.cursor = 'text';
    }
    
    const atualizarValorCalculado = () => {
        if (temFormula) {
            const resultado = calcularFormula(bloco.formula);
            inputNum.value = (resultado === '' || resultado === 'Erro') ? 0 : resultado;
        } else {
            inputNum.value = bloco.valorNumerico || '';
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
        const mod = Math.floor((val - medio) / cada) * bonus;
        modDisplay.textContent = `${mod > 0 ? '+' : ''}${mod}`;
        modDisplay.style.color = mod > 0 ? '#2e7d32' : (mod < 0 ? '#c62828' : '#6b4f1d');
    };

    inputNum.addEventListener('change', (e) => {
        if (temFormula || estaEmModoEdicao()) return;
        bloco.valorNumerico = e.target.value;
        calcularModificador();
        salvarEstado();
        if (typeof formulaEventBus !== 'undefined') formulaEventBus.dispatchEvent(new Event('formulaAtualizada'));
    });

    inputNum.addEventListener('input', () => {
        if (temFormula || estaEmModoEdicao()) return;
        calcularModificador();
    });

    inputNum.addEventListener('pointerdown', (e) => e.stopPropagation(), { capture: true });
    inputNum.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!inputNum.readOnly) inputNum.focus();
    }, { capture: true });

    if (typeof formulaEventBus !== 'undefined') {
        formulaEventBus.addEventListener('formulaAtualizada', () => {
            if (document.body.contains(el)) { atualizarValorCalculado(); calcularModificador(); }
        });
    }

    numWrapper.appendChild(inputNum);
    numWrapper.appendChild(modDisplay);
    setTimeout(calcularModificador, 0);
    return numWrapper;
}

/* --- CONTEÚDO IMAGEM --- */
function criarConteudoImagem(bloco, painelPaiId) {
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'bloco-imagem-wrapper';
    imgWrapper.style.width = '100%';
    imgWrapper.style.height = '100%';
    imgWrapper.style.overflow = 'hidden';
    imgWrapper.style.position = 'relative';
    imgWrapper.style.display = 'flex';
    imgWrapper.style.alignItems = 'center';
    imgWrapper.style.justifyContent = 'center';
    imgWrapper.style.pointerEvents = 'auto';

    const img = document.createElement('img');
    img.className = 'bloco-imagem';
    img.src = bloco.urlImagem || '';
    img.alt = 'Imagem';
    img.draggable = false;
    
    if (!bloco.imgZoom) bloco.imgZoom = 1;
    if (!bloco.imgX) bloco.imgX = 0;
    if (!bloco.imgY) bloco.imgY = 0;

    const aplicarTransform = () => {
        img.style.transform = `scale(${bloco.imgZoom}) translate(${bloco.imgX}px, ${bloco.imgY}px)`;
    };

    img.style.maxWidth = 'none';
    img.style.cursor = estaEmModoEdicao() ? 'grab' : 'move';
    img.style.transition = 'transform 0.15s ease-out';
    aplicarTransform();

    img.addEventListener('pointerdown', (e) => {
        if (estaEmModoEdicao()) return;
        if (e.button === 2) return;
        e.stopPropagation();

        img.style.cursor = 'grabbing';
        let startX = e.clientX, startY = e.clientY, origX = bloco.imgX, origY = bloco.imgY;

        const onMove = (ev) => {
            const zoom = bloco.imgZoom || 1;
            bloco.imgX = origX + (ev.clientX - startX) / zoom;
            bloco.imgY = origY + (ev.clientY - startY) / zoom;
            aplicarTransform();
        };

        const onUp = () => {
            img.style.cursor = 'move';
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            salvarEstado();
        };

        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    });

    const btnMenos = document.createElement('button');
    btnMenos.className = 'bloco-img-zoom-btn bloco-img-zoom-menos';
    btnMenos.innerHTML = '<i class="fas fa-minus"></i>';
    btnMenos.title = 'Diminuir Zoom';
    btnMenos.addEventListener('pointerdown', (e) => e.stopPropagation());
    btnMenos.addEventListener('click', (e) => {
        e.stopPropagation();
        if (estaEmModoEdicao()) return;
        let novoZoom = (bloco.imgZoom || 1) - 0.1;
        if (novoZoom < 0.1) novoZoom = 0.1;
        bloco.imgZoom = novoZoom;
        aplicarTransform(); salvarEstado();
    });

    const btnMais = document.createElement('button');
    btnMais.className = 'bloco-img-zoom-btn bloco-img-zoom-mais';
    btnMais.innerHTML = '<i class="fas fa-plus"></i>';
    btnMais.title = 'Aumentar Zoom';
    btnMais.addEventListener('pointerdown', (e) => e.stopPropagation());
    btnMais.addEventListener('click', (e) => {
        e.stopPropagation();
        if (estaEmModoEdicao()) return;
        let novoZoom = (bloco.imgZoom || 1) + 0.1;
        if (novoZoom > 5) novoZoom = 5;
        bloco.imgZoom = novoZoom;
        aplicarTransform(); salvarEstado();
    });

    const btnEngrenagemImg = document.createElement('button');
    btnEngrenagemImg.className = 'bloco-img-engrenagem-btn';
    btnEngrenagemImg.innerHTML = '<i class="fas fa-cog"></i>';
    btnEngrenagemImg.title = 'Configurar Imagem';
    btnEngrenagemImg.addEventListener('pointerdown', (e) => e.stopPropagation());
    btnEngrenagemImg.addEventListener('click', (e) => {
        e.stopPropagation();
        window.abrirBottomSheetBloco(painelPaiId, bloco.id, true);
    });

    if (!bloco.urlImagem) img.style.display = 'none';
    
    imgWrapper.appendChild(img);
    imgWrapper.appendChild(btnMenos);
    imgWrapper.appendChild(btnMais);
    imgWrapper.appendChild(btnEngrenagemImg);
    return imgWrapper;
}