export const LIMITE_MAPA = 10;
export const DIRECOES = [
    { nome: 'Norte', x: 0, y: -1 },
    { nome: 'Sul', x: 0, y: 1 },
    { nome: 'Oeste', x: -1, y: 0 },
    { nome: 'Leste', x: 1, y: 0 }
];

function gerarId() {
    return Array.from(crypto.getRandomValues(new Uint32Array(4)), parte =>
        parte.toString(16).padStart(8, '0')).join('');
}

export function criarSistema(nome, descricao, imagemCapa) {
    return { schemaVersion: 2, nome, descricao, imagemCapa, campos: [] };
}

export const chavePosicao = (x, y) => x + ',' + y;

export function indexarCampos(campos) {
    return new Map(campos.map(campo => [chavePosicao(campo.x, campo.y), campo]));
}

export function podeAdicionarCampo(porPosicao, x, y) {
    if (!Number.isInteger(x) || !Number.isInteger(y) || Math.abs(x) > LIMITE_MAPA || Math.abs(y) > LIMITE_MAPA) return false;
    if (porPosicao.has(chavePosicao(x, y))) return false;
    return porPosicao.size === 0
        ? x === 0 && y === 0
        : DIRECOES.some(direcao => porPosicao.has(chavePosicao(x + direcao.x, y + direcao.y)));
}

export function adicionarCampo(sistema, nome, x, y) {
    if (!podeAdicionarCampo(indexarCampos(sistema.campos), x, y)) return null;

    const campo = { id: gerarId(), nome, x, y, linhas: [] };
    sistema.campos.push(campo);
    return campo;
}

export function adicionarBloco(campo) {
    const bloco = { id: gerarId(), tipo: 'textual', modelo: 'padrao', titulo: '', tamanho: { colunas: 3, linhas: 1 } };
    campo.linhas.push({ blocos: [bloco] });
    return bloco;
}

export function colarBloco(sistema, campo, original) {
    const bloco = structuredClone(original);
    bloco.id = gerarId();
    const titulo = bloco.titulo ?? '';
    for (let indice = 2; tituloDuplicado(sistema, null, bloco.titulo); indice++) {
        const sufixo = ' (' + indice + ')';
        bloco.titulo = titulo.slice(0, 120 - sufixo.length).trimEnd() + sufixo;
    }
    campo.linhas.push({ blocos: [bloco] });
    return bloco;
}

export function tamanhoBloco(bloco, indice, total) {
    const unidadeValida = n => Number.isInteger(n) && n >= 1 && n <= 3;
    if (unidadeValida(bloco.tamanho?.colunas) && unidadeValida(bloco.tamanho?.linhas)) return bloco.tamanho;
    return { colunas: Math.max(1, Math.floor(3 / total) + Number(indice < 3 % total)), linhas: 1 };
}

export const modificadorLateral = modificador => ['left', 'right'].includes(modificador?.posicao);

export function dimensoesBloco(tamanho, temTitulo, modificador) {
    const lateral = modificadorLateral(modificador);
    return {
        colunas: lateral ? Math.max(2, tamanho.colunas) : tamanho.colunas,
        linhas: tamanho.linhas + Number(temTitulo) + Number(Boolean(modificador) && !lateral)
    };
}

export function larguraBloco(bloco, indice, total) {
    return dimensoesBloco(tamanhoBloco(bloco, indice, total), false,
        bloco.tipo === 'numerico' && bloco.modificador).colunas;
}

export function ajustarLinhas(campo) {
    campo.linhas = campo.linhas.flatMap(linha => {
        const grupos = [];
        let colunas = 0;
        for (const [indice, bloco] of linha.blocos.entries()) {
            const tamanho = tamanhoBloco(bloco, indice, linha.blocos.length);
            const largura = larguraBloco(bloco, indice, linha.blocos.length);
            if (!grupos.length || colunas + largura > 3) {
                grupos.push({ ...linha, blocos: [] });
                colunas = 0;
            }
            grupos.at(-1).blocos.push(bloco);
            colunas += largura;
            bloco.tamanho = tamanho;
        }
        return grupos;
    });
}

