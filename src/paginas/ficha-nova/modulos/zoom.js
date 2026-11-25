const ZOOM_MIN = 0.24;
const ZOOM_MAX = 1.5;
const ZOOM_PADRAO = 0.5;
const LIMIAR_ARRASTE = 5;

export function iniciarZoom(pagina, wrapper) {
    const indicador = pagina.querySelector('#indicador-zoom');
    const area = pagina.querySelector('.ficha-nova-area');
    const folha = pagina.querySelector('.folha');
    let estadoZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_PADRAO, area.clientWidth / (folha.offsetWidth + 32)));
    const zoomInicial = estadoZoom;
    const espaco = document.createElement('div');
    espaco.className = 'folha-espaco';
    wrapper.before(espaco);
    espaco.appendChild(wrapper);

    function atualizarZoom() {
        wrapper.style.zoom = estadoZoom;
        espaco.classList.toggle('zoom-ampliado', estadoZoom > zoomInicial + 0.001);
        if (indicador) indicador.textContent = `${Math.round(estadoZoom * 100)}%`;
    }

    function aplicarZoom(novoZoom, x, y, origemX = x, origemY = y) {
        novoZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, novoZoom));
        if (novoZoom === estadoZoom) {
            area.scrollLeft += origemX - x;
            area.scrollTop += origemY - y;
            return;
        }

        const anterior = wrapper.getBoundingClientRect();
        const pontoX = (origemX - anterior.left) / estadoZoom;
        const pontoY = (origemY - anterior.top) / estadoZoom;
        estadoZoom = novoZoom;
        atualizarZoom();

        const atual = wrapper.getBoundingClientRect();
        area.scrollLeft += atual.left + pontoX * estadoZoom - x;
        area.scrollTop += atual.top + pontoY * estadoZoom - y;
    }

    function podeMover() {
        return area.scrollWidth > area.clientWidth || area.scrollHeight > area.clientHeight;
    }

    atualizarZoom();

    area.addEventListener('wheel', evento => {
        if (!evento.shiftKey || !evento.deltaY) return;
        evento.preventDefault();
        const delta = evento.deltaY > 0 ? -0.05 : 0.05;
        aplicarZoom(estadoZoom + delta, evento.clientX, evento.clientY);
    }, { passive: false });

    function fundoDaFolha(alvo) {
        return espaco.contains(alvo) && !alvo.closest('.painel, .bloco, .folha-regua-borda, input, textarea, button, select, a, [contenteditable]');
    }

    let mouse;
    espaco.addEventListener('pointerdown', evento => {
        if (evento.pointerType !== 'mouse' || (evento.button !== 0 && evento.button !== 2)) return;
        if (mouse || !podeMover() || !fundoDaFolha(evento.target)) return;
        evento.preventDefault();
        mouse = { id: evento.pointerId, x: evento.clientX, y: evento.clientY };
        espaco.setPointerCapture(evento.pointerId);
        espaco.classList.add('arrastando-folha');
    });

    espaco.addEventListener('pointermove', evento => {
        if (mouse?.id !== evento.pointerId) return;
        area.scrollLeft += mouse.x - evento.clientX;
        area.scrollTop += mouse.y - evento.clientY;
        mouse.x = evento.clientX;
        mouse.y = evento.clientY;
    });

    espaco.addEventListener('lostpointercapture', evento => {
        if (mouse?.id !== evento.pointerId) return;
        mouse = null;
        espaco.classList.remove('arrastando-folha');
    });

    espaco.addEventListener('contextmenu', evento => {
        if (mouse || (podeMover() && fundoDaFolha(evento.target))) evento.preventDefault();
    });

    let toque;
    let pinca;
    let pincaPendente;
    let quadroPinca = null;
    const medidaPinca = ([a, b]) => ({
        x: (a.clientX + b.clientX) / 2,
        y: (a.clientY + b.clientY) / 2,
        distancia: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
    });

    function aplicarPincaPendente() {
        const atual = pincaPendente;
        pincaPendente = null;
        if (!atual) return;
        if (pinca.distancia > 0 && atual.distancia > 0) {
            aplicarZoom(estadoZoom * atual.distancia / pinca.distancia, atual.x, atual.y, pinca.x, pinca.y);
        }
        pinca = atual;
    }

    function limparQuadroPinca() {
        if (quadroPinca !== null) cancelAnimationFrame(quadroPinca);
        quadroPinca = null;
    }

    function iniciarToque(dedo) {
        toque = { id: dedo.identifier, x: dedo.clientX, y: dedo.clientY, arrastando: false };
    }

    espaco.addEventListener('touchstart', evento => {
        if (evento.touches.length === 2) {
            limparQuadroPinca();
            aplicarPincaPendente();
            toque = null;
            pinca = medidaPinca(evento.touches);
        } else if (evento.touches.length === 1 && !evento.target.closest('.folha-borda, .folha-regua, .painel-borda, .bloco-borda, .painel-alca-arrasto, .bloco-alca-arrasto, .bloco-titulo-alca')) {
            iniciarToque(evento.touches[0]);
        }
    }, { passive: true });

    espaco.addEventListener('touchmove', evento => {
        if (pinca && evento.touches.length === 2) {
            pincaPendente = medidaPinca(evento.touches);
            if (quadroPinca === null) {
                quadroPinca = requestAnimationFrame(() => {
                    quadroPinca = null;
                    aplicarPincaPendente();
                });
            }
            if (evento.cancelable) evento.preventDefault();
            return;
        }

        const dedo = evento.touches[0];
        if (evento.touches.length !== 1 || toque?.id !== dedo.identifier || !podeMover()) return;
        const dx = toque.x - dedo.clientX;
        const dy = toque.y - dedo.clientY;
        if (!toque.arrastando && Math.hypot(dx, dy) < LIMIAR_ARRASTE) return;
        if (evento.cancelable) evento.preventDefault();
        toque.arrastando = true;
        area.scrollLeft += dx;
        area.scrollTop += dy;
        toque.x = dedo.clientX;
        toque.y = dedo.clientY;
    }, { passive: false });

    espaco.addEventListener('touchend', evento => {
        limparQuadroPinca();
        aplicarPincaPendente();
        if (pinca && evento.touches.length === 2) {
            pinca = medidaPinca(evento.touches);
            return;
        }
        const continuarArraste = pinca && evento.touches.length === 1;
        pinca = null;
        toque = null;
        if (continuarArraste) iniciarToque(evento.touches[0]);
    });

    espaco.addEventListener('touchcancel', () => {
        limparQuadroPinca();
        pincaPendente = null;
        pinca = null;
        toque = null;
    });

    return function ajustarZoomDoAssistente() {
        const zoom = Math.min(0.9, area.clientWidth / (folha.offsetWidth + 32));
        const { left, top } = area.getBoundingClientRect();
        aplicarZoom(zoom, left, top);
    };
}
