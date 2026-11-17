/* ============================================================
   CODEX — Página: Início (Home) - Maestro
   ============================================================ */

import { criarRodape, definirVisibilidade } from '../../componentes/rodape/rodape.js';
import { obterEstado, observarEstado } from '../../nucleo/estado.js';
import { iniciarMenu } from './modulos/menu.js';

let refs = null;
let modulos = { menu: null };
let cancelarObservacaoEstado = null;

export function montarPagina(container) {
    const pagina = container.querySelector('#pagina-inicio');
    if (!pagina) return;

    if (!pagina.querySelector('.floating-dice-bg')) {
        injetarDadosFundo(pagina);
    }

    let rodape = pagina.querySelector('#footer-terms');
    if (!rodape) {
        rodape = criarRodape();
        if (!rodape.id) rodape.id = 'footer-terms';
        pagina.appendChild(rodape);
    }
    if (rodape && (rodape.innerHTML.trim() === '' || rodape.innerHTML.includes('display: flex; gap'))) {
        rodape.innerHTML = `
            <div class="footer-links">
                <a href="#/privacidade" class="footer-link">Privacidade</a>
                <span class="footer-separator">•</span>
                <a href="#/termos" class="footer-link">Termos</a>
                <span class="footer-separator">•</span>
                <a href="#/cookies" class="footer-link">Cookies</a>
                <span class="footer-separator">•</span>
                <a href="#/contato" class="footer-link">Contato</a>
                <span class="footer-separator">•</span>
                <span class="footer-copyright">© 2025 Codex</span>
            </div>
        `;
    }

    refs = {
        pagina,
        menuOrbit: pagina.querySelector('#menu-orbit'),
        rodape: pagina.querySelector('#footer-terms'),
        centerDiceBtn: pagina.querySelector('#center-dice-btn')
    };

    const callbacksMenu = {
        aoClicarNoDado: () => {
            const estado = obterEstado();
            if (estado.usuario) {
                window.location.hash = '#/perfil';
            } else {
                // [NOVO] Redireciona para a página exclusiva de Login
                window.location.hash = '#/login';
            }
        },
        aoVoltarAoMenu: () => {
            modulos.menu.abrirMenu();
            mostrarRodape(true);
        }
    };

    modulos.menu = iniciarMenu(refs, callbacksMenu);

    if (cancelarObservacaoEstado) cancelarObservacaoEstado();

    cancelarObservacaoEstado = observarEstado((estado) => {
        modulos.menu.abrirMenu();
        mostrarRodape(true);
    });

    modulos.menu.abrirMenu();
    mostrarRodape(true);
}

export function desmontarPagina() {
    if (cancelarObservacaoEstado) {
        cancelarObservacaoEstado();
        cancelarObservacaoEstado = null;
    }
    if (!refs) return;
    refs.menuOrbit?.classList.remove('hidden');
    if (refs.rodape) definirVisibilidade(refs.rodape, true);
}

function injetarDadosFundo(pagina) {
    const fundo = document.createElement('div');
    fundo.className = 'floating-dice-bg';
    fundo.innerHTML = `
        <div class="bg-dice"><i class="fas fa-dice-d20"></i></div>
        <div class="bg-dice"><i class="fas fa-dice-d6"></i></div>
        <div class="bg-dice"><i class="fas fa-dice-d20"></i></div>
        <div class="bg-dice"><i class="fas fa-dice-d12"></i></div>
        <div class="bg-dice"><i class="fas fa-dice-d8"></i></div>
        <div class="bg-dice"><i class="fas fa-dice-d4"></i></div>
    `;
    pagina.insertBefore(fundo, pagina.firstChild);
}

function mostrarRodape(visivel) {
    if (refs?.rodape) definirVisibilidade(refs.rodape, visivel);
}