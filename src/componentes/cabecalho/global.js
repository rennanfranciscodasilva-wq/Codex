/* ============================================================
   COMPONENTE GLOBAL — Cabeçalho do Codex
   ============================================================ */

import { obterEstado, observarEstado, definirPersonagemAtivo } from '../../nucleo/estado.js';

export function criarCabecalhoGlobal() {
    const container = document.createElement('header');
    container.className = 'codex-global-header';
    
    // Estrutura HTML inicial
    container.innerHTML = `
        <div class="header-left">
            <a href="#/inicio" class="codex-logo" data-rota="/inicio">Code<span>X</span></a>
        </div>
        
        <div class="header-center">
            <div class="seletor-personagem" id="seletor-personagem">
                <button class="btn-seletor" id="btn-seletor">
                    <span id="nome-personagem-ativo">Nenhum selecionado</span>
                    <i class="fas fa-chevron-down"></i>
                </button>
                <!-- Dropdown -->
                <div class="dropdown-personagens hidden" id="dropdown-personagens">
                    <!-- O conteúdo será injetado via JS -->
                </div>
            </div>
        </div>
        
        <div class="header-right">
            <a href="#/perfil" class="btn-usuario" data-rota="/perfil">
                <i class="fas fa-user-circle"></i>
                <span id="nome-usuario-header">Entrar</span>
            </a>
        </div>
    `;

    // Lógica após o elemento estar no DOM
    setTimeout(() => inicializarLogicaCabecalho(container), 0);

    return container;
}

function inicializarLogicaCabecalho(container) {
    const btnSeletor = container.querySelector('#btn-seletor');
    const dropdown = container.querySelector('#dropdown-personagens');
    const nomePersonagemAtivo = container.querySelector('#nome-personagem-ativo');
    const nomeUsuarioHeader = container.querySelector('#nome-usuario-header');

    // 1. Atualizar Nome do Usuário e Personagem Ativo no Header
    observarEstado((estado) => {
        // Atualiza Nome do Usuário
        if (estado.usuario) {
            nomeUsuarioHeader.textContent = estado.usuario.email.split('@')[0];
        } else {
            nomeUsuarioHeader.textContent = 'Entrar';
        }

        // Atualiza Nome do Personagem
        if (estado.personagemAtivo) {
            nomePersonagemAtivo.textContent = estado.personagemAtivo.nome;
        } else {
            nomePersonagemAtivo.textContent = 'Nenhum selecionado';
        }
    });

    // 2. Abrir/Fechar Dropdown
    btnSeletor.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('hidden');
        if (!dropdown.classList.contains('hidden')) {
            renderizarDropdown(container, dropdown, nomePersonagemAtivo);
        }
    });

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
}

function renderizarDropdown(container, dropdown, labelAtivo) {
    const estado = obterEstado();
    
    // Se não estiver logado
    if (!estado.usuario) {
        dropdown.innerHTML = `<div class="dropdown-empty">Faça login para ver seus personagens.</div>`;
        return;
    }

    // Se não tiver personagens (Ainda não temos Firestore, então vamos simular)
    if (!estado.personagens || estado.personagens.length === 0) {
        // SIMULAÇÃO TEMPORÁRIA PARA VER O DESIGN
        const personagensFake = [
            { id: 1, nome: 'Kael, o Bárbaro', sistema: 'Vastura' },
            { id: 2, nome: 'Lyra, a Feiticeira', sistema: 'Vastura' },
            { id: 3, nome: 'Thorin', sistema: 'Old Dragon' }
        ];

        // Agrupa por sistema
        const sistemas = {};
        personagensFake.forEach(p => {
            if (!sistemas[p.sistema]) sistemas[p.sistema] = [];
            sistemas[p.sistema].push(p);
        });

        // Gera o HTML da Etapa 1 (Sistemas)
        let html = `<div class="dropdown-etapa-1">`;
        for (const sistema in sistemas) {
            html += `<button class="dropdown-item sistema-item" data-sistema="${sistema}">
                        <i class="fas fa-book"></i> ${sistema}
                     </button>`;
        }
        html += `</div>`;

        // Gera as Etapas 2 (Personagens ocultos por padrão)
        for (const sistema in sistemas) {
            html += `<div class="dropdown-etapa-2 hidden" id="lista-${sistema.replace(/\s/g, '')}">`;
            html += `<button class="btn-voltar-sistema"><i class="fas fa-arrow-left"></i> Voltar</button>`;
            sistemas[sistema].forEach(p => {
                html += `<button class="dropdown-item personagem-item" data-id="${p.id}" data-nome="${p.nome}" data-sistema="${p.sistema}">
                            <i class="fas fa-user"></i> ${p.nome}
                         </button>`;
            });
            html += `</div>`;
        }

        dropdown.innerHTML = html;

        // Adiciona eventos de navegação do dropdown
        dropdown.querySelectorAll('.sistema-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const sistema = btn.getAttribute('data-sistema');
                dropdown.querySelectorAll('.dropdown-etapa-1, .dropdown-etapa-2').forEach(el => el.classList.add('hidden'));
                dropdown.querySelector(`#lista-${sistema.replace(/\s/g, '')}`).classList.remove('hidden');
            });
        });

        dropdown.querySelectorAll('.btn-voltar-sistema').forEach(btn => {
            btn.addEventListener('click', () => {
                dropdown.querySelectorAll('.dropdown-etapa-1, .dropdown-etapa-2').forEach(el => el.classList.add('hidden'));
                dropdown.querySelector('.dropdown-etapa-1').classList.remove('hidden');
            });
        });

        dropdown.querySelectorAll('.personagem-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const nome = btn.getAttribute('data-nome');
                const sistema = btn.getAttribute('data-sistema');
                
                definirPersonagemAtivo({ id, nome, sistema });
                labelAtivo.textContent = nome;
                dropdown.classList.add('hidden');
            });
        });
    }
}