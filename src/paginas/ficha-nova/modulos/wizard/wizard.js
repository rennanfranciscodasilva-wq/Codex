/* ============================================================
   CODEX — Wizard: Orquestrador
   ============================================================ */

import { mostrarAviso } from '../../../../componentes/dialogos/dialogos.js';
import { estado, salvarEstado, gerarId } from '../paginas/estado.js';
import { configurarPreviewImagem } from './passo1-preview.js';
import { criarAmbienteDeCampo } from './passo2-render.js';
import { capturarCampoAtual, executarFinalizar } from './finalizar.js';
import { configurarCarregamentoModelo } from '../paginas/json.js';
import { validarNomeNaConta } from '../../../../servicos/armazenamento/biblioteca.js';
import { excluirRascunho, lerRascunho, observarRascunho, salvarRascunho } from './rascunho.js';
import { configurarOrigemFormulas } from '../automacao.js';

let refs = null;
let cbRenderizarMenu = null;
let sistemaEmCriacao = { 
    nome: '', 
    descricao: '', 
    imagemCapa: '', 
    imagemAjustes: { zoom: 0.5, posX: 0, posY: 0 }, 
    campos: [],
    campoAtual: null
};
let contadorCampo = 1;
let acaoPendente = null;

function injetarHTMLWizard(pagina) {
    if (pagina.querySelector('#wizard-overlay')) return;

    const wizardHTML = `
        <div id="wizard-overlay" class="hidden">
            <div id="wizard-step-1">
                <div class="wizard-step-1-cabecalho">
                    <h2 class="wizard-title">Criar Novo Sistema</h2>
                    <button id="btn-wizard-fechar" type="button" aria-label="Voltar à seleção de sistemas" title="Voltar à seleção de sistemas">
                        <i class="fas fa-times" aria-hidden="true"></i>
                    </button>
                </div>
                <div class="wizard-step-1-conteudo">
                    <p class="wizard-desc">Dê um nome e uma descrição para o seu sistema de RPG.</p>

                    <div class="wizard-field">
                        <label>Nome do Sistema</label>
                        <input type="text" id="wizard-input-nome-sistema" placeholder="Ex: D&D 5e, Ordem Paranormal...">
                    </div>

                    <div class="wizard-field">
                        <label>Descrição Breve</label>
                        <textarea id="wizard-input-desc-sistema" placeholder="Uma breve descrição..." rows="2"></textarea>
                    </div>

                    <div class="wizard-field" style="flex-direction: row; align-items: flex-start; gap: 15px; flex-wrap: wrap;">
                        <div style="flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 0.5rem;">
                            <label>URL da Imagem de Capa (Opcional)</label>
                            <input type="text" id="wizard-input-imagem-sistema" placeholder="https://exemplo.com/imagem.png">

                            <div class="wizard-preview-controles ajustes-imagem" hidden></div>
                            <p class="previa-imagem-status" role="status"></p>
                        </div>

                        <div id="wizard-img-preview-wrapper" class="previa-imagem" hidden>
                            <img id="wizard-img-preview" alt="Prévia da capa" hidden>
                        </div>
                    </div>

                </div>
                <div class="wizard-step-1-acoes">
                    <button id="btn-wizard-carregar-modelo" type="button" class="btn-secondary">Carregar modelo</button>
                    <button id="btn-wizard-proximo" type="button">Próximo Passo</button>
                </div>
            </div>

            <div id="wizard-step-2">
                <div class="wizard-barra-acoes">
                    <button id="btn-wizard-cancelar" style="background: rgba(180, 40, 40, 0.15); border: 1px solid #b42828; color: #ff8a8a; margin-right: auto;">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button id="btn-wizard-proximo-campo">Salvar e Criar Próximo Campo</button>
                    <button id="btn-wizard-finalizar">Finalizar e ir para Personagens</button>
                </div>
            </div>

            <div id="wizard-modal-confirmacao" class="hidden">
                <div class="wizard-modal-box">
                    <h3>Atenção</h3>
                    <p id="wizard-modal-texto">Tem certeza?</p>
                    <div class="wizard-modal-acoes" id="wizard-modal-acoes-container"></div>
                </div>
            </div>
        </div>
    `;

    pagina.insertAdjacentHTML('beforeend', wizardHTML);
}

