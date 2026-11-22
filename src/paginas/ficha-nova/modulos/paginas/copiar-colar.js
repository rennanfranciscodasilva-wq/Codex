import { mostrarNotificacao } from '../../../../componentes/notificacoes/notificacoes.js';
import { areaTransferenciaCodex, estado, estaEmModoEdicao, gerarId, getPaginaAtiva, salvarEstado } from './estado.js';

const LIMITE_FORA_DA_FICHA = 30 * 60 * 1000;
let ultimoElemento = null;
let saiuDaFichaEm = null;
let botaoColar = null;
let obterCampoSelecionado = null;
let renderizarPaineis = null;
let atalhosConfigurados = false;

export function configurarCopiarColar({ botao, obterCampo, renderizar }) {
    if (saiuDaFichaEm !== null && Date.now() - saiuDaFichaEm >= LIMITE_FORA_DA_FICHA) {
        ultimoElemento = null;
    }
    saiuDaFichaEm = null;
    botaoColar = botao;
    obterCampoSelecionado = obterCampo;
    renderizarPaineis = renderizar;
    atualizarBotaoColar();
    if (botaoColar) botaoColar.onclick = colarElemento;

    if (atalhosConfigurados) return;
    atalhosConfigurados = true;
    document.addEventListener('keydown', evento => {
        if (!botaoColar || !ultimoElemento || !estaEmModoEdicao() ||
            !(evento.ctrlKey || evento.metaKey) || evento.key.toLowerCase() !== 'v' ||
            evento.target.closest?.('input, textarea, [contenteditable]')) return;
        if (botaoColar.disabled && !document.querySelector('#pagina-ficha-nova.wizard-ativo')) return;
        evento.preventDefault();
        colarElemento();
    });
}

export function desmontarCopiarColar() {
    saiuDaFichaEm = Date.now();
    botaoColar = null;
    obterCampoSelecionado = null;
    renderizarPaineis = null;
}

export function atualizarBotaoColar() {
    if (!botaoColar) return;
    const rotulo = ultimoElemento ? `Colar ${ultimoElemento.tipo}` : 'Colar';
    botaoColar.disabled = !ultimoElemento || !obterCampoSelecionado?.();
    botaoColar.title = rotulo;
    botaoColar.dataset.tooltip = rotulo;
    botaoColar.setAttribute('aria-label', rotulo);
}

export function copiarElemento(tipo, dados) {
    ultimoElemento = { tipo, dados: structuredClone(dados) };
    atualizarBotaoColar();
    mostrarNotificacao(tipo === 'campo' ? 'Campo copiado' : 'Bloco copiado', 'Use Colar no menu de edição.', 'sucesso');
}

export function copiarPagina(id) {
    const pagina = estado.paginas.find(item => item.id === id);
    if (!pagina) return;
    Object.assign(areaTransferenciaCodex, { tipo: 'pagina', dados: structuredClone(pagina) });
    mostrarNotificacao('Página copiada', '', 'sucesso');
}

function colarElemento() {
    if (!ultimoElemento || !estaEmModoEdicao()) return;
    const assistente = document.querySelector('#pagina-ficha-nova.wizard-ativo');
    if (ultimoElemento.tipo === 'campo') {
        if (!assistente) colarCampo(ultimoElemento.dados);
        return;
    }
    const campo = assistente
        ? window._codexWizardObterCampoAtual?.()
        : getPaginaAtiva()?.paineis?.find(painel => painel.id === obterCampoSelecionado?.());
    if (!campo) {
        mostrarNotificacao('Selecione um campo', 'Escolha o campo onde deseja colar o bloco.', 'aviso');
        return;
    }

    const novoBloco = structuredClone(ultimoElemento.dados);
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

function colarCampo(original) {
    const pagina = getPaginaAtiva();
    if (!pagina) return;

    const campo = structuredClone(original);
    campo.id = gerarId('p_');
    campo.blocos ??= [];
    const idsBlocos = new Map();
    for (const bloco of campo.blocos) {
        const novoId = gerarId('b_');
        idsBlocos.set(bloco.id, novoId);
        bloco.id = novoId;
    }
    for (const bloco of campo.blocos) {
        for (const item of bloco.formula ?? []) {
            if (item.painelId !== original.id || !idsBlocos.has(item.blocoId)) continue;
            item.painelId = campo.id;
            item.blocoId = idsBlocos.get(item.blocoId);
        }
    }

    const folha = document.querySelector('#pagina-ficha-nova .folha-conteudo');
    campo.x = deslocarCampo(campo.x, campo.largura, folha?.clientWidth);
    campo.y = deslocarCampo(campo.y, campo.altura, folha?.clientHeight);
    pagina.paineis ??= [];
    pagina.paineis.push(campo);
    salvarEstado({ campoColadoId: campo.id });
    renderizarPaineis?.();
}

function deslocarCampo(posicao = 0, tamanho = 0, limite = Infinity) {
    const maximo = Math.max(0, limite - tamanho);
    const destino = posicao + 20 <= maximo ? posicao + 20 : posicao - 20;
    return Math.max(0, Math.min(destino, maximo));
}
