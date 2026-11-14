/* ============================================================
   CODEX — Página: Início (Home) - Maestro
   ============================================================ */

import { criarCabecalho } from '../../componentes/cabecalho/cabecalho.js';
import { criarRodape, definirVisibilidade } from '../../componentes/rodape/rodape.js';
import { obterEstado, observarEstado } from '../../nucleo/estado.js';

// Importando os módulos
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
        profilePanel: pagina.querySelector('#profile-panel'),
        tabLogin: pagina.querySelector('#tab-login'),
        tabRegister: pagina.querySelector('#tab-register'),
        formLogin: pagina.querySelector('#form-login'),
        formRegister: pagina.querySelector('#form-register'),
        profileName: pagina.querySelector('#profile-name'),
        profileEmail: pagina.querySelector('#profile-email'),
        btnLogout: pagina.querySelector('#btn-logout')
    };

    // Variável para guardar o nome atual temporariamente
    let nomeAtualDoUsuario = '';

    // --- Callbacks ---
    const callbacksMenu = {
        aoClicarNoDado: () => {
            mostrarRodape(false);
            setTimeout(() => {
                const estado = obterEstado();
                if (estado.usuario) {
                    modulos.perfil.atualizarDadosPerfil(nomeAtualDoUsuario, estado.usuario.email);
                    abrirPainel(refs.profilePanel);
                } else {
                    abrirPainel(refs.authPanel);
                }
            }, 200);
        },
        aoVoltarAoMenu: () => {
            refs.authPanel.classList.remove('active');
            refs.profilePanel.classList.remove('active');
            modulos.menu.abrirMenu();
            mostrarRodape(true);
        }
    };

    const callbacksAuth = {
        aoLogarComSucesso: (nome) => {
            nomeAtualDoUsuario = nome;
            // Não precisamos fechar o painel aqui, o observarEstado vai reagir e fechar
        }
    };

    const callbacksPerfil = {
        aoDeslogar: () => {
            nomeAtualDoUsuario = '';
            refs.authPanel.classList.remove('active');
            refs.profilePanel.classList.remove('active');
            modulos.menu.abrirMenu();
            modulos.auth.resetarFormularios();
            mostrarRodape(true);
        }
    };

    // --- Inicializar Módulos ---
    modulos.menu = iniciarMenu(refs, callbacksMenu);
    modulos.auth = iniciarAutenticacao(refs, callbacksAuth);
    modulos.perfil = iniciarPerfil(refs, callbacksPerfil);

    // --- Observar Mudanças de Estado (Login/Logout) ---
    if (cancelarObservacaoEstado) cancelarObservacaoEstado(); // Evita duplicar se montar a página de novo

    cancelarObservacaoEstado = observarEstado((estado) => {
        if (estado.usuario) {
            // Usuário logado
            if (!nomeAtualDoUsuario) nomeAtualDoUsuario = estado.usuario.email.split('@')[0]; // Fallback se recarregar a página
            
            modulos.menu.atualizarNomeUsuario(nomeAtualDoUsuario);
            modulos.menu.abrirMenu();
            
            refs.authPanel.classList.remove('active');
            refs.profilePanel.classList.remove('active');
            mostrarRodape(true);
        } else {
            // Usuário deslogado
            modulos.menu.atualizarNomeUsuario(null);
            refs.authPanel.classList.remove('active');
            refs.profilePanel.classList.remove('active');
            modulos.menu.abrirMenu();
            mostrarRodape(true);
        }
    });

    // Reseta visual ao entrar na página
    refs.authPanel.classList.remove('active');
    refs.profilePanel.classList.remove('active');
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
    refs.profilePanel?.classList.remove('active');
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