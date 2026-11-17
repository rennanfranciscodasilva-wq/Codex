/* ============================================================
   CODEX — Página: Perfil (Script)
   ============================================================ */

import { obterEstado, observarEstado, definirEstado } from '../../nucleo/estado.js';
import { sair } from '../../servicos/autenticacao/autenticacao.js';
import { mostrarNotificacao } from '../../componentes/notificacoes/notificacoes.js';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../servicos/firebase/config.js'; // <-- CAMINHO CORRIGIDO

let refs = null;
let cancelarObservacao = null;
let emailVisivel = true;

export function montarPagina(container) {
    const pagina = container.querySelector('#pagina-perfil');
    if (!pagina) return;

    // Trava de segurança: se não estiver logado, vai para a Home
    const estadoAtual = obterEstado();
    if (!estadoAtual.usuario) {
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
        btnModoEdicaoFichas: pagina.querySelector('#btn-modo-edicao-fichas'),
        containerFichas: pagina.querySelector('#perfil-fichas-categorias'),
        configEmailInput: pagina.querySelector('#config-email-input'),
        
        // Modais
        modalAvatar: pagina.querySelector('#modal-avatar'),
        modalNome: pagina.querySelector('#modal-nome')
    };

    // 2. Atualiza dados iniciais
    atualizarDadosUsuario();
    renderizarFichas(); // Renderiza o estado vazio

    // 3. Observa mudanças de estado
    if (cancelarObservacao) cancelarObservacao();
    cancelarObservacao = observarEstado((estado) => {
        if (!estado.usuario) {
            window.location.hash = '#/inicio';
        } else {
            atualizarDadosUsuario();
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
        if (estado.usuario.fotoUrl) {
            const avatarImagem = refs.pagina.querySelector('#avatar-imagem');
            const avatarIcone = refs.pagina.querySelector('#avatar-icon-padrao');
            if (avatarImagem && avatarIcone) {
                avatarImagem.src = estado.usuario.fotoUrl;
                avatarImagem.style.display = 'block';
                avatarIcone.style.display = 'none';
            }
        }
    }
}

function renderizarFichas() {
    const fichas = []; // Vazio, aguardando integração com banco de fichas
    if (fichas.length === 0) {
        refs.containerFichas.innerHTML = `
            <div class="empty-state" style="text-align: center; color: #888; margin-top: 2rem;">
                <i class="fas fa-scroll" style="font-size: 3rem; margin-bottom: 1rem; color: rgba(212, 175, 55, 0.2);"></i>
                <p>Você ainda não criou nenhuma ficha.</p>
                <a href="#/ficha/nova" style="color: var(--cor-dourado); text-decoration: none; font-weight: bold;">Criar minha primeira ficha</a>
            </div>
        `;
    }
}

/* ============================================================
   EVENTOS E INTERAÇÕES
   ============================================================ */
function ativarEventos() {
    // --- 1. Troca de Abas ---
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

    // --- 2. Olhinho do E-mail ---
    if (refs.btnToggleEmail) {
        refs.btnToggleEmail.addEventListener('click', () => {
            emailVisivel = !emailVisivel;
            const emailReal = refs.email.dataset.emailReal;
            
            if (emailVisivel) {
                refs.email.textContent = emailReal;
                refs.btnToggleEmail.innerHTML = '<i class="fas fa-eye"></i>';
            } else {
                refs.email.textContent = '••••••••••••';
                refs.btnToggleEmail.innerHTML = '<i class="fas fa-eye-slash"></i>';
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

    // --- 4. Modo Edição de Fichas (Visual) ---
    if (refs.btnModoEdicaoFichas) {
        refs.btnModoEdicaoFichas.addEventListener('click', () => {
            const ativo = refs.btnModoEdicaoFichas.classList.toggle('active');
            if (ativo) {
                refs.btnModoEdicaoFichas.innerHTML = '<i class="fas fa-check"></i>';
            } else {
                refs.btnModoEdicaoFichas.innerHTML = '<i class="fas fa-pen"></i>';
            }
        });
    }

    // --- 5. Modal Editar Avatar ---
    const inputUrlAvatar = refs.pagina.querySelector('#input-url-avatar');
    const previewImg = refs.pagina.querySelector('#preview-img');
    const previewIcon = refs.pagina.querySelector('#preview-icon');
    const rangeZoom = refs.pagina.querySelector('#range-zoom');
    const rangeX = refs.pagina.querySelector('#range-x');
    const rangeY = refs.pagina.querySelector('#range-y');

    if (refs.btnEditarAvatar) {
        refs.btnEditarAvatar.addEventListener('click', () => {
            refs.modalAvatar.classList.add('active');
        });
        refs.pagina.querySelector('#btn-fechar-modal-avatar').addEventListener('click', () => {
            refs.modalAvatar.classList.remove('active');
        });
    }

    if (inputUrlAvatar) {
        inputUrlAvatar.addEventListener('input', () => {
            const url = inputUrlAvatar.value.trim();
            if (url) {
                previewImg.src = url;
                previewImg.style.display = 'block';
                previewIcon.style.display = 'none';
                aplicarTransformPreview();
            } else {
                previewImg.style.display = 'none';
                previewIcon.style.display = 'block';
            }
        });
    }

    function aplicarTransformPreview() {
        if (previewImg && previewImg.style.display !== 'none') {
            previewImg.style.transform = `scale(${rangeZoom.value}) translate(${rangeX.value}px, ${rangeY.value}px)`;
        }
    }

    if (rangeZoom) rangeZoom.addEventListener('input', aplicarTransformPreview);
    if (rangeX) rangeX.addEventListener('input', aplicarTransformPreview);
    if (rangeY) rangeY.addEventListener('input', aplicarTransformPreview);

    if (refs.pagina.querySelector('#btn-salvar-avatar')) {
        refs.pagina.querySelector('#btn-salvar-avatar').addEventListener('click', async () => {
            const url = inputUrlAvatar.value.trim();
            if (!url) return mostrarNotificacao('Erro', 'Insira uma URL válida.', 'erro');

            const estado = obterEstado();
            try {
                const usuarioRef = doc(db, 'usuarios', estado.usuario.uid);
                await updateDoc(usuarioRef, { fotoUrl: url });
                
                definirEstado({ usuario: { ...estado.usuario, fotoUrl: url } });
                
                refs.modalAvatar.classList.remove('active');
                mostrarNotificacao('Sucesso', 'Foto de perfil atualizada!', 'sucesso');
            } catch (erro) {
                console.error("Erro ao salvar avatar:", erro);
                mostrarNotificacao('Erro', 'Não foi possível salvar a foto.', 'erro');
            }
        });
    }

    // --- 6. Modal Editar Nome (Regra de 1x por semana) ---
    const inputNome = refs.pagina.querySelector('#input-nome-usuario');
    
    if (refs.btnEditarPerfil) {
        refs.btnEditarPerfil.addEventListener('click', () => {
            refs.modalNome.classList.add('active');
        });
        refs.pagina.querySelector('#btn-fechar-modal-nome').addEventListener('click', () => {
            refs.modalNome.classList.remove('active');
        });
    }

    if (refs.pagina.querySelector('#btn-salvar-nome')) {
        refs.pagina.querySelector('#btn-salvar-nome').addEventListener('click', async () => {
            const novoNome = inputNome.value.trim();
            if (!novoNome) return mostrarNotificacao('Erro', 'Digite um nome válido.', 'erro');

            const estado = obterEstado();
            const agora = new Date();
            const ultimaTroca = estado.usuario.ultimaTrocaNome ? new Date(estado.usuario.ultimaTrocaNome) : null;

            if (ultimaTroca && (agora - ultimaTroca) < 7 * 24 * 60 * 60 * 1000) {
                return mostrarNotificacao('Aguarde', 'Você só pode trocar seu nome uma vez por semana.', 'aviso');
            }

            try {
                const usuarioRef = doc(db, 'usuarios', estado.usuario.uid);
                await updateDoc(usuarioRef, { 
                    nome: novoNome,
                    ultimaTrocaNome: agora.toISOString()
                });

                definirEstado({ 
                    usuario: { ...estado.usuario, nome: novoNome, ultimaTrocaNome: agora.toISOString() } 
                });

                refs.nome.textContent = novoNome;
                refs.modalNome.classList.remove('active');
                mostrarNotificacao('Sucesso', 'Nome atualizado com sucesso!', 'sucesso');
            } catch (erro) {
                console.error("Erro ao salvar nome:", erro);
                mostrarNotificacao('Erro', 'Não foi possível alterar o nome.', 'erro');
            }
        });
    }
}