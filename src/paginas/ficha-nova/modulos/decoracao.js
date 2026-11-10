/* ============================================================
   MÓDULO: DECORAÇÃO (Colorir e Figuras Geométricas)
   ============================================================ */

import { estado, getPaginaAtiva, estaEmModoEdicao } from './paginas.js';

let corSelecionada = '#d4af37';
let camadaSelecionada = 0.5; 
let figuraSendoEditada = null;
let selectCamadaElement = null;

const FORMAS_DISPONIVEIS = [
    { id: 'circulo', icone: 'fa-circle' },
    { id: 'quadrado', icone: 'fa-square' },
    { id: 'triangulo', icone: 'fa-play', rotate: 270 },
    { id: 'estrela', icone: 'fa-star' },
    { id: 'retangulo', icone: 'fa-square', scale: 'scale-x-150' },
    { id: 'trapezio', icone: 'fa-caret-up', scale: 'scale-x-150' }
];

export function iniciarDecoracao() {
    const sheet = document.querySelector('#decoracao-sheet');
    const btnClose = document.querySelector('#decoracao-close-btn');
    const dragHandle = document.querySelector('#decoracao-header-drag');
    const listaFormas = document.querySelector('#decoracao-formas-grid');
    
    selectCamadaElement = document.querySelector('#decoracao-camada'); 
    
    const pickerWrapper = document.querySelector('#decoracao-picker-wrapper');
    const pickerCursor = document.querySelector('#decoracao-picker-cursor');
    const inputHex = document.querySelector('#decoracao-hex');

    if (!sheet || !listaFormas) return;

    // Arrastar a janela do menu
    let isDragging = false, startX = 0, startY = 0, initialX = 0, initialY = 0;
    if (dragHandle) {
        dragHandle.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button, input, select')) return;
            isDragging = true; startX = e.clientX; startY = e.clientY;
            const rect = sheet.getBoundingClientRect();
            initialX = rect.left; initialY = rect.top;
            sheet.style.transition = 'none'; sheet.setPointerCapture(e.pointerId);
        });
        sheet.addEventListener('pointermove', (e) => {
            if (!isDragging) return;
            sheet.style.left = `${initialX + (e.clientX - startX)}px`;
            sheet.style.top = `${initialY + (e.clientY - startY)}px`;
            sheet.style.bottom = 'auto'; sheet.style.right = 'auto';
        });
        sheet.addEventListener('pointerup', (e) => {
            if (!isDragging) return;
            isDragging = false; sheet.style.transition = 'transform 0.3s, opacity 0.3s, visibility 0.3s';
            sheet.releasePointerCapture(e.pointerId);
        });
    }

    if (btnClose) btnClose.addEventListener('click', () => sheet.classList.remove('active'));

    // --- CÍRCULO CROMÁTICO ---
    if (pickerWrapper && pickerCursor) {
        const atualizarCorDoCursor = (x, y) => {
            const rect = pickerWrapper.getBoundingClientRect();
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            const raio = rect.width / 2;
            
            let finalX = x, finalY = y;
            if (dist > raio) {
                finalX = cx + (dx / dist) * raio;
                finalY = cy + (dy / dist) * raio;
            }

            pickerCursor.style.left = `${finalX}px`;
            pickerCursor.style.top = `${finalY}px`;

            let angulo = Math.atan2(dy, dx) * (180 / Math.PI);
            if (angulo < 0) angulo += 360;
            const matiz = angulo; 
            const saturacao = (dist > raio ? 1 : dist / raio) * 100; 
            const luminosidade = 50; 

            const hex = hslParaHex(matiz, saturacao, luminosidade);
            corSelecionada = hex;
            if (inputHex) inputHex.value = hex;
            
            aplicarCorNaSelecao();
        };

        pickerWrapper.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            const rect = pickerWrapper.getBoundingClientRect();
            atualizarCorDoCursor(e.clientX - rect.left, e.clientY - rect.top);
            
            const onMove = (ev) => atualizarCorDoCursor(ev.clientX - rect.left, ev.clientY - rect.top);
            const onUp = () => {
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
            };
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        });
    }

    // --- CONTROLE DE CAMADAS ---
    if (selectCamadaElement) {
        selectCamadaElement.addEventListener('change', (e) => {
            camadaSelecionada = parseFloat(e.target.value);
            
            if (figuraSendoEditada) {
                const pag = getPaginaAtiva();
                const fig = pag.figuras.find(f => f.id === figuraSendoEditada);
                if (fig) {
                    fig.layerPosition = camadaSelecionada;
                    renderizarFiguras(); 

                    const el = document.querySelector(`.figura-decorativa[data-id="${figuraSendoEditada}"]`);
                    if (el) el.classList.add('selecionada');
                }
            }
        });
    }

    // --- CRIAÇÃO DA BIBLIOTECA DE FORMAS ---
    listaFormas.innerHTML = '';
    FORMAS_DISPONIVEIS.forEach(forma => {
        const btn = document.createElement('div');
        btn.className = 'forma-btn';
        btn.innerHTML = `<i class="fas ${forma.icone}" style="transform: rotate(${forma.rotate || 0}deg) ${forma.scale || ''}"></i>`;
        btn.title = forma.id;
        
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            adicionarFigura(forma.id, null);
        });

        listaFormas.appendChild(btn);
    });

    renderizarFiguras();
}