export function configurarWizard(pagina, callbacks) {
    cbRenderizarMenu = callbacks.renderizarMenu || null;

    injetarHTMLWizard(pagina);

    refs = {
        pagina,
        abrirFerramentasEdicao: callbacks.abrirFerramentasEdicao,
        ajustarZoomDoAssistente: callbacks.ajustarZoomDoAssistente,
        overlay: pagina.querySelector('#wizard-overlay'),
        step1: pagina.querySelector('#wizard-step-1'),
        step2: pagina.querySelector('#wizard-step-2'),
        inputNome: pagina.querySelector('#wizard-input-nome-sistema'),
        inputDesc: pagina.querySelector('#wizard-input-desc-sistema'),
        inputImagem: pagina.querySelector('#wizard-input-imagem-sistema'),
        previewWrapper: pagina.querySelector('#wizard-img-preview-wrapper'),
        previewImg: pagina.querySelector('#wizard-img-preview'),
        previewStatus: pagina.querySelector('#wizard-step-1 .previa-imagem-status'),
        controls: pagina.querySelector('.wizard-preview-controles'),
        btnProximo: pagina.querySelector('#btn-wizard-proximo'),
        btnCancelar: pagina.querySelector('#btn-wizard-cancelar'),
        btnProximoCampo: pagina.querySelector('#btn-wizard-proximo-campo'),
        btnFinalizar: pagina.querySelector('#btn-wizard-finalizar'),
        modal: pagina.querySelector('#wizard-modal-confirmacao'),
        modalTexto: pagina.querySelector('#wizard-modal-texto'),
        modalAcoes: pagina.querySelector('#wizard-modal-acoes-container')
    };

    if (!refs.overlay || refs.overlay.dataset.eventosAtivos === 'true') return;
    refs.overlay.dataset.eventosAtivos = 'true';

    refs.atualizarPreview = configurarPreviewImagem(refs, sistemaEmCriacao);
    configurarCarregamentoModelo(pagina.querySelector('#btn-wizard-carregar-modelo'));
    pagina.querySelector('#btn-wizard-fechar').addEventListener('click', () => {
        window.location.hash = '#/ficha';
    });

    refs.btnProximo.addEventListener('click', async () => {
        const nome = refs.inputNome.value.trim();
        if (!nome) return mostrarAviso('Digite o nome do sistema.');
        const formulario = refs;
        formulario.btnProximo.disabled = true;
        try {
            await validarNomeNaConta('codex_sistemas', { nome });
        } catch (erro) {
            return mostrarAviso(erro.code === 'backup/nome-ocupado' ? erro.message : 'Não foi possível conferir o nome do sistema.');
        } finally {
            formulario.btnProximo.disabled = false;
        }
        if (refs !== formulario || !formulario.pagina.isConnected) return;
        sistemaEmCriacao.nome = nome;
        sistemaEmCriacao.descricao = refs.inputDesc.value.trim();
        sistemaEmCriacao.campos = [];
        sistemaEmCriacao.campoAtual = null;
        contadorCampo = 1;
        entrarNoModoEditor();
    });

    refs.btnProximoCampo.addEventListener('click', () => solicitarConfirmacao('proximo'));
    refs.btnFinalizar.addEventListener('click', () => solicitarConfirmacao('finalizar'));
    refs.btnCancelar.addEventListener('click', () => solicitarConfirmacao('cancelar'));
}

