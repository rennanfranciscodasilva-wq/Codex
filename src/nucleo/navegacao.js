/* ============================================================
   CODEX — Navegação
   ============================================================ */

import { navegar } from './roteador.js';
import { confirmarAcao } from '../componentes/dialogos/dialogos.js';

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

async function aoClicar(evento) {
    const alvo = evento.target.closest('[data-rota]');
    if (!alvo) return;

    const rota = alvo.getAttribute('data-rota');
    if (!rota) return;

    // Ignora cliques com modificadores
    if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
    if (evento.button !== 0) return;

    // Só processa se o clique foi DENTRO do elemento
    const rect = alvo.getBoundingClientRect();
    if (evento.detail !== 0 && (
        evento.clientX < rect.left ||
        evento.clientX > rect.right ||
        evento.clientY < rect.top ||
        evento.clientY > rect.bottom
    )) {
        return;
    }

    evento.preventDefault();
    const origem = window.location.hash;
    if (
        rota === '/inicio' &&
        alvo.matches('.codex-global-header .codex-title') &&
        fichaAbertaOuNoPassoDois() &&
        !(await confirmarAcao('Você quer voltar para o início do Codex?'))
    ) return;

    if (window.location.hash === origem) navegar(rota);
}

function fichaAbertaOuNoPassoDois() {
    const ficha = document.querySelector('.pagina-wrapper:not(.pagina-saindo, .pagina-entrando) #pagina-ficha-nova');
    if (!ficha) return false;

    const assistente = ficha.querySelector('#wizard-overlay:not(.hidden)');
    return !assistente || Boolean(assistente.querySelector('#wizard-step-2.active'));
}

/* ---------- Previne href="#" solto ---------- */

document.addEventListener('click', (evento) => {
    const link = evento.target.closest('a[href="#"]');
    if (!link) return;
    if (link.hasAttribute('data-rota')) return;
    evento.preventDefault();
});
