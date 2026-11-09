/* ============================================================
   CODEX — Página: Início (Home)
   ============================================================ */

import { criarCabecalho } from '../../componentes/cabecalho/cabecalho.js';
import { criarRodape, definirVisibilidade } from '../../componentes/rodape/rodape.js';
import * as autenticacao from '../../servicos/autenticacao/autenticacao.js';
import { definirEstado } from '../../nucleo/estado.js';

let refs = null;

export function montarPagina(container) {
    const pagina = container.querySelector('#pagina-inicio');
    if (!pagina) return;

    if (!pagina.querySelector('.floating-dice-bg')) {
        injetarDadosFundo(pagina);
    }

    if (!pagina.querySelector('#home-btn')) {
        const menuWrapper = pagina.querySelector('.menu-wrapper');
        const titulo = criarCabecalho({ rotaHome: '/inicio' });
        pagina.insertBefore(titulo, menuWrapper);
    }

    if (!pagina.querySelector('#footer-terms')) {
        const rodape = criarRodape();
        pagina.appendChild(rodape);
    }

    refs = {
        pagina,
        menuOrbit: pagina.querySelector('#menu-orbit'),
        titulo: pagina.querySelector('#home-btn'),
        rodape: pagina.querySelector('#footer-terms'),
        centerDiceBtn: pagina.querySelector('#center-dice-btn'),
        orbitItems: pagina.querySelectorAll('.orbit-item'),
        authPanel: pagina.querySelector('#auth-panel'),
        profilePanel: pagina.querySelector('#profile-panel'),
        tabLogin: pagina.querySelector('#tab-login'),
        tabRegister: pagina.querySelector('#tab-register'),
        formLogin: pagina.querySelector('#form-login'),
        formRegister: pagina.querySelector('#form-register'),
        profileName: pagina.querySelector('#profile-name'),
        btnLogout: pagina.querySelector('#btn-logout')
    };

    if (pagina.dataset.eventosAtivos !== 'true') {
        ativarEventos();
        pagina.dataset.eventosAtivos = 'true';
    }

    // Reseta estado visual ao voltar
    refs.menuOrbit?.classList.remove('hidden');
    refs.authPanel?.classList.remove('active');
    refs.profilePanel?.classList.remove('active');
    if (refs.rodape) definirVisibilidade(refs.rodape, true);
}

export function desmontarPagina() {
    if (!refs) return;
    if (refs.menuOrbit) refs.menuOrbit.classList.remove('hidden');
    if (refs.authPanel) refs.authPanel.classList.remove('active');
    if (refs.profilePanel) refs.profilePanel.classList.remove('active');
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

function ativarEventos() {
    const {
        menuOrbit,
        centerDiceBtn,
        orbitItems,
        tabLogin,
        tabRegister,
        formLogin,
        formRegister,
        btnLogout
    } = refs;

    // --- Ícones orbitais ---
    orbitItems.forEach((item) => {
        item.addEventListener('click', (e) => {
            // A MÁGICA ACONTECE AQUI: 
            // Em vez de deixar o roteador fazer, nós mesmos mudamos o hash.
            e.preventDefault();
            const rota = item.getAttribute('data-rota');
            if (rota) {
                window.location.hash = `#${rota}`;
            }
        });
    });

    // --- Dado central ---
    centerDiceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();

        menuOrbit.classList.add('hidden');
        mostrarRodape(false);

        setTimeout(() => {
            if (autenticacao.estaLogado()) {
                const usuario = autenticacao.usuarioAtual();
                refs.profileName.textContent = usuario?.nome || 'Aventureiro';
                abrirPainel(refs.profilePanel);
            } else {
                alternarAbaAuth(true);
                abrirPainel(refs.authPanel);
            }
        }, 200);
    });

    // --- Abas ---
    tabLogin.addEventListener('click', () => alternarAbaAuth(true));
    tabRegister.addEventListener('click', () => alternarAbaAuth(false));

    // --- Registro ---
    formRegister.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = refs.pagina.querySelector('#reg-name').value;
        const email = refs.pagina.querySelector('#reg-email').value;
        const senha = refs.pagina.querySelector('#reg-password').value;

        const resultado = autenticacao.registrar({ nome, email, senha });
        if (!resultado.ok) { alert(resultado.erro); return; }

        definirEstado({ usuario: resultado.usuario });
        refs.profileName.textContent = resultado.usuario.nome;
        formRegister.reset();
        abrirPainel(refs.profilePanel);
    });

    // --- Login ---
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = refs.pagina.querySelector('#login-email').value;
        const senha = refs.pagina.querySelector('#login-password').value;

        const resultado = autenticacao.entrar({ email, senha });
        if (!resultado.ok) { alert(resultado.erro); return; }

        definirEstado({ usuario: resultado.usuario });
        refs.profileName.textContent = resultado.usuario.nome;
        formLogin.reset();
        abrirPainel(refs.profilePanel);
    });

    // --- Logout ---
    btnLogout.addEventListener('click', () => {
        autenticacao.sair();
        definirEstado({ usuario: null });
        alternarAbaAuth(true);
        abrirPainel(refs.authPanel);
    });

    // --- Título ---
    refs.titulo.addEventListener('click', (e) => {
        if (window.location.hash === '#/inicio' || window.location.hash === '') {
            e.preventDefault();
            voltarAoMenu();
        }
    });
}

function voltarAoMenu() {
    const { menuOrbit, authPanel, profilePanel } = refs;
    authPanel.classList.remove('active');
    profilePanel.classList.remove('active');
    menuOrbit.classList.remove('hidden');
    mostrarRodape(true);
}

function abrirPainel(painel) {
    refs.pagina.querySelectorAll('.screen-panel').forEach((p) => p.classList.remove('active'));
    painel.classList.add('active');
    mostrarRodape(false);
}

function alternarAbaAuth(mostrarLogin) {
    const { tabLogin, tabRegister, formLogin, formRegister } = refs;
    if (mostrarLogin) {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.classList.add('active');
        formRegister.classList.remove('active');
    } else {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.classList.add('active');
        formLogin.classList.remove('active');
    }
}

function mostrarRodape(visivel) {
    if (refs?.rodape) definirVisibilidade(refs.rodape, visivel);
}