export function abrirWizard() {
    if (!refs || !refs.overlay) return;
    
    localStorage.setItem('codex_wizard_novo_sistema', 'true');
    
    Object.assign(sistemaEmCriacao, {
        nome: '', 
        descricao: '', 
        imagemCapa: '', 
        imagemAjustes: { zoom: 0.5, posX: 0, posY: 0 }, 
        campos: [],
        campoAtual: null
    });
    contadorCampo = 1;

    limparEditor(); 

    refs.overlay.classList.remove('hidden');
    refs.step1.classList.remove('hidden');

    const rascunho = lerRascunho();
    if (rascunho?.sistema?.campoAtual && Array.isArray(rascunho.paginas)) {
        Object.assign(sistemaEmCriacao, rascunho.sistema);
        contadorCampo = rascunho.contador;
        estado.paginas = rascunho.paginas;
        estado.paginaAtivaId = rascunho.paginaAtivaId;
        refs.inputNome.value = sistemaEmCriacao.nome;
        refs.inputDesc.value = sistemaEmCriacao.descricao;
        refs.atualizarPreview();
        entrarNoModoEditor(true);
        return;
    }
    
    if (refs.inputNome) refs.inputNome.value = '';
    if (refs.inputDesc) refs.inputDesc.value = '';
    refs.atualizarPreview();
    
    const elSistemaNome = document.querySelector('#folha-sistema-nome');
    if (elSistemaNome) {
        elSistemaNome.textContent = '';
        elSistemaNome.style.display = 'none';
    }
}

export function desmontarWizard() {
    // A folha e o assistente saem juntos com a transição da página.
    observarRascunho(null);
    configurarOrigemFormulas(null);
}

function limparEditor() {
    if (!refs || !refs.overlay) return;

    refs.overlay.classList.remove('wizard-modo-editor');
    refs.overlay.classList.add('hidden');
    refs.step2.classList.remove('active');
    
    refs.pagina.classList.remove('wizard-ativo', 'modo-edicao');
    const menuDireito = refs.pagina.querySelector('.folha-menu-lateral.direito');
    if (menuDireito) menuDireito.classList.remove('editando');

    const barraAcoes = refs.pagina.querySelector('.wizard-barra-acoes');
    if (barraAcoes) barraAcoes.style.display = '';

    const btnAnimacao = refs.pagina.querySelector('#btn-toggle-animacao');
    const btnModoEdicao = refs.pagina.querySelector('#btn-modo-edicao');
    const btnAddCampo = refs.pagina.querySelector('#btn-add-campo');
    if (btnAnimacao) btnAnimacao.style.display = '';
    if (btnModoEdicao) btnModoEdicao.style.display = '';
    if (btnAddCampo) btnAddCampo.style.display = '';

    const folhaConteudo = refs.pagina.querySelector('#folha-conteudo');
    if (folhaConteudo) folhaConteudo.innerHTML = '';

    sistemaEmCriacao.campoAtual = null;
    sistemaEmCriacao.campos = [];
    contadorCampo = 1;
}

function solicitarConfirmacao(acao) {
    acaoPendente = acao;
    refs.modalAcoes.innerHTML = '';

    if (acao === 'cancelar') {
        refs.modalTexto.textContent = 'O que deseja fazer com o modelo em criação?';
        refs.modalAcoes.innerHTML = `
            <button class="btn-secondary" id="btn-cancelar-voltar">Voltar ao Passo 1</button>
            <button class="btn-secondary" id="btn-cancelar-finalizar">Finalizar e ir para Personagens</button>
            <button class="btn-secondary" id="btn-cancelar-edicao">Cancelar</button>
        `;
        refs.modal.classList.remove('hidden');
        document.querySelector('#btn-cancelar-edicao').onclick = fecharModal;

        document.querySelector('#btn-cancelar-voltar').onclick = () => {
            fecharModal();
            excluirRascunho();
            limparEditor();
            
            refs.overlay.classList.remove('hidden');
            refs.step1.classList.remove('hidden');
            window.location.hash = '#/ficha/nova';
        };

        document.querySelector('#btn-cancelar-finalizar').onclick = () => {
            fecharModal();
            executarFinalizar(sistemaEmCriacao, refs);
        };
        return;
    }

    refs.modalTexto.textContent = acao === 'proximo'
        ? 'Deseja salvar este campo e criar um novo?'
        : 'Deseja salvar o modelo e ir para o seletor de personagens?';
    
    refs.modalAcoes.innerHTML = `
        <button class="btn-secondary" id="btn-modal-cancelar">Cancelar</button>
        <button class="btn-primary" id="btn-modal-confirmar">${acao === 'finalizar' ? 'Finalizar modelo' : 'Sim, continuar'}</button>
    `;
    refs.modal.classList.remove('hidden');

    document.querySelector('#btn-modal-cancelar').onclick = fecharModal;
    document.querySelector('#btn-modal-confirmar').onclick = () => {
        fecharModal();
        if (acao === 'proximo') executarProximoCampo();
        else if (acao === 'finalizar') executarFinalizar(sistemaEmCriacao, refs);
    };
}

