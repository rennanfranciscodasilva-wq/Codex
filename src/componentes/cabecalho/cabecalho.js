/* ============================================================
   CODEX — Componente: Cabeçalho Global
   ============================================================ */

import { obterEstado, observarEstado, definirPersonagemAtivo } from '../../nucleo/estado.js';
import { observarSincronizacao, sincronizarAgora } from '../../servicos/sincronizacao/sincronizacao.js';
import { consultarEmailConfirmado } from '../../servicos/autenticacao/autenticacao.js';
import { auth } from '../../servicos/firebase/config.js';
import { onIdTokenChanged } from 'firebase/auth';
import { confirmarAcao } from '../dialogos/dialogos.js';
import { areaDasConfirmacoes, definirPausaDeConfirmacoes, EVENTO_CONFIRMACOES, fimDaPausa } from '../dialogos/confirmacoes.js';

export function criarCabecalho({ rotaHome = '/inicio' } = {}) {
    const container = document.createElement('header');
    container.className = 'codex-global-header';
    
    container.innerHTML = `
        <div class="header-left">
            <div class="header-backup" hidden>
                <div class="header-backup-controles" hidden>
                    <span class="header-backup-tempo"></span>
                    <span class="header-backup-carregando" hidden aria-hidden="true"></span>
                    <button type="button" class="header-backup-enviar">Sincronizar agora</button>
                </div>
                <div class="header-notificacoes" hidden>
                    <button type="button" class="header-notificacoes-sino" aria-label="Notificações" aria-expanded="false" aria-controls="header-lista-notificacoes">
                        <i class="fas fa-bell" aria-hidden="true"></i>
                        <span class="header-notificacoes-contagem" aria-hidden="true"></span>
                    </button>
                    <ul class="header-notificacoes-lista" id="header-lista-notificacoes" aria-label="Notificações" hidden>
                        <li hidden><a href="#/confirmar-email" class="header-confirmar-email">E-mail pendente · Confirmar</a></li>
                        <li hidden><button type="button" class="header-confirmacoes">Confirmações pausadas · Reativar</button></li>
                    </ul>
                </div>
                <small class="header-backup-status" role="status"></small>
            </div>
        </div>
        
        <div class="header-center">
            <a class="codex-title" href="#${rotaHome}" data-rota="${rotaHome}">
                Code<span>X</span>
            </a>
        </div>
        
        <div class="header-right">
            <div class="seletor-personagem" id="seletor-personagem">
                <button class="btn-seletor" id="btn-seletor">
                    <span id="nome-personagem-ativo">Nenhum selecionado</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <div class="dropdown-personagens hidden" id="dropdown-personagens"></div>
            </div>

            <a href="#/login" class="btn-usuario" id="btn-usuario-header">
                <img class="header-usuario-avatar" alt="" hidden>
                <i class="fas fa-user-circle"></i>
                <span id="nome-usuario-header">Entrar</span>
            </a>
        </div>
    `;

    setTimeout(() => inicializarLogica(container), 0);
    return container;
}

let sistemaSelecionado = null;

