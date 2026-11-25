/* ============================================================
   CODEX — Página: Perfil (Script)
   ============================================================ */

import { obterEstado, observarEstado, definirEstado } from '../../nucleo/estado.js';
import { sair } from '../../servicos/autenticacao/autenticacao.js';
import { abrirDialogo } from '../../componentes/dialogos/dialogos.js';
import { mostrarNotificacao } from '../../componentes/notificacoes/notificacoes.js';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../servicos/firebase/config.js';

let refs = null;
let cancelarObservacao = null;
let emailVisivel = true;

export async function montarPagina(container) {
    const pagina = container.querySelector('#pagina-perfil');
    if (!pagina) return;

    // Trava de segurança: se não estiver logado, vai para a Home
    const rota = window.location.hash;
    await auth.authStateReady();
    if (!container.isConnected || window.location.hash !== rota) return;
    if (!auth.currentUser) {
        window.location.hash = '#/inicio';
        return;
    }

    // 1. Mapeia os elementos do HTML
    refs = {
        pagina,
        nome: pagina.querySelector('#profile-name'),
        email: pagina.querySelector('#profile-email'),
        btnToggleEmail: pagina.querySelector('#btn-toggle-email'),
        btnLogout: pagina.querySelector('#btn-logout'),
        navItems: pagina.querySelectorAll('.perfil-nav-item'),
        tabContents: pagina.querySelectorAll('.perfil-tab-content'),
        btnEditarAvatar: pagina.querySelector('#btn-editar-avatar'),
        btnEditarPerfil: pagina.querySelector('#btn-editar-perfil'),
        containerFichas: pagina.querySelector('#perfil-fichas-categorias'),
        configEmailInput: pagina.querySelector('#config-email-input'),
        
        // Modais
        modalAvatar: pagina.querySelector('#modal-avatar'),
        modalNome: pagina.querySelector('#modal-nome')
    };

    // 2. Atualiza dados iniciais
    atualizarDadosUsuario();
    let fichas = obterEstado().personagens;
    renderizarFichas(fichas);

    // 3. Observa mudanças de estado
    if (cancelarObservacao) cancelarObservacao();
    cancelarObservacao = observarEstado((estado) => {
        if (!estado.usuario) {
            window.location.hash = '#/inicio';
        } else {
            atualizarDadosUsuario();
            if (fichas !== estado.personagens) {
                fichas = estado.personagens;
                renderizarFichas(fichas);
            }
        }
    });

    // 4. Ativa eventos (apenas uma vez)
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

/* ============================================================
   DADOS DO USUÁRIO
   ============================================================ */
function atualizarDadosUsuario() {
    const estado = obterEstado();
    if (estado.usuario && refs) {
        // Puxa o nome personalizado (se existir) ou o prefixo do email
        const nomeExibicao = estado.usuario.nome || estado.usuario.email.split('@')[0];
        refs.nome.textContent = nomeExibicao;
        
        refs.email.dataset.emailReal = estado.usuario.email;
        refs.email.textContent = emailVisivel ? estado.usuario.email : '••••••••••••';
        if(refs.configEmailInput) refs.configEmailInput.value = estado.usuario.email;

        // Carrega foto se existir no estado
        const avatarImagem = refs.pagina.querySelector('#avatar-imagem');
        const avatarIcone = refs.pagina.querySelector('#avatar-icon-padrao');
        const foto = estado.usuario.fotoUrl || '';
        if (foto !== (avatarImagem.getAttribute('src') || '')) {
            avatarImagem.hidden = true;
            avatarIcone.hidden = false;
            avatarImagem.onload = () => { avatarImagem.hidden = false; avatarIcone.hidden = true; };
            avatarImagem.onerror = () => { avatarImagem.hidden = true; avatarIcone.hidden = false; };
            if (foto) avatarImagem.src = foto;
            else avatarImagem.removeAttribute('src');
        }
    }
}

function renderizarFichas(fichas) {
    if (fichas.length === 0) {
        refs.containerFichas.innerHTML = `
            <div class="perfil-estado">
                <p>Você ainda não criou nenhuma ficha.</p>
                <a href="#/ficha">Abrir biblioteca de fichas</a>
            </div>
        `;
        return;
    }

    const lista = document.createElement('ul');
    lista.className = 'perfil-lista-fichas';
    for (const ficha of fichas) {
        const item = document.createElement('li');
        const link = document.createElement('a');
        link.href = '#/ficha/ficha-nova?' + new URLSearchParams({ id: ficha.id });
        link.textContent = ficha.nome;
        const sistema = document.createElement('small');
        sistema.textContent = ficha.sistema;
        if (ficha.sistema) link.append(sistema);
        item.append(link);
        lista.append(item);
    }
    refs.containerFichas.replaceChildren(lista);
}

/* ============================================================
   EVENTOS E INTERAÇÕES
   ============================================================ */
function ativarEventos() {
    // --- 1. Troca de Abas ---
    refs.navItems.forEach(item => {
        item.addEventListener('click', () => {
            refs.navItems.forEach(nav => nav.setAttribute('aria-pressed', String(nav === item)));
            const alvo = item.getAttribute('aria-controls');
            refs.tabContents.forEach(tab => { tab.hidden = tab.id !== alvo; });
        });
    });

    // --- 2. Olhinho do E-mail ---
    if (refs.btnToggleEmail) {
        refs.btnToggleEmail.addEventListener('click', () => {
            emailVisivel = !emailVisivel;
            const emailReal = refs.email.dataset.emailReal;
            refs.btnToggleEmail.setAttribute('aria-label', emailVisivel ? 'Ocultar e-mail' : 'Mostrar e-mail');
            
            if (emailVisivel) {
                refs.email.textContent = emailReal;
                refs.btnToggleEmail.innerHTML = '<i class="fas fa-eye" aria-hidden="true"></i>';
            } else {
                refs.email.textContent = '••••••••••••';
                refs.btnToggleEmail.innerHTML = '<i class="fas fa-eye-slash" aria-hidden="true"></i>';
            }
        });
    }

    // --- 3. Botão Sair da Conta ---
    if (refs.btnLogout) {
        refs.btnLogout.addEventListener('click', async () => {
            try {
                await sair();
                mostrarNotificacao('Desconectado', 'Você saiu da sua conta com sucesso.', 'sucesso');
                window.location.hash = '#/inicio';
            } catch (erro) {
                console.error("Erro ao sair:", erro);
                mostrarNotificacao('Erro', 'Não foi possível sair da conta.', 'erro');
            }
        });
    }

    refs.btnEditarAvatar.onclick = editarAvatar;
    refs.btnEditarPerfil.onclick = editarNome;
}

function copiarConteudoDoDialogo(template) {
    return template.content.firstElementChild.cloneNode(true);
}

function erroDoPerfil(conteudo, input, mensagem) {
    const erro = conteudo.querySelector('.codex-dialogo-erro');
    erro.textContent = mensagem;
    erro.hidden = false;
    input.focus();
    return null;
}

async function salvarAlteracaoDoPerfil(alteracao) {
    const usuario = obterEstado().usuario;
    if (!usuario) return null;
    await updateDoc(doc(db, 'usuarios', usuario.uid), alteracao);
    const usuarioAtual = obterEstado().usuario;
    if (usuarioAtual?.uid === usuario.uid) definirEstado({ usuario: { ...usuarioAtual, ...alteracao } });
    return true;
}

async function editarAvatar() {
    const conteudo = copiarConteudoDoDialogo(refs.modalAvatar);
    const input = conteudo.querySelector('[name="imagem"]');
    const imagem = conteudo.querySelector('img');
    const icone = conteudo.querySelector('.preview-circle i');
    const zoom = conteudo.querySelector('[name="zoom"]');
    const x = conteudo.querySelector('[name="x"]');
    const y = conteudo.querySelector('[name="y"]');
    function atualizarPosicao() {
        imagem.style.transform = 'scale(' + zoom.value + ') translate(' + x.value + 'px, ' + y.value + 'px)';
    }
    function atualizarPrevia() {
        imagem.hidden = false;
        icone.hidden = false;
        const url = input.value.trim();
        if (url) imagem.src = url;
        else {
            imagem.hidden = true;
            imagem.removeAttribute('src');
        }
    }
    imagem.onload = () => { icone.hidden = true; };
    imagem.onerror = () => { imagem.hidden = true; };
    input.value = obterEstado().usuario?.fotoUrl ?? '';
    input.oninput = atualizarPrevia;
    zoom.oninput = x.oninput = y.oninput = atualizarPosicao;
    atualizarPrevia();

    const salvo = await abrirDialogo({
        titulo: 'Editar foto de perfil',
        conteudo,
        confirmar: 'Salvar foto',
        ler: () => {
            const fotoUrl = input.value.trim();
            if (!fotoUrl) return erroDoPerfil(conteudo, input, 'Insira a URL da imagem.');
            return salvarAlteracaoDoPerfil({ fotoUrl });
        }
    });
    if (salvo) mostrarNotificacao('Sucesso', 'Foto de perfil atualizada!', 'sucesso');
}

async function editarNome() {
    const conteudo = copiarConteudoDoDialogo(refs.modalNome);
    const input = conteudo.querySelector('[name="nome"]');
    input.value = obterEstado().usuario?.nome ?? '';
    const salvo = await abrirDialogo({
        titulo: 'Editar nome',
        mensagem: 'Você pode alterar seu nome de aventureiro uma vez por semana.',
        conteudo,
        confirmar: 'Salvar nome',
        ler: () => {
            const nome = input.value.trim();
            if (!nome) return erroDoPerfil(conteudo, input, 'Digite um nome válido.');
            const agora = new Date();
            const ultimaTroca = obterEstado().usuario?.ultimaTrocaNome;
            if (ultimaTroca && agora - new Date(ultimaTroca) < 7 * 24 * 60 * 60 * 1000) {
                return erroDoPerfil(conteudo, input, 'Aguarde uma semana desde a última alteração.');
            }
            return salvarAlteracaoDoPerfil({ nome, ultimaTrocaNome: agora.toISOString() });
        }
    });
    if (salvo) mostrarNotificacao('Sucesso', 'Nome atualizado com sucesso!', 'sucesso');
}
