/* ============================================================
   CODEX — Página: Início (Home) - Maestro
   ============================================================ */

import { criarCabecalho } from '../../componentes/cabecalho/cabecalho.js';
import { criarRodape, definirVisibilidade } from '../../componentes/rodape/rodape.js';
import { obterEstado, observarEstado } from '../../nucleo/estado.js';

import { iniciarMenu } from './modulos/menu.js';
import { iniciarAutenticacao } from './modulos/autenticacao.js';
import { iniciarPerfil } from './modulos/perfil.js';

let refs = null;
let modulos = { menu: null, auth: null, perfil: null };
let cancelarObservacaoEstado = null;

export function montarPagina(container) {
    const pagina = container.querySelector('#pagina-inicio');
    if (!pagina) return;

    if (!pagina.querySelector('.floating-dice-bg')) injetarDadosFundo(pagina);
    if (!pagina.querySelector('#home-btn')) {
        const menuWrapper = pagina.querySelector('.menu-wrapper');
        const titulo = criarCabecalho({ rotaHome: '/inicio' });
        pagina.insertBefore(titulo, menuWrapper);
    }
    if (!pagina.querySelector('#footer-terms')) pagina.appendChild(criarRodape());

    refs = {
        pagina,
        menuOrbit: pagina.querySelector('#menu-orbit'),
        titulo: pagina.querySelector('#home-btn'),
        rodape: pagina.querySelector('#footer-terms'),
        centerDiceBtn: pagina.querySelector('#center-dice-btn'),
        userNameTag: pagina.querySelector('#user-name-tag'),
        authPanel: pagina.querySelector('#auth-panel'),
        tabLogin: pagina.querySelector('#tab-login'),
        tabRegister: pagina.querySelector('#tab-register'),
        formLogin: pagina.querySelector('#form-login'),
        formRegister: pagina.querySelector('#form-register')
    };

    let nomeAtualDoUsuario = '';

    // --- Callbacks ---
    const callbacksMenu = {
        aoClicarNoDado: () => {
            const estado = obterEstado();
            
            if (estado.usuario) {
                // MÁGICA AQUI: Vai para a página exclusiva de perfil
                window.location.hash = '#/perfil';
            } else {
                mostrarRodape(false);
                setTimeout(() => {
                    abrirPainel(refs.authPanel);
                }, 200);
            }
        },
        aoVoltarAoMenu: () => {
            refs.authPanel.classList.remove('active');
            modulos.menu.abrirMenu();
            mostrarRodape(true);
        }
    };

    const callbacksAuth = {
        aoLogarComSucesso: (nome) => {
            nomeAtualDoUsuario = nome;
        }
    };

    const callbacksPerfil = {
        aoDeslogar: () => {}
    };

    // --- Inicializar Módulos ---
    modulos.menu = iniciarMenu(refs, callbacksMenu);
    modulos.auth = iniciarAutenticacao(refs, callbacksAuth);
    modulos.perfil = iniciarPerfil(refs, callbacksPerfil);

    // --- Observar Mudanças de Estado ---
    if (cancelarObservacaoEstado) cancelarObservacaoEstado();

    cancelarObservacaoEstado = observarEstado((estado) => {
        if (estado.usuario) {
            if (!nomeAtualDoUsuario) nomeAtualDoUsuario = estado.usuario.email.split('@')[0];
            modulos.menu.atualizarNomeUsuario(nomeAtualDoUsuario);
            modulos.menu.abrirMenu();
            refs.authPanel.classList.remove('active');
            mostrarRodape(true);
        } else {
            modulos.menu.atualizarNomeUsuario(null);
            refs.authPanel.classList.remove('active');
            modulos.menu.abrirMenu();
            mostrarRodape(true);
        }
    });

    refs.authPanel.classList.remove('active');
    modulos.menu.abrirMenu();
    mostrarRodape(true);
}

export function desmontarPagina() {
    if (cancelarObservacaoEstado) {
        cancelarObservacaoEstado();
        cancelarObservacaoEstado = null;
    }
    if (!refs) return;
    refs.authPanel?.classList.remove('active');
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

function abrirPainel(painel) {
    refs.pagina.querySelectorAll('.screen-panel').forEach((p) => p.classList.remove('active'));
    painel.classList.add('active');
}

function mostrarRodape(visivel) {
    if (refs?.rodape) definirVisibilidade(refs.rodape, visivel);
}