function hslParaHex(h, s, l) {
    l /= 100;
    const a = s * Math.min(l, 1 - l) / 100;
    const f = n => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
}

function aplicarCorNaSelecao() {
    if (!figuraSendoEditada) return;
    const pag = getPaginaAtiva();
    const fig = pag.figuras.find(f => f.id === figuraSendoEditada);
    if (fig) {
        fig.cor = corSelecionada;
        const el = document.querySelector(`.figura-decorativa[data-id="${fig.id}"]`);
        if (el) {
            if (fig.tipo === 'estrela') el.querySelector('svg').style.fill = corSelecionada;
            else if (fig.tipo === 'triangulo') el.style.borderBottomColor = corSelecionada;
            else el.style.backgroundColor = corSelecionada;
        }
    }
}

function adicionarFigura(tipo, posicaoMouse) {
    const pag = getPaginaAtiva();
    if (!pag) return;
    if (!pag.figuras) pag.figuras = [];

    const folha = document.querySelector('#pagina-ficha-nova .folha');
    const folhaRect = folha.getBoundingClientRect();
    const zoom = parseFloat(folha.style.zoom) || 1;

    let x = 50, y = 50;
    if (posicaoMouse) {
        x = (posicaoMouse.x - folhaRect.left) / zoom - 50;
        y = (posicaoMouse.y - folhaRect.top) / zoom - 50;
    } else {
        x = (folhaRect.width / zoom / 2) - 50;
        y = (folhaRect.height / zoom / 2) - 50;
    }

    const novaFigura = {
        id: 'fig_' + Date.now() + Math.random().toString(36).substr(2, 5),
        tipo: tipo,
        x: x,
        y: y,
        largura: 100,
        altura: 100,
        cor: corSelecionada || '#ff0000',
        layerPosition: camadaSelecionada
    };

    pag.figuras.push(novaFigura);
    renderizarFiguras();
}

