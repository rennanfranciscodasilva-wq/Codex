/* ============================================================
   CODEX — Componente: Cabeçalho Global
   ============================================================ */

import { obterEstado, observarEstado, definirPersonagemAtivo, definirSistemaAtivo } from '../../nucleo/estado.js';
import { version as versaoCodex } from '../../../package.json';
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
                </div>
                <button type="button" class="header-backup-enviar" hidden>Sincronizar</button>
            </div>
        </div>
        
        <div class="header-center">
            <a class="codex-title" href="#${rotaHome}" data-rota="${rotaHome}">
                Code<span>X</span><small class="codex-versao" aria-label="Versão ${versaoCodex}">${versaoCodex}</small>
            </a>
        </div>
        
        <div class="header-right">
            <div class="header-notificacoes" hidden>
                <button type="button" class="header-notificacoes-sino" aria-label="Notificações" aria-expanded="false" aria-controls="header-lista-notificacoes">
                    <i class="fas fa-bell" aria-hidden="true"></i>
                    <span class="header-notificacoes-contagem" aria-hidden="true"></span>
                </button>
                <ul class="header-notificacoes-lista" id="header-lista-notificacoes" aria-label="Notificações" popover="manual" hidden>
                    <li class="header-notificacoes-titulo" aria-hidden="true">Notificações</li>
                    <li data-aviso="email" hidden><a href="#/confirmar-email" class="header-confirmar-email">E-mail pendente · Confirmar</a></li>
                    <li data-aviso="confirmacoes" hidden><button type="button" class="header-confirmacoes">Confirmações pausadas · Reativar</button></li>
                    <li data-aviso="sincronizacao" hidden><span>Os dados atuais não estão sincronizados.</span></li>
                    <li class="header-notificacoes-vazia">Nenhuma notificação.</li>
                </ul>
            </div>
            <div class="header-perfil">
                <button type="button" class="btn-usuario" id="btn-usuario-header" aria-label="Entrar" aria-expanded="false" aria-controls="header-menu-perfil">
                    <img class="header-usuario-avatar" alt="" hidden>
                    <i class="fas fa-user-circle" aria-hidden="true"></i>
                    <span id="nome-usuario-header">Entrar</span>
                </button>
                <div class="dropdown-personagens" id="header-menu-perfil" popover="manual" hidden>
                    <a href="#/perfil" class="dropdown-item"><i class="fas fa-user" aria-hidden="true"></i> Perfil</a>
                    <button type="button" class="dropdown-item" aria-expanded="false" aria-controls="header-sistemas"><i class="fas fa-book" aria-hidden="true"></i> Selecionar sistema</button>
                    <div id="header-sistemas" hidden></div>
                    <button type="button" class="dropdown-item" aria-expanded="false" aria-controls="header-personagens" hidden><i class="fas fa-id-card" aria-hidden="true"></i> Selecionar personagem</button>
                    <div id="header-personagens" hidden></div>
                </div>
            </div>
        </div>
    `;

    setTimeout(() => inicializarLogica(container), 0);
    return container;
}

function mostrarMenuSobreposto(header, botao, painel, abrir, alinharNaBorda = false) {
    const suportaPopover = typeof painel.showPopover === 'function';
    if (!abrir && suportaPopover && painel.matches(':popover-open')) painel.hidePopover();
    painel.hidden = !abrir;
    botao.setAttribute('aria-expanded', String(abrir));
    if (!abrir) return;
    if (suportaPopover && !painel.matches(':popover-open')) painel.showPopover();
    const topo = header.getBoundingClientRect().bottom + 6;
    painel.style.setProperty('--topo-menu', topo + 'px');
    if (alinharNaBorda) return;
    const largura = document.documentElement.clientWidth;
    const ancora = botao.getBoundingClientRect();
    const lado = Math.max(8, Math.min(largura - painel.offsetWidth - 8, ancora.right - painel.offsetWidth));
    painel.style.left = lado + 'px';
}

function inicializarLogica(header) {
    const backup = header.querySelector('.header-backup');
    const controles = backup.querySelector('.header-backup-controles');
    const notificacoes = header.querySelector('.header-notificacoes');
    const sino = notificacoes.querySelector('.header-notificacoes-sino');
    const contagem = sino.querySelector('.header-notificacoes-contagem');
    const lista = notificacoes.querySelector('.header-notificacoes-lista');
    const confirmarEmail = lista.querySelector('.header-confirmar-email');
    const botaoConfirmacoes = header.querySelector('.header-confirmacoes');
    const avisoVazio = lista.querySelector('.header-notificacoes-vazia');
    const avisos = new Map();
    for (const item of lista.querySelectorAll('[data-aviso]')) {
        const check = document.createElement('button');
        check.type = 'button';
        check.className = 'header-notificacao-check';
        check.setAttribute('aria-label', 'Marcar como vista: ' + item.textContent.trim());
        check.setAttribute('aria-pressed', 'false');
        check.innerHTML = '<i class="fas fa-check" aria-hidden="true"></i>';
        check.addEventListener('click', () => {
            check.setAttribute('aria-pressed', String(check.getAttribute('aria-pressed') !== 'true'));
            atualizarNotificacoes();
        });
        item.append(check);
        avisos.set(item.dataset.aviso, { item, check, identificador: null });
    }

    function atualizarAviso(tipo, identificador) {
        const aviso = avisos.get(tipo);
        if (aviso.identificador !== identificador) {
            aviso.identificador = identificador;
            aviso.check.setAttribute('aria-pressed', 'false');
        }
        aviso.item.hidden = identificador === null;
        atualizarNotificacoes();
    }

    function mostrarNotificacoes(aberto) {
        mostrarMenuSobreposto(header, sino, lista, aberto, true);
    }
    function atualizarNotificacoes() {
        const ativos = [...avisos.values()].filter(({ item }) => !item.hidden);
        const total = ativos.filter(({ check }) => check.getAttribute('aria-pressed') !== 'true').length;
        notificacoes.hidden = controles.hidden && ativos.length === 0;
        backup.hidden = controles.hidden;
        avisoVazio.hidden = ativos.length > 0;
        contagem.hidden = total === 0;
        contagem.textContent = total;
        sino.setAttribute('aria-label', total ? `Notificações, ${total} não vistas` : 'Notificações');
        if (notificacoes.hidden) mostrarNotificacoes(false);
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
        atualizarAviso('confirmacoes', fim ? JSON.stringify([obterEstado().usuario?.uid, areaDasConfirmacoes(), fim]) : null);
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
    enviar.addEventListener('click', sincronizarAgora);
    onIdTokenChanged(auth, user => {
        atualizarAviso('email', user?.email && !user.emailVerified ? user.uid + ':' + user.email : null);
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
        enviar.hidden = !estado;
        atualizarAviso('sincronizacao', estado?.pendente ? estado.uid : null);
        if (!estado) return;
        tempo.textContent = estado.tempo;
        carregando.hidden = !estado.processando;
        tempo.setAttribute('aria-label', 'Próximo backup em ' + estado.tempo);
        enviar.disabled = !estado.disponivel;
    });
    inicializarPerfil(header);
}

function inicializarPerfil(header) {
    const perfil = header.querySelector('.header-perfil');
    const menu = perfil.querySelector('#header-menu-perfil');
    const botaoPerfil = perfil.querySelector('#btn-usuario-header');
    const nomeUsuario = perfil.querySelector('#nome-usuario-header');
    const avatar = botaoPerfil.querySelector('img');
    const avatarPadrao = botaoPerfil.querySelector('i');
    const linkPerfil = menu.querySelector('a');
    const sistemas = menu.querySelector('#header-sistemas');
    const personagens = menu.querySelector('#header-personagens');
    const botaoSistemas = sistemas.previousElementSibling;
    const botaoPersonagens = personagens.previousElementSibling;

    avatar.onload = () => { avatar.hidden = false; avatarPadrao.hidden = true; };
    avatar.onerror = () => { avatar.hidden = true; avatarPadrao.hidden = false; };

    function mostrarLista(botao, lista, aberta) {
        lista.hidden = !aberta;
        botao.setAttribute('aria-expanded', String(aberta));
    }

    function mostrarMenu(aberto) {
        mostrarMenuSobreposto(header, botaoPerfil, menu, aberto);
        mostrarLista(botaoSistemas, sistemas, false);
        mostrarLista(botaoPersonagens, personagens, false);
    }
    window.addEventListener('resize', () => {
        if (!menu.hidden) mostrarMenuSobreposto(header, botaoPerfil, menu, true);
    });

    function preencherLista(lista, itens, mensagem, criarBotao) {
        lista.replaceChildren(...itens.map(criarBotao));
        if (itens.length) return;
        const aviso = document.createElement('div');
        aviso.className = 'dropdown-empty';
        aviso.textContent = mensagem;
        lista.append(aviso);
    }

    function atualizarSeletores(estado) {
        botaoPersonagens.hidden = !estado.sistemaAtivo;
        if (botaoPersonagens.hidden) mostrarLista(botaoPersonagens, personagens, false);
        if (!sistemas.hidden) {
            preencherLista(sistemas, estado.sistemas, 'Nenhum sistema disponível.', sistema => {
                const botao = criarItemPersonagem(sistema.nome, 'fa-book', 'sistema-item');
                botao.classList.toggle('selected', estado.sistemaAtivo === sistema.id);
                botao.onclick = () => {
                    mostrarLista(botaoSistemas, sistemas, false);
                    mostrarLista(botaoPersonagens, personagens, false);
                    definirSistemaAtivo(sistema.id);
                    botaoPersonagens.focus();
                };
                return botao;
            });
        }
        if (!personagens.hidden) {
            const fichas = estado.personagens.filter(item => item.sistemaId === estado.sistemaAtivo);
            preencherLista(personagens, fichas, 'Nenhum personagem neste sistema.', personagem => {
                const botao = criarItemPersonagem(personagem.nome, 'fa-user', 'personagem-item');
                botao.classList.toggle('active', estado.personagemAtivo?.id === personagem.id);
                botao.onclick = () => {
                    definirPersonagemAtivo(personagem);
                    mostrarMenu(false);
                    botaoPerfil.focus();
                };
                return botao;
            });
        }
    }

    function atualizarPerfil(estado) {
        const usuario = estado.usuario;
        const foto = usuario?.fotoUrl || '';
        if (foto !== (avatar.getAttribute('src') || '')) {
            avatar.hidden = true;
            avatarPadrao.hidden = false;
            if (foto) avatar.src = foto;
            else avatar.removeAttribute('src');
        }
        nomeUsuario.textContent = usuario ? usuario.nome || usuario.email?.split('@')[0] || 'Perfil' : 'Entrar';
        botaoPerfil.setAttribute('aria-label', usuario ? 'Menu do perfil' : 'Entrar');
        if (!usuario && !menu.hidden) mostrarMenu(false);
        if (!menu.hidden) atualizarSeletores(estado);
    }

    atualizarPerfil(obterEstado());
    observarEstado(atualizarPerfil);
    botaoPerfil.addEventListener('click', () => {
        const estado = obterEstado();
        if (!estado.usuario) {
            window.location.hash = '#/login';
            return;
        }
        mostrarMenu(menu.hidden);
        if (!menu.hidden) atualizarSeletores(estado);
    });
    botaoSistemas.addEventListener('click', () => {
        mostrarLista(botaoSistemas, sistemas, sistemas.hidden);
        mostrarLista(botaoPersonagens, personagens, false);
        atualizarSeletores(obterEstado());
    });
    botaoPersonagens.addEventListener('click', () => {
        mostrarLista(botaoPersonagens, personagens, personagens.hidden);
        mostrarLista(botaoSistemas, sistemas, false);
        atualizarSeletores(obterEstado());
    });
    linkPerfil.addEventListener('click', () => mostrarMenu(false));
    document.addEventListener('click', evento => {
        if (!menu.hidden && !evento.composedPath().includes(perfil)) mostrarMenu(false);
    });
    window.addEventListener('hashchange', () => mostrarMenu(false));
    perfil.addEventListener('keydown', evento => {
        if (evento.key !== 'Escape' || menu.hidden) return;
        evento.preventDefault();
        mostrarMenu(false);
        botaoPerfil.focus();
    });
}

function criarItemPersonagem(nome, icone, classe) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'dropdown-item ' + classe;
    const imagem = document.createElement('i');
    imagem.className = 'fas ' + icone;
    imagem.setAttribute('aria-hidden', 'true');
    botao.append(imagem, ' ' + nome);
    return botao;
}
