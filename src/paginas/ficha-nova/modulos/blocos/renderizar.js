/* ============================================================
   MÓDULO: RENDERIZAR BLOCO (Ficha Nova)
   ============================================================ */

import { 
    estaEmModoEdicao, salvarEstado, setElementoSelecionado
} from '../paginas/index.js';
import { calcularFormula, formulaEventBus } from '../automacao.js';
import { iniciarArrastoBloco, iniciarResizeBloco } from './interacoes.js';
import { adicionarIndicadorDescricao } from '../descricao.js';

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

    // --- ALÇA DE ARRASTO ---
    const alcaArrasto = document.createElement('div');
    alcaArrasto.className = 'bloco-alca-arrasto';
    alcaArrasto.innerHTML = '<i class="fas fa-grip-vertical"></i>';
    alcaArrasto.title = 'Arraste para mover o bloco';
    
    // O ARRASTO AGORA É FEITO DIRETAMENTE NA ALÇA (corrige o bug)
    alcaArrasto.addEventListener('pointerdown', (e) => {
        if (!estaEmModoEdicao()) return;
        e.preventDefault();
        e.stopPropagation();
        setElementoSelecionado('bloco', painelPaiId, bloco.id);
        iniciarArrastoBloco(e, bloco, painelPaiId);
    });
    
    el.appendChild(alcaArrasto);

    // --- TÍTULO ---
    if ((bloco.tipo === 'textual' || bloco.tipo === 'numerico') && bloco.modelo.includes('titulo')) {
        el.appendChild(criarTituloWrapper(bloco, painelPaiId));
    } else {
        adicionarIndicadorDescricao(el, bloco.descricao);
    }

    // --- CONTEÚDO ---
    const conteudoInterno = document.createElement('div');
    conteudoInterno.className = 'bloco-interno';

    if (bloco.tipo === 'textual') conteudoInterno.appendChild(criarConteudoTextual(bloco, el));
    else if (bloco.tipo === 'numerico') {
        conteudoInterno.classList.add('bloco-interno-numerico');
        conteudoInterno.appendChild(criarConteudoNumerico(bloco, el));
    }
    else if (bloco.tipo === 'imagem') conteudoInterno.appendChild(criarConteudoImagem(bloco, painelPaiId));

    el.appendChild(conteudoInterno);

    // --- SELECIONAR AO CLICAR (NO MODO EDIÇÃO) ---
    el.addEventListener('pointerdown', (e) => {
        if (!estaEmModoEdicao()) return;
        
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            setElementoSelecionado('bloco', painelPaiId, bloco.id);
            return;
        }

        if (e.target.classList.contains('bloco-borda')) return;
        if (e.target.closest('.bloco-img-engrenagem-btn')) return;
        if (e.target.classList.contains('bloco-titulo-input')) return;
        if (e.target.closest('.bloco-alca-arrasto')) return; // A alça já lida com o arrasto

        e.stopPropagation(); 
        setElementoSelecionado('bloco', painelPaiId, bloco.id);
    });

    // --- BORDAS DE RESIZE ---
    ['topo', 'base', 'esq', 'dir'].forEach(lado => {
        const borda = document.createElement('div');
        borda.className = `bloco-borda bloco-borda-${lado}`;
        borda.dataset.lado = lado;
        
        if (isExpansivel) {
            borda.classList.add('borda-expansivel');
        }
        
        borda.addEventListener('pointerdown', (e) => {
            if (!estaEmModoEdicao() && !isExpansivel) return;
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
function criarTituloWrapper(bloco, painelPaiId) {
    const tituloWrapper = document.createElement('div');
    tituloWrapper.className = 'bloco-titulo-wrapper';
    tituloWrapper.style.justifyContent = bloco.alignTitulo; 
    
    if (bloco.larguraTitulo) {
        tituloWrapper.style.width = bloco.larguraTitulo + 'px';
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

    const medidor = document.createElement('span');
    medidor.className = 'bloco-titulo-medidor';
    medidor.setAttribute('aria-hidden', 'true');
    medidor.textContent = inputTitulo.value || inputTitulo.placeholder;
    tituloWrapper.appendChild(medidor);

    inputTitulo.addEventListener('input', (e) => {
        bloco.tituloBloco = e.target.value;
        medidor.textContent = inputTitulo.value || inputTitulo.placeholder;
        salvarEstado(estaEmModoEdicao() ? { tituloModelo: bloco.id } : { preenchimento: true });
    });
    
    tituloWrapper.appendChild(inputTitulo);
    adicionarIndicadorDescricao(tituloWrapper, bloco.descricao);
    if (estaEmModoEdicao()) {
        const alca = document.createElement('span');
        alca.className = 'bloco-titulo-alca';
        alca.title = 'Arraste para ajustar a largura do título';
        alca.setAttribute('aria-hidden', 'true');
        tituloWrapper.appendChild(alca);

        let arrasto;
        alca.addEventListener('pointerdown', evento => {
            if (evento.button !== 0 || arrasto || !estaEmModoEdicao()) return;
            evento.preventDefault();
            evento.stopPropagation();
            setElementoSelecionado('bloco', painelPaiId, bloco.id);
            const zoom = parseFloat(alca.closest('.folha')?.style.zoom) || 1;
            const estiloAba = getComputedStyle(tituloWrapper);
            const margem = ['paddingLeft', 'paddingRight', 'borderLeftWidth', 'borderRightWidth']
                .reduce((total, propriedade) => total + parseFloat(estiloAba[propriedade]), 0);
            const minimo = Math.ceil(medidor.getBoundingClientRect().width / zoom + margem);
            arrasto = {
                ponteiro: evento.pointerId, inicio: evento.clientX, zoom, minimo,
                largura: parseFloat(estiloAba.width), alterou: false
            };
            alca.setPointerCapture(evento.pointerId);
        });
        alca.addEventListener('pointermove', evento => {
            if (arrasto?.ponteiro !== evento.pointerId) return;
            const delta = (evento.clientX - arrasto.inicio) / arrasto.zoom;
            if (!arrasto.alterou && !delta) return;
            const maximo = alca.closest('.bloco').clientWidth;
            const largura = Math.min(maximo, Math.max(arrasto.minimo, Math.round(arrasto.largura + delta)));
            if (!arrasto.alterou && largura === arrasto.largura) return;
            arrasto.alterou = true;
            bloco.larguraTitulo = largura;
            tituloWrapper.style.width = largura + 'px';
        });
        alca.addEventListener('lostpointercapture', () => {
            if (arrasto?.alterou) salvarEstado();
            arrasto = null;
        });
    }
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
    
    function gravarTexto() {
        if (estaEmModoEdicao() || bloco.texto === textarea.value) return;
        bloco.texto = textarea.value;
        salvarEstado({ preenchimento: true });
    }
    textarea.addEventListener('input', gravarTexto);
    textarea.addEventListener('change', gravarTexto);
    
    return textarea;
}

/* --- CONTEÚDO NUMÉRICO --- */
function criarConteudoNumerico(bloco, el) {
    const numWrapper = document.createElement('div');
    numWrapper.className = 'bloco-numerico-wrapper';
    numWrapper.classList.toggle('com-modificador', bloco.modTipo === 'com');
    if (bloco.modPosicao === 'embaixo') {
        numWrapper.classList.add('modificador-embaixo');
        numWrapper.style.alignItems = bloco.alignConteudo;
    } else {
        numWrapper.style.justifyContent = bloco.alignConteudo;
    }

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

    function gravarNumero() {
        if (temFormula || estaEmModoEdicao()) return;
        if (bloco.valorNumerico === inputNum.value) return;
        bloco.valorNumerico = inputNum.value;
        calcularModificador();
        salvarEstado({ preenchimento: true });
        formulaEventBus.dispatchEvent(new Event('formulaAtualizada'));
    }
    inputNum.addEventListener('input', gravarNumero);
    inputNum.addEventListener('change', gravarNumero);

    inputNum.addEventListener('pointerdown', (e) => e.stopPropagation(), { capture: true });
    inputNum.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!inputNum.readOnly) inputNum.focus();
    }, { capture: true });

    if (typeof formulaEventBus !== 'undefined') {
        formulaEventBus.addEventListener('formulaAtualizada', () => {
            if (document.body.contains(el) && temFormula) { atualizarValorCalculado(); calcularModificador(); }
        });
    }

    numWrapper.appendChild(inputNum);
    numWrapper.appendChild(modDisplay);
    setTimeout(calcularModificador, 0);
    return numWrapper;
}

/* --- CONTEÚDO IMAGEM (APENAS VISUAL) --- */
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
    imgWrapper.style.pointerEvents = 'none';

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
    img.style.pointerEvents = 'none';
    img.style.userSelect = 'none';
    img.style.transition = 'transform 0.15s ease-out';
    aplicarTransform();

    const btnEngrenagemImg = document.createElement('button');
    btnEngrenagemImg.className = 'bloco-img-engrenagem-btn';
    btnEngrenagemImg.innerHTML = '<i class="fas fa-cog"></i>';
    btnEngrenagemImg.title = 'Configurar Imagem';
    btnEngrenagemImg.style.pointerEvents = 'auto';
    btnEngrenagemImg.addEventListener('pointerdown', (e) => e.stopPropagation());
    btnEngrenagemImg.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.abrirBottomSheetBloco) {
            window.abrirBottomSheetBloco(painelPaiId, bloco.id, false);
        }
    });

    if (!bloco.urlImagem) img.style.display = 'none';
    
    imgWrapper.appendChild(img);
    imgWrapper.appendChild(btnEngrenagemImg);
    return imgWrapper;
}
