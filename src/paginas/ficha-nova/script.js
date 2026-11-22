/* ============================================================
   CODEX — Página: Ficha Nova (Maestro)
   ============================================================ */

import { mostrarAviso } from '../../componentes/dialogos/dialogos.js';
import { armazenamentoBiblioteca, prepararBiblioteca } from '../../servicos/armazenamento/biblioteca.js';
import { iniciarZoom } from './modulos/zoom.js';
import { aplicarTamanhoDaFolha } from './modulos/tamanho-folha.js';
import { configurarMenuFicha } from './modulos/menu-ficha.js';
import { desmontarCopiarColar } from './modulos/paginas/copiar-colar.js';
import {
    iniciarPaginas,
    desmontarAtalhosEdicao,
    atualizarModoEdicao,
    acionarAdicionarCampo,
    estado,
    renderizarMenu
} from './modulos/paginas/index.js';

import { configurarWizard, abrirWizard, desmontarWizard } from './modulos/wizard/wizard.js';
import { preencherModelo } from './modulos/paginas/modelo-importado.js';

export async function montarPagina(container) {
    const rota = window.location.hash;
    await prepararBiblioteca();
    if (window.location.hash !== rota || !container.isConnected) return;
    const [rotaFicha, query] = rota.slice(1).split('?');
    const id = new URLSearchParams(query).get('id');
    return iniciarFichaNova(container, id, rotaFicha);
}

