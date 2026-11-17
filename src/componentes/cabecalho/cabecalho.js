/* ============================================================
   CODEX — Componente: Cabeçalho Global
   ============================================================ */

import { obterEstado, observarEstado, definirPersonagemAtivo } from '../../nucleo/estado.js';

export function criarCabecalho({ rotaHome = '/inicio' } = {}) {
    const container = document.createElement('header');
    container.className = 'codex-global-header';
    
    container.innerHTML = `
        <div class="header-left"></div>
        
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
    const btnSeletor = header.querySelector('#btn-seletor');
    const dropdown = header.querySelector('#dropdown-personagens');
    const nomePersonagemAtivo = header.querySelector('#nome-personagem-ativo');
    const nomeUsuarioHeader = header.querySelector('#nome-usuario-header');
    const btnUsuarioHeader = header.querySelector('#btn-usuario-header');

    observarEstado((estado) => {
        if (estado.usuario) {
            nomeUsuarioHeader.textContent = estado.usuario.email.split('@')[0];
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
    });

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