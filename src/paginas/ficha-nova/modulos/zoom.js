/* ============================================================
   MÓDULO: ZOOM (Ficha Nova)
   ============================================================ */

const ZOOM_MIN = 0.1; // 10%
const ZOOM_MAX = 2.0; // 200%
const ZOOM_PADRAO = 0.5; // 70%

let estadoZoom = ZOOM_PADRAO;

export function iniciarZoom(pagina, wrapper) {
    const indicador = document.querySelector('#indicador-zoom');

    // Atualiza o texto do indicador
    const atualizarIndicador = () => {
        if (indicador) {
            indicador.textContent = `${Math.round(estadoZoom * 100)}%`;
        }
    };

    // Aplica o zoom padrão assim que a página é carregada
    wrapper.style.zoom = estadoZoom;
    atualizarIndicador();

    // Desktop (Shift + Scroll)
    pagina.addEventListener('wheel', (e) => {
        if (!e.shiftKey) return;
        e.preventDefault();

        const delta = e.deltaY > 0 ? -0.05 : 0.05;
        let novoZoom = estadoZoom + delta;
        
        if (novoZoom < ZOOM_MIN) novoZoom = ZOOM_MIN;
        if (novoZoom > ZOOM_MAX) novoZoom = ZOOM_MAX;

        estadoZoom = novoZoom;
        
        wrapper.style.zoom = novoZoom;
        atualizarIndicador();
    }, { passive: false });

    // Mobile (Pinch)
    let distanciaInicial = 0;
    let zoomInicial = 1.0;
    let pinching = false;

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
    }, { passive: true });

    pagina.addEventListener('touchmove', (e) => {
        if (!pinching || e.touches.length !== 2) return;

        const dist = distanciaEntre(e.touches[0], e.touches[1]);
        const fator = dist / distanciaInicial;
        let novoZoom = zoomInicial * fator;

        if (novoZoom < ZOOM_MIN) novoZoom = ZOOM_MIN;
        if (novoZoom > ZOOM_MAX) novoZoom = ZOOM_MAX;

        estadoZoom = novoZoom;
        wrapper.style.zoom = novoZoom;
        atualizarIndicador();

        e.preventDefault();
    }, { passive: false });

    pagina.addEventListener('touchend', () => { pinching = false; }, { passive: true });
}