async function iniciarFichaNova(container, id, rota) {
    estado.redimensionarEmConjunto = false;
    estado.redimensionarBlocosDoCampo = true;
    const criarModelo = rota === '/ficha/nova';
    const editarModelo = rota === '/ficha/modelo';
    estado.editandoModelo = editarModelo;
    if (editarModelo) {
        const sistemas = JSON.parse(armazenamentoBiblioteca.getItem('codex_sistemas') || '[]');
        const modelo = sistemas.find(sistema => sistema.id === id);
        if (!modelo?.layout) {
            await mostrarAviso('Modelo não encontrado.');
            window.location.hash = '#/ficha';
            return;
        }
        const layout = structuredClone(modelo.layout);
        estado.paginas = layout.paginas;
        estado.paginaAtivaId = layout.paginaAtivaId || layout.paginas[0]?.id;
        estado.animacaoAtiva = layout.animacaoAtiva ?? true;
        estado.modoLayout = layout.modoLayout || 'livre';
        estado.nomeSistema = modelo.nome;
        estado.idSistemaAtual = modelo.id;
        estado.idFichaAtual = null;
    } else if (id) {
        const fichasJogador = JSON.parse(armazenamentoBiblioteca.getItem('codex_fichas_jogador') || '[]');
        const ficha = fichasJogador.find(f => f.id === id);
        
        if (ficha) {
            const sistemas = JSON.parse(armazenamentoBiblioteca.getItem('codex_sistemas') || '[]');
            const modelo = sistemas.find(sistema => sistema.id === ficha.sistemaId);
            const dados = Array.isArray(ficha.valores) && modelo
                ? preencherModelo(modelo.layout, ficha.valores, ficha.descricoes, ficha.camposColados, ficha.guiasPorPagina, ficha)
                : ficha.dados;
            if (!dados) {
                await mostrarAviso('Modelo da ficha não encontrado.');
                window.location.hash = '#/ficha';
                return;
            }
            estado.paginas = dados.paginas || [];
            estado.paginaAtivaId = dados.paginaAtivaId || (estado.paginas[0]?.id || null);
            estado.nomeSistema = modelo?.nome || '';
            estado.animacaoAtiva = dados.animacaoAtiva ?? true;
            estado.modoLayout = dados.modoLayout || 'livre';
            estado.idSistemaAtual = ficha.sistemaId;
            estado.idFichaAtual = ficha.id;
        } else {
            await mostrarAviso("Ficha não encontrada.");
            window.location.hash = '#/ficha';
            return;
        }
    } else {
        const dados = JSON.parse(localStorage.getItem('codex_ficha_dados') || 'null');
        estado.idFichaAtual = null;
        if (dados && !dados.idFichaAtual && !criarModelo) {
            estado.paginas = dados.paginas || [];
            estado.paginaAtivaId = dados.paginaAtivaId || null;
            estado.nomeSistema = dados.nomeSistema || '';
            estado.animacaoAtiva = dados.animacaoAtiva ?? true;
            estado.modoLayout = dados.modoLayout || 'livre';
            estado.idSistemaAtual = dados.idSistemaAtual || null;
        } else {
            estado.paginas = [{ id: 'pag_1', nome: 'Página 1', icone: 'fa-book', descricao: '', paineis: [] }];
            estado.paginaAtivaId = estado.paginas[0].id;
            estado.nomeSistema = '';
            estado.idSistemaAtual = null;
            estado.animacaoAtiva = true;
            estado.modoLayout = 'livre';
        }
    }

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
                                    ${editarModelo ? '<small class="folha-aviso-modelo">Modelo · preenchimentos de teste não são salvos</small>' : ''}
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
                                <button type="button" class="folha-btn-ferramenta" id="btn-redimensionar-conjunto" data-tooltip="Redimensionar em conjunto" aria-label="Redimensionar em conjunto" aria-pressed="false"><i class="fas fa-expand" aria-hidden="true"></i></button>
                                <button type="button" class="folha-btn-ferramenta ativo" id="btn-redimensionar-blocos-campo" data-tooltip="Redimensionar blocos e campos" aria-label="Redimensionar blocos e campos" aria-pressed="true"><i class="fas fa-object-group" aria-hidden="true"></i></button>
                                <button class="folha-btn-ferramenta" id="btn-add-campo" data-tooltip="Adicionar Campo"><i class="fas fa-plus-square"></i></button>
                                <button class="folha-btn-ferramenta" id="btn-add-bloco" data-tooltip="Adicionar Bloco"><i class="fas fa-cube"></i></button>
                                <button class="folha-btn-ferramenta btn-acao-selecao" id="btn-acao-config" data-tooltip="Configurar"><i class="fas fa-cog"></i></button>
                                <button class="folha-btn-ferramenta btn-acao-selecao" id="btn-acao-copiar" data-tooltip="Copiar"><i class="fas fa-copy"></i></button>
                                <button class="folha-btn-ferramenta" id="btn-acao-colar" data-tooltip="Colar" disabled><i class="fas fa-paste"></i></button>
                                <button class="folha-btn-ferramenta btn-acao-selecao" id="btn-acao-excluir" data-tooltip="Excluir"><i class="fas fa-trash-alt"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    `;
    for (const modal of container.querySelectorAll('.page-settings-overlay')) {
        if (!document.body.querySelector(':scope > #' + modal.id)) {
            document.body.appendChild(modal);
        }
    }
    container.innerHTML = htmlFicha;

    const pagina = container.querySelector('#pagina-ficha-nova');
    if (!pagina) return;
    const abrirFerramentasEdicao = configurarMenuFicha(pagina, atualizarModoEdicao);

    const wrapper = pagina.querySelector('#folha-wrapper');
    aplicarTamanhoDaFolha(pagina.querySelector('.folha'), estado.paginas.find(item => item.id === estado.paginaAtivaId));
    const ajustarZoomDoAssistente = iniciarZoom(pagina, wrapper);

    iniciarPaginas({
        menu: pagina.querySelector('#folha-paginas-menu'),
        btnAdd: pagina.querySelector('#folha-pagina-add'),
        inputTitulo: pagina.querySelector('#folha-titulo-pagina'),
        conteudo: pagina.querySelector('#folha-conteudo')
    });

    const elSistemaNome = pagina.querySelector('#folha-sistema-nome');
    elSistemaNome.textContent = estado.nomeSistema || '';
    elSistemaNome.style.display = estado.nomeSistema ? 'block' : 'none';

    configurarBotaoAdicionarCampo();

    configurarWizard(pagina, {
        abrirFerramentasEdicao,
        ajustarZoomDoAssistente,
        renderizarMenu: renderizarMenu
    });

    if (criarModelo && pagina.isConnected) abrirWizard();
    if (editarModelo) abrirFerramentasEdicao();
}

function configurarBotaoAdicionarCampo() {
    const btnAddCampo = document.querySelector('#btn-add-campo');
    if (!btnAddCampo) return;

    const novoBtn = btnAddCampo.cloneNode(true);
    btnAddCampo.parentNode.replaceChild(novoBtn, btnAddCampo);

    novoBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        acionarAdicionarCampo();
    });
}

export function desmontarPagina() {
    desmontarAtalhosEdicao();
    desmontarCopiarColar();
    const pagina = document.querySelector('#pagina-ficha-nova');
    if (!pagina) return;
    desmontarWizard();
    document.querySelectorAll('.page-settings-sheet.active').forEach(painel => painel.classList.remove('active'));
    localStorage.removeItem('codex_wizard_novo_sistema');
    window.estadoGlobal = null; // Limpa o estado global
    pagina.dataset.eventosAtivos = 'false';
}