function inicializarLogica(header) {
    const backup = header.querySelector('.header-backup');
    const controles = backup.querySelector('.header-backup-controles');
    const notificacoes = backup.querySelector('.header-notificacoes');
    const sino = notificacoes.querySelector('.header-notificacoes-sino');
    const contagem = sino.querySelector('.header-notificacoes-contagem');
    const lista = notificacoes.querySelector('.header-notificacoes-lista');
    const confirmarEmail = lista.querySelector('.header-confirmar-email');
    const botaoConfirmacoes = header.querySelector('.header-confirmacoes');
    function mostrarNotificacoes(aberto) {
        lista.hidden = !aberto;
        sino.setAttribute('aria-expanded', String(aberto));
        if (aberto) {
            const ancora = sino.getBoundingClientRect();
            const limite = document.documentElement.clientWidth - lista.offsetWidth - 8;
            lista.style.left = Math.max(8, Math.min(limite, ancora.left)) + 'px';
            lista.style.top = ancora.bottom + 7 + 'px';
        }
    }
    function atualizarNotificacoes() {
        const total = Array.from(lista.children).filter(item => !item.hidden).length;
        notificacoes.hidden = !total;
        backup.hidden = controles.hidden && !total;
        contagem.textContent = total;
        sino.setAttribute('aria-label', total === 1 ? 'Notificações, 1 pendente' : `Notificações, ${total} pendentes`);
        if (!total) mostrarNotificacoes(false);
    }
    sino.addEventListener('click', () => mostrarNotificacoes(lista.hidden));
    window.addEventListener('resize', () => {
        if (!lista.hidden) mostrarNotificacoes(true);
    });
    document.addEventListener('click', evento => {
        if (!notificacoes.contains(evento.target)) mostrarNotificacoes(false);
    });
    notificacoes.addEventListener('keydown', evento => {
        if (evento.key !== 'Escape' || lista.hidden) return;
        evento.preventDefault();
        mostrarNotificacoes(false);
        sino.focus();
    });
    confirmarEmail.addEventListener('click', () => mostrarNotificacoes(false));
    let relogioConfirmacoes;
    function atualizarConfirmacoes() {
        clearTimeout(relogioConfirmacoes);
        const fim = fimDaPausa(areaDasConfirmacoes());
        botaoConfirmacoes.parentElement.hidden = !fim;
        atualizarNotificacoes();
        if (fim) relogioConfirmacoes = setTimeout(atualizarConfirmacoes, fim - Date.now() + 50);
    }
    botaoConfirmacoes.addEventListener('click', async () => {
        const area = areaDasConfirmacoes();
        mostrarNotificacoes(false);
        if (fimDaPausa(area) && await confirmarAcao('Reativar os avisos e confirmações desta área?')) {
            definirPausaDeConfirmacoes(area, false);
        }
    });
    window.addEventListener(EVENTO_CONFIRMACOES, atualizarConfirmacoes);
    window.addEventListener('hashchange', () => {
        mostrarNotificacoes(false);
        atualizarConfirmacoes();
    });
    window.addEventListener('storage', atualizarConfirmacoes);
    window.addEventListener('focus', atualizarConfirmacoes);
    observarEstado(atualizarConfirmacoes);
    atualizarConfirmacoes();
    const tempo = backup.querySelector('.header-backup-tempo');
    const carregando = backup.querySelector('.header-backup-carregando');
    const enviar = backup.querySelector('.header-backup-enviar');
    const status = backup.querySelector('.header-backup-status');
    enviar.addEventListener('click', sincronizarAgora);
    onIdTokenChanged(auth, user => {
        confirmarEmail.parentElement.hidden = !user?.email || user.emailVerified;
        atualizarNotificacoes();
    });
    window.addEventListener('focus', async () => {
        if (confirmarEmail.parentElement.hidden || window.location.hash === '#/confirmar-email') return;
        try {
            await consultarEmailConfirmado(auth.currentUser);
        } catch (erro) {
            console.warn('[autenticacao] Não foi possível atualizar a confirmação:', erro.code);
        }
    });
    observarSincronizacao(estado => {
        controles.hidden = !estado;
        status.hidden = !estado;
        atualizarNotificacoes();
        if (!estado) return;
        tempo.textContent = estado.tempo;
        carregando.hidden = !estado.processando;
        tempo.setAttribute('aria-label', 'Próximo backup em ' + estado.tempo);
        enviar.textContent = estado.saldo == null ? 'Sincronizar agora' : `Sincronizar agora · ${estado.saldo}/5`;
        enviar.disabled = !estado.disponivel;
        if (status.textContent !== estado.mensagem) status.textContent = estado.mensagem;
        status.title = estado.mensagem;
    });
    const btnSeletor = header.querySelector('#btn-seletor');
    const dropdown = header.querySelector('#dropdown-personagens');
    const nomePersonagemAtivo = header.querySelector('#nome-personagem-ativo');
    const nomeUsuarioHeader = header.querySelector('#nome-usuario-header');
    const btnUsuarioHeader = header.querySelector('#btn-usuario-header');
    const avatar = btnUsuarioHeader.querySelector('img');
    const avatarPadrao = btnUsuarioHeader.querySelector('i');
    avatar.onload = () => { avatar.hidden = false; avatarPadrao.hidden = true; };
    avatar.onerror = () => { avatar.hidden = true; avatarPadrao.hidden = false; };

    const atualizarCabecalho = estado => {
        const foto = estado.usuario?.fotoUrl || '';
        if (foto !== (avatar.getAttribute('src') || '')) {
            avatar.hidden = true;
            avatarPadrao.hidden = false;
            if (foto) avatar.setAttribute('src', foto);
            else avatar.removeAttribute('src');
        }
        if (estado.usuario) {
            nomeUsuarioHeader.textContent = estado.usuario.nome || estado.usuario.email?.split('@')[0] || 'Perfil';
            // Se estiver logado, o botão leva para o perfil
            btnUsuarioHeader.setAttribute('href', '#/perfil');
        } else {
            nomeUsuarioHeader.textContent = 'Entrar';
            // Se não estiver logado, o botão leva para o login
            btnUsuarioHeader.setAttribute('href', '#/login');
        }

        if (estado.personagemAtivo) {
            nomePersonagemAtivo.textContent = estado.personagemAtivo.nome;
        } else {
            nomePersonagemAtivo.textContent = 'Nenhum selecionado';
        }

        if (!dropdown.classList.contains('hidden')) {
            renderizarDropdown(dropdown, nomePersonagemAtivo);
        }
    };
    atualizarCabecalho(obterEstado());
    observarEstado(atualizarCabecalho);

    btnSeletor.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        
        if (!dropdown.classList.contains('hidden')) {
            sistemaSelecionado = null; 
            renderizarDropdown(dropdown, nomePersonagemAtivo);
        }
    });

    document.addEventListener('click', (e) => {
        if (!header.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

function renderizarDropdown(dropdown, labelAtivo) {
    const estado = obterEstado();
    
    if (!estado.usuario) {
        dropdown.innerHTML = `<div class="dropdown-empty">Faça login para ver personagens.</div>`;
        return;
    }

    const personagens = estado.personagens || [];

    if (personagens.length === 0) {
        dropdown.innerHTML = `<div class="dropdown-empty">Nenhum personagem criado.</div>`;
        return;
    }

    // Extrai os sistemas únicos e ordena alfabeticamente
    const sistemasSet = new Set(personagens.map(p => p.sistema));
    const sistemas = Array.from(sistemasSet).sort();

    let html = '';

    // --- PARTE DE CIMA: SISTEMAS ---
    html += `<div class="dropdown-sistemas-wrapper">`;
    sistemas.forEach(sis => {
        const isSelected = sistemaSelecionado === sis;
        const btnClass = isSelected ? 'dropdown-item sistema-item selected' : 'dropdown-item sistema-item';
        html += `<button class="${btnClass}" data-sistema="${sis}">
                    <i class="fas fa-book"></i> ${sis}
                 </button>`;
    });
    html += `</div>`;

    // --- DIVISÓRIA E PERSONAGENS ---
    if (sistemaSelecionado) {
        html += `<div class="dropdown-divider"></div>`;
        
        const personagensFiltrados = personagens.filter(p => p.sistema === sistemaSelecionado);
        
        html += `<div class="dropdown-personagens-wrapper">`;
        personagensFiltrados.forEach(p => {
            const isActive = estado.personagemAtivo && estado.personagemAtivo.id === p.id;
            const activeClass = isActive ? 'dropdown-item personagem-item active' : 'dropdown-item personagem-item';
            html += `<button class="${activeClass}" data-id="${p.id}" data-nome="${p.nome}" data-sistema="${p.sistema}">
                        <i class="fas fa-user"></i> ${p.nome}
                     </button>`;
        });
        html += `</div>`;
    }

    dropdown.innerHTML = html;

    // Eventos dos Sistemas
    dropdown.querySelectorAll('.sistema-item').forEach(btn => {
        btn.onclick = () => {
            sistemaSelecionado = btn.dataset.sistema;
            renderizarDropdown(dropdown, labelAtivo);
        };
    });

    // Eventos dos Personagens
    dropdown.querySelectorAll('.personagem-item').forEach(btn => {
        btn.onclick = () => {
            const id = btn.dataset.id;
            const nome = btn.dataset.nome;
            const sistema = btn.dataset.sistema;
            
            definirPersonagemAtivo({ id, nome, sistema });
            labelAtivo.textContent = nome;
            dropdown.classList.add('hidden');
            sistemaSelecionado = null;
        };
    });
}