export function moverBloco(campo, bloco, destino, indice, novaLinha) {
    const origem = campo.linhas.find(linha => linha.blocos.includes(bloco));
    if (!origem || !campo.linhas.includes(destino)) return false;
    const indiceOrigem = origem.blocos.indexOf(bloco);
    const insercao = indice - Number(origem === destino && indiceOrigem < indice);
    if (origem === destino && (novaLinha ? origem.blocos.length === 1 : insercao === indiceOrigem)) return false;
    const largura = larguraBloco(bloco, indiceOrigem, origem.blocos.length);
    if (!novaLinha) {
        const ocupadas = destino.blocos.reduce((total, item, i) =>
            total + (item === bloco ? 0 : larguraBloco(item, i, destino.blocos.length)), 0);
        if (ocupadas + largura > 3) return false;
    }
    origem.blocos.splice(indiceOrigem, 1);
    if (novaLinha) {
        campo.linhas.splice(campo.linhas.indexOf(destino) + indice, 0, { blocos: [bloco] });
    } else {
        destino.blocos.splice(insercao, 0, bloco);
    }
    if (!origem.blocos.length) campo.linhas.splice(campo.linhas.indexOf(origem), 1);
    return true;
}

export function calcularModificador(valor, { medio, cada, bonus }) {
    if (valor === '' || !Number.isFinite(Number(valor)) || !(cada > 0)) return null;
    const resultado = Math.floor((Number(valor) - medio) / cada) * bonus;
    return Number.isFinite(resultado) ? resultado : null;
}

export function blocosNumericos(sistema) {
    return sistema.campos.flatMap(campo => campo.linhas.flatMap(linha =>
        linha.blocos.filter(bloco => bloco.tipo === 'numerico').map(bloco => ({ campo, bloco }))));
}

export function tituloDuplicado(sistema, bloco, titulo) {
    const normalizar = nome => (nome ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleUpperCase('pt-BR');
    const nome = normalizar(titulo);
    if (!nome || (bloco && nome === normalizar(bloco.titulo))) return false;
    return sistema.campos.some(campo => campo.linhas.some(linha => linha.blocos.some(item =>
        item !== bloco && normalizar(item.titulo) === nome)));
}

export function termosDaFormula(formula) {
    if (!formula) return [];
    return Array.isArray(formula.termos) ? formula.termos : [formula.esquerda, formula.operador, formula.direita];
}

export const sinaisFormula = new Map([['+', '+'], ['-', '−'], ['*', '×'], ['/', '÷']]);

export function validarFormula(sistema, id, termos) {
    const referencias = termos.filter((_, indice) => indice % 2 === 0);
    if (new Set(referencias).size !== referencias.length) return false;
    const blocos = new Map(blocosNumericos(sistema).map(({ bloco }) => [bloco.id, bloco]));
    const caminho = new Set([id]);
    const visitados = new Set();
    function validar(referencia) {
        if (caminho.has(referencia) || !blocos.has(referencia)) return false;
        if (visitados.has(referencia)) return true;
        caminho.add(referencia);
        const dependencias = termosDaFormula(blocos.get(referencia).formula);
        const valida = !dependencias.length || verificar(dependencias);
        caminho.delete(referencia);
        if (valida) visitados.add(referencia);
        return valida;
    }
    function verificar(itens) {
        return itens.length % 2 === 1 && itens.every((item, indice) =>
            indice % 2 ? sinaisFormula.has(item) : validar(item));
    }
    return verificar(termos);
}

const operadores = new Map([
    ['+', (a, b) => a + b],
    ['-', (a, b) => a - b],
    ['*', (a, b) => a * b],
    ['/', (a, b) => a / b]
]);

export function calcularNumericos(sistema, valores) {
    const blocos = new Map(blocosNumericos(sistema).map(({ bloco }) => [bloco.id, bloco]));
    const resultados = new Map();
    const emCalculo = new Set();

    function calcular(id) {
        if (resultados.has(id)) return resultados.get(id);
        const bloco = blocos.get(id);
        if (!bloco || emCalculo.has(id)) return NaN;
        emCalculo.add(id);
        const formula = bloco.formula;
        const resultado = formula ? calcularFormula(termosDaFormula(formula)) : Number(valores[id] ?? 0);
        emCalculo.delete(id);
        resultados.set(id, Number.isFinite(resultado) ? resultado : NaN);
        return resultados.get(id);
    }

    function calcularFormula(termos) {
        if (termos.length % 2 !== 1) return NaN;
        let soma = 0;
        let parcela = calcular(termos[0]);
        for (let indice = 1; indice < termos.length; indice += 2) {
            const operador = termos[indice];
            const valor = calcular(termos[indice + 1]);
            if (operador === '+' || operador === '-') {
                soma += parcela;
                parcela = operadores.get(operador)(0, valor);
            } else {
                parcela = operadores.get(operador)?.(parcela, valor) ?? NaN;
            }
        }
        return soma + parcela;
    }

    return calcular;
}
