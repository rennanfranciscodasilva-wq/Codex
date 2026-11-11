/* ============================================================
   MÓDULO: ZOOM (Ficha Nova) - Focado no Mouse
   ============================================================ */

const ZOOM_MIN = 0.5; // 50% Mínimo
const ZOOM_MAX = 1.5; // 150% Máximo
const ZOOM_PADRAO = 0.5; // Padrão inicial

let estadoZoom = ZOOM_PADRAO;

export function iniciarZoom(pagina, wrapper) {
    const indicador = document.querySelector('#indicador-zoom');
    const area = pagina.querySelector('.ficha-nova-area');

    const aplicarZoom = (novoZoom, mouseX, mouseY) => {
        if (novoZoom < ZOOM_MIN) novoZoom = ZOOM_MIN;
        if (novoZoom > ZOOM_MAX) novoZoom = ZOOM_MAX;
        
        if (novoZoom === estadoZoom) return;

        // 1. Descobre a posição do mouse relativa à área de scroll
        const areaRect = area.getBoundingClientRect();
        const posX = mouseX - areaRect.left;
        const posY = mouseY - areaRect.top;

        // 2. Descobre a posição do mouse no "mundo real" (dentro do wrapper)
        const pontoX = (area.scrollLeft + posX) / estadoZoom;
        const pontoY = (area.scrollTop + posY) / estadoZoom;

        // 3. Aplica o novo zoom
        estadoZoom = novoZoom;
        wrapper.style.zoom = estadoZoom;
        
        if (indicador) {
            indicador.textContent = `${Math.round(estadoZoom * 100)}%`;
        }

        // 4. Recalcula o scroll para manter o ponto embaixo do mouse
        // Usamos requestAnimationFrame para esperar o navegador renderizar o novo tamanho
        requestAnimationFrame(() => {
            area.scrollLeft = (pontoX * estadoZoom) - posX;
            area.scrollTop = (pontoY * estadoZoom) - posY;
        });
    };

    // Aplica o zoom padrão inicial
    wrapper.style.zoom = estadoZoom;
    if (indicador) indicador.textContent = `${Math.round(estadoZoom * 100)}%`;

    // --- ZOOM DESKTOP (Shift + Scroll) ---
    pagina.addEventListener('wheel', (e) => {
        if (!e.shiftKey) return;
        e.preventDefault();

        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        let novoZoom = estadoZoom + delta;

        // Pega a posição do mouse na tela
        aplicarZoom(novoZoom, e.clientX, e.clientY);
    }, { passive: false });

    // --- ZOOM MOBILE (Pinch) ---
    let distanciaInicial = 0;
    let zoomInicial = 1.0;
    let pinching = false;
    let centroPinch = { x: 0, y: 0 };

    const distanciaEntre = (t1, t2) => {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    };

    pagina.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 2) return;
        pinching = true;
        distanciaInicial = distanciaEntre(e.touches[0], e.touches[1]);
        zoomInicial = estadoZoom;
        
        // Pega o centro entre os dois dedos
        centroPinch.x = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        centroPinch.y = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }, { passive: true });

    pagina.addEventListener('touchmove', (e) => {
        if (!pinching || e.touches.length !== 2) return;

        const dist = distanciaEntre(e.touches[0], e.touches[1]);
        const fator = dist / distanciaInicial;
        let novoZoom = zoomInicial * fator;

        aplicarZoom(novoZoom, centroPinch.x, centroPinch.y);

        e.preventDefault();
    }, { passive: false });

    pagina.addEventListener('touchend', () => { pinching = false; }, { passive: true });
}