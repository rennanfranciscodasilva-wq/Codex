import { blocosNumericos, sinaisFormula, termosDaFormula, validarFormula } from './modelo.js';

export function prepararEditorFormula(obter, obterSistema, aoAlterar) {
    const equacao = obter('equacao');
    const painel = obter('formula-edicao');
    const busca = obter('buscar-bloco');
    const sugestoes = obter('sugestoes');
    const operadores = obter('operadores');
    const remover = obter('remover-termo');
    const botaoFinal = document.createElement('button');
    botaoFinal.type = 'button';
    let bloco;
    let termos = [];
    let selecionado = 0;
    let candidatos = [];

    function botao(texto, acao) {
        const elemento = document.createElement('button');
        elemento.type = 'button';
        elemento.textContent = texto;
        elemento.onclick = acao;
        return elemento;
    }

    function renderizar() {
        const nomes = new Map(candidatos.map(({ bloco }) => [bloco.id, bloco.titulo]));
        const partes = termos.map((termo, indice) => {
            const parte = botao(indice % 2 ? sinaisFormula.get(termo) ?? 'Escolher operação' :
                termo === null ? 'Escolher bloco numérico' : nomes.get(termo) || 'Bloco indisponível',
                () => editar(indice));
            parte.setAttribute('aria-pressed', String(!painel.hidden && indice === selecionado));
            return parte;
        });
        botaoFinal.textContent = termos.length % 2 ? 'Adicionar operação' : 'Escolher bloco numérico';
        botaoFinal.setAttribute('aria-pressed', String(!painel.hidden && selecionado === termos.length));
        equacao.replaceChildren(...partes, botaoFinal);
    }

    function pesquisar() {
        const normalizar = texto => texto.normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR');
        const prefixo = normalizar(busca.value.trim());
        const usados = new Set(termos.filter((_, indice) => indice % 2 === 0 && indice !== selecionado));
        const encontrados = candidatos.filter(({ bloco: item }) =>
            item.id !== bloco.id && !usados.has(item.id) && item.titulo && (normalizar(item.titulo).startsWith(prefixo) ||
                normalizar(item.descricao ?? '').split(/[^\p{L}\p{N}]+/u).some(palavra => palavra.startsWith(prefixo))));
        sugestoes.replaceChildren(...encontrados.map(({ bloco: item, campo }) => {
            const origem = campo.nome.replace(/\s+/g, ' ');
            return botao(item.titulo + ' — ' + origem, () => escolher(item.id));
        }));
        if (!encontrados.length) sugestoes.textContent = 'Nenhum bloco numérico encontrado.';
    }

    function editar(indice) {
        selecionado = indice;
        painel.hidden = false;
        const operacao = indice % 2 === 1;
        busca.hidden = sugestoes.hidden = operacao;
        operadores.hidden = !operacao;
        remover.hidden = indice >= termos.length;
        renderizar();
        if (operacao) operadores.firstElementChild.focus();
        else {
            busca.value = '';
            pesquisar();
            busca.focus();
        }
    }

    function escolher(valor) {
        const acrescentando = selecionado === termos.length;
        termos[selecionado] = valor;
        aoAlterar();
        if (acrescentando) editar(termos.length);
        else {
            painel.hidden = true;
            renderizar();
            equacao.children[selecionado].focus();
        }
    }

    botaoFinal.onclick = () => editar(termos.length);
    operadores.replaceChildren(...Array.from(sinaisFormula, ([operador, sinal]) =>
        botao(sinal, () => escolher(operador))));
    operadores.onkeydown = evento => {
        const operador = Array.from(sinaisFormula).find(([chave, sinal]) => evento.key === chave || evento.key === sinal);
        if (!operador) return;
        evento.preventDefault();
        escolher(operador[0]);
    };
    busca.oninput = pesquisar;
    busca.onkeydown = evento => {
        if (evento.key !== 'Enter') return;
        evento.preventDefault();
        sugestoes.querySelector('button')?.click();
    };
    remover.onclick = () => {
        if (selecionado < termos.length - 1) {
            termos[selecionado] = null;
            aoAlterar();
            editar(selecionado);
            return;
        }
        termos.splice(selecionado - Number(selecionado > 0 && selecionado % 2 === 0));
        aoAlterar();
        painel.hidden = true;
        renderizar();
        botaoFinal.focus();
    };

    return {
        abrir(atual) {
            bloco = atual;
            termos = [...termosDaFormula(bloco.formula)];
            candidatos = blocosNumericos(obterSistema());
            painel.hidden = true;
            renderizar();
        },
        ler() {
            if (!validarFormula(obterSistema(), bloco.id, termos)) return null;
            return { termos: [...termos] };
        }
    };
}