export function renderizarFiguras() {
    const folha = document.querySelector('#pagina-ficha-nova .folha');
    if (!folha) return;

    // 1. CRIA OS CONTAINERS DE CAMADAS (As "prateleiras" do DOM)
    const camadas = ['0-5', '1-5', '2-5', '3-5', '4-5'];
    camadas.forEach(c => {
        let container = folha.querySelector(`.camada-${c}`);
        if (!container) {
            container = document.createElement('div');
            container.className = `camada-${c}`;
            // Insere no topo da folha
            folha.insertBefore(container, folha.firstChild);
        }
    });

    // 2. Remove figuras antigas
    document.querySelectorAll('.figura-decorativa').forEach(el => el.remove());

    const pag = getPaginaAtiva();
    if (!pag || !pag.figuras) return;

    // 3. Cria as figuras e insere fisicamente na camada certa
    pag.figuras.forEach(fig => {
        const el = document.createElement('div');
        el.className = `figura-decorativa fig-${fig.tipo}`;
        el.draggable = false;
        el.dataset.id = fig.id;
        el.dataset.camada = fig.layerPosition;

        el.style.position = 'absolute';
        el.style.left = fig.x + 'px';
        el.style.top = fig.y + 'px';
        el.style.pointerEvents = 'auto'; 

        if (fig.tipo === 'triangulo') {
            el.style.width = '0'; el.style.height = '0';
            el.style.borderLeft = `${fig.largura/2}px solid transparent`;
            el.style.borderRight = `${fig.largura/2}px solid transparent`;
            el.style.borderBottom = `${fig.altura}px solid ${fig.cor}`;
        } else if (fig.tipo === 'estrela') {
            el.innerHTML = `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="${fig.cor}"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;
            el.style.width = fig.largura + 'px';
            el.style.height = fig.altura + 'px';
        } else {
            el.style.width = fig.largura + 'px';
            el.style.height = fig.altura + 'px';
            if (fig.tipo === 'circulo') el.style.borderRadius = '50%';
            el.style.backgroundColor = fig.cor;
        }

        // --- LÓGICA DE MOVER E EXCLUIR ---
        let longPressTimer = null;
        let isDraggingFigura = false;
        
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault(); 
            const paginaContainer = document.querySelector('#pagina-ficha-nova');
            if (!estaEmModoEdicao() || !paginaContainer.classList.contains('modo-colorir')) return;

            if (confirm("Deseja excluir esta figura?")) {
                pag.figuras = pag.figuras.filter(f => f.id !== fig.id);
                renderizarFiguras();
            }
        });

        el.addEventListener('pointerdown', (e) => {
            const paginaContainer = document.querySelector('#pagina-ficha-nova');
            if (!estaEmModoEdicao() || !paginaContainer.classList.contains('modo-colorir')) return;
            if (e.button === 2) return;
            
            e.stopPropagation();
            e.preventDefault(); 

            figuraSendoEditada = fig.id;
            document.querySelectorAll('.figura-decorativa.selecionada').forEach(f => f.classList.remove('selecionada'));
            el.classList.add('selecionada');

            if (selectCamadaElement) {
                selectCamadaElement.value = fig.layerPosition;
                camadaSelecionada = fig.layerPosition;
            }

            const inputHex = document.querySelector('#decoracao-hex');
            if (inputHex) inputHex.value = fig.cor;
            corSelecionada = fig.cor;

            const startX = e.clientX; 
            const startY = e.clientY;
            const origX = fig.x; 
            const origY = fig.y;
            const zoom = parseFloat(document.querySelector('#pagina-ficha-nova .folha').style.zoom) || 1;
            
            isDraggingFigura = false;
            
            // Joga temporariamente para a camada 4.5 para arrastar na frente
            const containerTemporario = folha.querySelector('.camada-4-5');
            if (containerTemporario) containerTemporario.appendChild(el);

            if (e.pointerType === 'touch') {
                longPressTimer = setTimeout(() => {
                    if (!isDraggingFigura) {
                        if (confirm("Deseja excluir esta figura?")) {
                            pag.figuras = pag.figuras.filter(f => f.id !== fig.id);
                            renderizarFiguras();
                        }
                        document.removeEventListener('pointermove', onMove);
                        document.removeEventListener('pointerup', onUp);
                    }
                }, 600);
            }

            const onMove = (ev) => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;

                if (Math.hypot(dx, dy) > 3) {
                    isDraggingFigura = true;
                    if (longPressTimer) clearTimeout(longPressTimer);
                }

                if (isDraggingFigura) {
                    fig.x = origX + (dx / zoom);
                    fig.y = origY + (dy / zoom);
                    el.style.left = fig.x + 'px';
                    el.style.top = fig.y + 'px';
                }
            };
            
            const onUp = (ev) => {
                if (longPressTimer) clearTimeout(longPressTimer);
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);

                // Devolve a figura para a camada original (a prateleira certa)
                const camadaFormatada = String(fig.layerPosition).replace('.', '-');
                const containerOriginal = folha.querySelector(`.camada-${camadaFormatada}`);
                if (containerOriginal) containerOriginal.appendChild(el);

                if (!isDraggingFigura && ev.pointerType === 'touch') {
                    if (confirm("Deseja excluir esta figura?")) {
                        pag.figuras = pag.figuras.filter(f => f.id !== fig.id);
                        renderizarFiguras();
                    }
                }
            };

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        });

        // --- ALÇAS DE REDIMENSIONAMENTO ---
        ['topo', 'base', 'esq', 'dir'].forEach(lado => {
            const borda = document.createElement('div');
            borda.className = `figura-borda figura-borda-${lado}`;
            borda.addEventListener('pointerdown', (e) => {
                const paginaContainer = document.querySelector('#pagina-ficha-nova');
                if (!estaEmModoEdicao() || !paginaContainer.classList.contains('modo-colorir')) return;
                
                e.preventDefault(); e.stopPropagation();
                
                figuraSendoEditada = fig.id;
                el.classList.add('selecionada');

                const startX = e.clientX, startY = e.clientY;
                const orig = { x: fig.x, y: fig.y, largura: fig.largura, altura: fig.altura };
                const zoom = parseFloat(document.querySelector('#pagina-ficha-nova .folha').style.zoom) || 1;

                const onMove = (ev) => {
                    let dx = (ev.clientX - startX) / zoom;
                    let dy = (ev.clientY - startY) / zoom;
                    let { x, y, largura, altura } = orig;

                    if (ev.shiftKey) {
                        const proporcao = orig.largura / orig.altura;
                        const movimento = Math.abs(dx) > Math.abs(dy) ? dx : dy;
                        largura = orig.largura + movimento;
                        altura = largura / proporcao;
                        if (lado === 'esq') x = orig.x + (orig.largura - largura);
                        if (lado === 'topo') y = orig.y + (orig.altura - altura);
                    } else {
                        if (lado === 'dir') largura = orig.largura + dx;
                        if (lado === 'esq') { largura = orig.largura - dx; x = orig.x + dx; }
                        if (lado === 'base') altura = orig.altura + dy;
                        if (lado === 'topo') { altura = orig.altura - dy; y = orig.y + dy; }
                    }

                    if (largura < 20) largura = 20;
                    if (altura < 20) altura = 20;

                    fig.x = x; fig.y = y; fig.largura = largura; fig.altura = altura;
                    el.style.left = x + 'px'; el.style.top = y + 'px'; 
                    el.style.width = largura + 'px'; el.style.height = altura + 'px';
                    
                    if (fig.tipo === 'triangulo') {
                        el.style.borderLeftWidth = `${largura/2}px`;
                        el.style.borderRightWidth = `${largura/2}px`;
                        el.style.borderBottomWidth = `${altura}px`;
                    }
                };
                const onUp = () => {
                    document.removeEventListener('pointermove', onMove);
                    document.removeEventListener('pointerup', onUp);
                };
                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
            });
            el.appendChild(borda);
        });

        // --- INSERÇÃO FÍSICA NO DOM ---
        const camadaFormatada = String(fig.layerPosition).replace('.', '-');
        const container = folha.querySelector(`.camada-${camadaFormatada}`);
        if (container) {
            container.appendChild(el);
        } else {
            folha.appendChild(el); 
        }
    });
}