function fecharModal() {
    refs.modal.classList.add('hidden');
    acaoPendente = null;
}

function entrarNoModoEditor(restaurando = false) {
    refs.step1.classList.add('hidden');
    refs.step2.classList.add('active');
    refs.overlay.classList.add('wizard-modo-editor');
    
    refs.pagina.classList.add('modo-edicao', 'wizard-ativo');
    
    refs.abrirFerramentasEdicao();
    refs.ajustarZoomDoAssistente();

    const btnAddCampo = refs.pagina.querySelector('#btn-add-campo');
    if (btnAddCampo) btnAddCampo.style.display = 'none';

    const barraAcoes = refs.pagina.querySelector('.wizard-barra-acoes');
    if (barraAcoes) barraAcoes.style.display = '';

    const elSistemaNome = document.querySelector('#folha-sistema-nome');
    if (elSistemaNome) {
        elSistemaNome.textContent = sistemaEmCriacao.nome || '';
        elSistemaNome.style.display = sistemaEmCriacao.nome ? 'block' : 'none';
    }

    sistemaEmCriacao.campoAtual ??= {
        id: gerarId('p_'),
        titulo: 'Campo ' + contadorCampo,
        x: 40, y: 30,
        largura: 500,
        altura: 400,
        blocos: []
    };

    if (estado.paginas.length === 0) {
        const paginaNova = {
            id: gerarId('pag_'),
            nome: 'Página 1',
            icone: 'fa-book',
            descricao: '',
            paineis: []
        };
        estado.paginas = [paginaNova];
        estado.paginaAtivaId = paginaNova.id;
        salvarEstado();
    } else if (!restaurando) {
        // Reseta para a primeira página ao entrar no editor
        estado.paginaAtivaId = estado.paginas[0].id;
        salvarEstado();
    }

    configurarOrigemFormulas(() => {
        if (!refs.pagina.classList.contains('wizard-ativo')) return null;
        const paginas = estado.paginas.map(pagina => ({ ...pagina, paineis: [] }));
        const porId = new Map(paginas.map(pagina => [pagina.id, pagina]));
        const campoAtual = sistemaEmCriacao.campoAtual;
        for (const campo of sistemaEmCriacao.campos) {
            if (campo.id !== campoAtual?.id) {
                (porId.get(campo.paginaDestino) ?? paginas[0])?.paineis.push(campo);
            }
        }
        if (campoAtual) (porId.get(estado.paginaAtivaId) ?? paginas[0])?.paineis.push(campoAtual);
        return paginas;
    });
    criarAmbienteDeCampo(refs, cbRenderizarMenu, contadorCampo, sistemaEmCriacao.campoAtual);
    observarRascunho(() => ({
        sistema: sistemaEmCriacao, contador: contadorCampo,
        paginas: estado.paginas, paginaAtivaId: estado.paginaAtivaId
    }));
    salvarRascunho();
}

function executarProximoCampo() {
    capturarCampoAtual(sistemaEmCriacao);
    
    // Limpa o campo atual APÓS capturar, para o próximo ser criado do zero
    sistemaEmCriacao.campoAtual = null;
    
    contadorCampo++;
    sistemaEmCriacao.campoAtual = {
        id: gerarId('p_'),
        titulo: 'Campo ' + contadorCampo,
        x: 40, y: 30,
        largura: 500,
        altura: 400,
        blocos: []
    };
    criarAmbienteDeCampo(refs, cbRenderizarMenu, contadorCampo, sistemaEmCriacao.campoAtual);
    salvarRascunho();
}
