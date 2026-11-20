/* ============================================================
   CODEX — Página: Ficha Nova (Maestro)
   ============================================================ */

import { iniciarZoom } from './modulos/zoom.js';
import {
    iniciarPaginas,
    atualizarModoEdicao,
    acionarAdicionarCampo,
    estado,
    salvarEstado,
    renderizarPaineis,
    renderizarMenu,
    getPaginaAtiva
} from './modulos/paginas/index.js';

import { configurarWizard, abrirWizard, desmontarWizard } from './modulos/wizard/wizard.js';

export function montarPagina(container) {
    setTimeout(() => {
        iniciarFichaNova(container);
    }, 50);
}

function iniciarFichaNova(container) {
    container.innerHTML = '';

    const htmlFicha = `
        <main id="pagina-ficha-nova" class="screen">
            <div class="ficha-nova-area">
                <div class="folha-wrapper" id="folha-wrapper">
                    <div class="folha-layout">
                        <div class="folha-menu-lateral esquerdo">
                            <div class="folha-paginas-menu" id="folha-paginas-menu">
                                <button class="folha-pagina-btn add" id="folha-pagina-add" title="Nova Página">
                                    <i class="fas fa-plus"></i>
                                </button>
                            </div>
                        </div>
                        <div class="folha" id="folha-elemento">
                            <div class="folha-cabecalho">
                                <div class="folha-titulos-wrapper">
                                    <h1 class="folha-sistema-nome" id="folha-sistema-nome"></h1>
                                    <input type="text" class="folha-titulo-pagina" id="folha-titulo-pagina" value="Página 1" spellcheck="false">
                                    <div class="folha-descricao-pagina" id="folha-descricao-pagina"></div>
                                </div>
                                <div class="folha-cabecalho-acoes">
                                    <button id="btn-exportar-ficha" class="btn-acao-header" title="Exportar"><i class="fas fa-file-export"></i></button>
                                    <button id="btn-importar-ficha" class="btn-acao-header" title="Importar"><i class="fas fa-file-import"></i></button>
                                    <button id="btn-limpar-ficha" class="btn-limpar-ficha" title="Limpar"><i class="fas fa-broom"></i> Limpar</button>
                                    <div class="indicador-zoom" id="indicador-zoom">50%</div>
                                </div>
                            </div>
                            <div class="folha-conteudo" id="folha-conteudo"></div>
                        </div>
                        <div class="folha-menu-lateral direito">
                            <button class="folha-btn-ferramenta" id="btn-toggle-animacao" data-tooltip="Animação"><i class="fas fa-film"></i></button>
                            <button class="folha-btn-ferramenta principal" id="btn-modo-edicao" data-tooltip="Modo Edição"><i class="fas fa-pen"></i></button>
                            <div class="folha-ferramentas-extras" id="folha-ferramentas-extras">
                                <button class="folha-btn-ferramenta" id="btn-modo-layout" data-tooltip="Modo Livre"><i class="fas fa-arrows-up-down-left-right"></i></button>
                                <button class="folha-btn-ferramenta" id="btn-add-campo" data-tooltip="Adicionar Campo"><i class="fas fa-plus-square"></i></button>
                                <button class="folha-btn-ferramenta" id="btn-add-bloco" data-tooltip="Adicionar Bloco"><i class="fas fa-cube"></i></button>
                                <button class="folha-btn-ferramenta btn-acao-selecao" id="btn-acao-config" data-tooltip="Configurar"><i class="fas fa-cog"></i></button>
                                <button class="folha-btn-ferramenta btn-acao-selecao" id="btn-acao-copiar" data-tooltip="Copiar"><i class="fas fa-copy"></i></button>
                                <button class="folha-btn-ferramenta btn-acao-selecao" id="btn-acao-excluir" data-tooltip="Excluir"><i class="fas fa-trash-alt"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    `;
    container.innerHTML = htmlFicha;

    const pagina = container.querySelector('#pagina-ficha-nova');
    if (!pagina) return;

    const wrapper = pagina.querySelector('#folha-wrapper');
    if (wrapper) iniciarZoom(pagina, wrapper);

    iniciarPaginas({
        menu: pagina.querySelector('#folha-paginas-menu'),
        btnAdd: pagina.querySelector('#folha-pagina-add'),
        inputTitulo: pagina.querySelector('#folha-titulo-pagina'),
        conteudo: pagina.querySelector('#folha-conteudo')
    });

    // Garante que o nome do sistema apareça logo após iniciar
    setTimeout(() => {
        const elSistemaNome = document.querySelector('#folha-sistema-nome');
        if (elSistemaNome) {
            elSistemaNome.textContent = estado.nomeSistema || '';
            elSistemaNome.style.display = estado.nomeSistema ? 'block' : 'none';
        }
    }, 0);

    const btnModoEdicao = pagina.querySelector('#btn-modo-edicao');
    const menuDireito = pagina.querySelector('.folha-menu-lateral.direito');
    if (btnModoEdicao && menuDireito) {
        const aplicarModoEdicao = (ativo) => {
            pagina.classList.toggle('modo-edicao', ativo);
            menuDireito.classList.toggle('editando', ativo);
            atualizarModoEdicao();
        };
        aplicarModoEdicao(false);
        btnModoEdicao.addEventListener('click', () => aplicarModoEdicao(!pagina.classList.contains('modo-edicao')));
    }

    // --- VINCULA O BOTÃO DE ADICIONAR CAMPO ---
    configurarBotaoAdicionarCampo();

    configurarWizard({
        renderizarPaineis: renderizarPaineis,
        renderizarMenu: renderizarMenu
    });

    setTimeout(() => {
        const forcarWizard = localStorage.getItem('codex_abrir_wizard');
        if (forcarWizard === 'true') {
            localStorage.removeItem('codex_abrir_wizard');
            abrirWizard();
            return;
        }

        // Só abre o Wizard automaticamente se não houver sistemas criados
        const sistemas = JSON.parse(localStorage.getItem('codex_sistemas') || '[]');
        const pag = getPaginaAtiva();
        const fichaVazia = !pag || !pag.paineis || pag.paineis.length === 0;
        
        if (fichaVazia && sistemas.length === 0) {
            abrirWizard();
        }
    }, 300);
}

function configurarBotaoAdicionarCampo() {
    const btnAddCampo = document.querySelector('#btn-add-campo');
    if (!btnAddCampo) return;

    // Clona para remover listeners antigos e evitar duplicação
    const novoBtn = btnAddCampo.cloneNode(true);
    btnAddCampo.parentNode.replaceChild(novoBtn, btnAddCampo);

    novoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        acionarAdicionarCampo();
    });
}

export function desmontarPagina() {
    const pagina = document.querySelector('#pagina-ficha-nova');
    if (!pagina) return;
    desmontarWizard();
    localStorage.removeItem('codex_wizard_novo_sistema'); // Remove a flag ao sair
    pagina.dataset.eventosAtivos = 'false';
}