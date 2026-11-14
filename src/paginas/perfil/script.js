/* ============================================================
   CODEX — Página: Perfil (Script)
   ============================================================ */

import { criarCabecalho } from '../../componentes/cabecalho/cabecalho.js';
import { obterEstado, observarEstado } from '../../nucleo/estado.js';
import { sair } from '../../servicos/autenticacao/autenticacao.js';

let refs = null;
let cancelarObservacao = null;

export function montarPagina(container) {
    const pagina = container.querySelector('#pagina-perfil');
    if (!pagina) return;

    // 1. Injeta o cabeçalho CodeX no topo da página
    if (!pagina.querySelector('#home-btn')) {
        const cabecalho = criarCabecalho({ rotaHome: '/inicio' });
        cabecalho.classList.add('codex-title-container');
        pagina.insertBefore(cabecalho, pagina.firstChild);
    }

    // 2. Mapeia os elementos
    refs = {
        pagina,
        nome: pagina.querySelector('#profile-name'),
        email: pagina.querySelector('#profile-email'),
        btnLogout: pagina.querySelector('#btn-logout'),
        navItems: pagina.querySelectorAll('.perfil-nav-item'),
        tabContents: pagina.querySelectorAll('.perfil-tab-content')
    };

    // 3. Atualiza dados iniciais
    atualizarDadosUsuario();

    // 4. Ouve o estado global (se deslogar, volta pra home)
    if (cancelarObservacao) cancelarObservacao();
    cancelarObservacao = observarEstado((estado) => {
        if (!estado.usuario) {
            window.location.hash = '#/inicio';
        } else {
            atualizarDadosUsuario();
        }
    });

    // 5. Ativa eventos
    if (pagina.dataset.eventosAtivos !== 'true') {
        ativarEventos();
        pagina.dataset.eventosAtivos = 'true';
    }
}

export function desmontarPagina() {
    if (cancelarObservacao) {
        cancelarObservacao();
        cancelarObservacao = null;
    }
    refs = null;
}

function atualizarDadosUsuario() {
    const estado = obterEstado();
    if (estado.usuario) {
        const nomeProvisorio = estado.usuario.email.split('@')[0];
        refs.nome.textContent = nomeProvisorio;
        refs.email.textContent = estado.usuario.email;
    }
}

function ativarEventos() {
    // Troca de abas
    refs.navItems.forEach(item => {
        item.addEventListener('click', () => {
            refs.navItems.forEach(nav => nav.classList.remove('active'));
            refs.tabContents.forEach(tab => tab.classList.remove('active'));

            item.classList.add('active');
            const targetId = `tab-content-${item.getAttribute('data-tab')}`;
            const targetContent = refs.pagina.querySelector(`#${targetId}`);
            if (targetContent) targetContent.classList.add('active');
        });
    });

    // Sair da conta
    refs.btnLogout.addEventListener('click', async () => {
        try {
            await sair();
            // O observer vai detectar e redirecionar
        } catch (erro) {
            console.error("Erro ao sair:", erro);
            alert("Não foi possível sair da conta.");
        }
    });
}