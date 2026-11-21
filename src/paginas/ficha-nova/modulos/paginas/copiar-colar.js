import { mostrarNotificacao } from '../../../../componentes/notificacoes/notificacoes.js';
import { areaTransferenciaCodex, estado, estaEmModoEdicao, gerarId, getPaginaAtiva, salvarEstado } from './estado.js';

const LIMITE_FORA_DA_FICHA = 30 * 60 * 1000;
let ultimoBloco = null;
let saiuDaFichaEm = null;
let botaoColar = null;
let obterCampoSelecionado = null;
let renderizarPaineis = null;
let atalhosConfigurados = false;

export function configurarCopiarColar({ botao, obterCampo, renderizar }) {
    if (saiuDaFichaEm !== null && Date.now() - saiuDaFichaEm >= LIMITE_FORA_DA_FICHA) {
        ultimoBloco = null;
    }
    saiuDaFichaEm = null;
    botaoColar = botao;
    obterCampoSelecionado = obterCampo;
    renderizarPaineis = renderizar;
    atualizarBotao();
    botaoColar?.addEventListener('click', colarBloco);

    if (atalhosConfigurados) return;
    atalhosConfigurados = true;
    document.addEventListener('keydown', evento => {
        if (!botaoColar || !ultimoBloco || !estaEmModoEdicao() ||
            !(evento.ctrlKey || evento.metaKey) || evento.key.toLowerCase() !== 'v' ||
            evento.target.closest?.('input, textarea, [contenteditable]')) return;
        evento.preventDefault();
        colarBloco();
    });
}

export function desmontarCopiarColar() {
    saiuDaFichaEm = Date.now();
    botaoColar = null;
    obterCampoSelecionado = null;
    renderizarPaineis = null;
}

function atualizarBotao() {
    if (botaoColar) botaoColar.disabled = ultimoBloco === null;
}

export function copiarElemento(tipo, dados) {
    if (tipo !== 'bloco') {
        Object.assign(areaTransferenciaCodex, { tipo, dados: structuredClone(dados) });
        mostrarNotificacao('Campo copiado', '', 'sucesso');
        return;
    }
    ultimoBloco = structuredClone(dados);
    atualizarBotao();
    mostrarNotificacao('Bloco copiado', 'Use Colar no menu de edição.', 'sucesso');
}

export function copiarPagina(id) {
    const pagina = estado.paginas.find(item => item.id === id);
    if (!pagina) return;
    Object.assign(areaTransferenciaCodex, { tipo: 'pagina', dados: structuredClone(pagina) });
    mostrarNotificacao('Página copiada', '', 'sucesso');
}

function colarBloco() {
    if (!ultimoBloco || !estaEmModoEdicao()) return;
    const assistente = document.querySelector('#pagina-ficha-nova.wizard-ativo');
    const campo = assistente
        ? window._codexWizardObterCampoAtual?.()
        : getPaginaAtiva()?.paineis?.find(painel => painel.id === obterCampoSelecionado?.());
    if (!campo) {
        mostrarNotificacao('Selecione um campo', 'Escolha o campo onde deseja colar o bloco.', 'aviso');
        return;
    }

    const novoBloco = structuredClone(ultimoBloco);
    novoBloco.id = gerarId('b_');
    novoBloco.x = Math.max(0, Math.min((novoBloco.x || 0) + 10, (campo.largura || 0) - (novoBloco.largura || 0)));
    novoBloco.y = Math.max(0, Math.min((novoBloco.y || 0) + 10, (campo.altura || 0) - (novoBloco.altura || 0)));
    campo.blocos ??= [];
    campo.blocos.push(novoBloco);

    if (assistente) {
        window._codexWizardAtualizarCampo?.();
    } else {
        salvarEstado();
        renderizarPaineis?.();
    }
}
