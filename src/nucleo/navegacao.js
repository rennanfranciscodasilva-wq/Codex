/* ============================================================
   CODEX — Navegação
   ============================================================ */

import { navegar } from './roteador.js';

let inicializado = false;

export function iniciarNavegacao() {
    if (inicializado) return;
    inicializado = true;

    document.addEventListener('click', aoClicar);
}

export function pararNavegacao() {
    document.removeEventListener('click', aoClicar);
    inicializado = false;
}

export function irPara(rota) {
    navegar(rota);
}

/* ---------- Handler ---------- */

function aoClicar(evento) {
    const alvo = evento.target.closest('[data-rota]');
    if (!alvo) return;

    const rota = alvo.getAttribute('data-rota');
    if (!rota) return;

    // Ignora cliques com modificadores
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    if (evento.button !== 0) return;

    // Só processa se o clique foi DENTRO do elemento
    const rect = alvo.getBoundingClientRect();
    if (
        evento.clientX < rect.left ||
        evento.clientX > rect.right ||
        evento.clientY < rect.top ||
        evento.clientY > rect.bottom
    ) {
        return;
    }

    evento.preventDefault();
    navegar(rota);
}

/* ---------- Previne href="#" solto ---------- */

document.addEventListener('click', (evento) => {
    const link = evento.target.closest('a[href="#"]');
    if (!link) return;
    if (link.hasAttribute('data-rota')) return;
    evento.preventDefault();
});