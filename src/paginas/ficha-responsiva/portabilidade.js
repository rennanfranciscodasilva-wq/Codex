import { urlDeImagem } from '../../componentes/imagem/url.js';
import { chavePosicao, indexarCampos, LIMITE_MAPA, podeAdicionarCampo, sinaisFormula, termosDaFormula } from './modelo.js';

const VERSAO = 1;
const LIMITE_ARQUIVO = 2 * 1024 * 1024;
const LIMITE_BLOCOS = 1024;
const alinhamentos = ['left', 'center', 'right'];

function exigir(condicao, mensagem = 'O arquivo contém dados incompatíveis com a ficha do Codex.') {
    if (!condicao) throw new Error(mensagem);
}

function objeto(valor) {
    exigir(valor && typeof valor === 'object' && !Array.isArray(valor));
    return valor;
}

function lista(valor, maximo) {
    exigir(Array.isArray(valor) && valor.length <= maximo);
    return valor;
}

function texto(valor, maximo, obrigatorio = false) {
    exigir(typeof valor === 'string' && valor.length <= maximo && (!obrigatorio || valor.trim()));
    return valor;
}

function id(valor) {
    exigir(typeof valor === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(valor) &&
        !Object.hasOwn(Object.prototype, valor) && valor !== 'prototype');
    return valor;
}

function opcao(valor, opcoes) {
    exigir(opcoes.includes(valor));
    return valor;
}

function numero(valor, minimo, maximo, inteiro = false) {
    exigir(Number.isFinite(valor) && valor >= minimo && valor <= maximo && (!inteiro || Number.isInteger(valor)));
    return valor;
}

function imagem(valor) {
    const endereco = texto(valor ?? '', 4096);
    return urlDeImagem(endereco);
}

function ajustesImagem(valor) {
    const ajustes = objeto(valor ?? {});
    return {
        zoom: numero(ajustes.zoom ?? 1, 0.1, 5),
        posX: numero(ajustes.posX ?? 0, -100, 100),
        posY: numero(ajustes.posY ?? 0, -100, 100)
    };
}

function limparBloco(valor) {
    const bloco = objeto(valor);
    const tipo = opcao(bloco.tipo, ['textual', 'numerico', 'imagem']);
    const modelo = opcao(bloco.modelo ?? (bloco.titulo ? 'titulo' : 'padrao'), ['padrao', 'titulo', 'titulo_editavel']);
    const limpo = {
        id: id(bloco.id), tipo, modelo,
        titulo: texto(bloco.titulo ?? '', 120, modelo !== 'padrao'),
        descricao: texto(bloco.descricao ?? '', 32768)
    };
    if (bloco.tamanho != null) {
        const tamanho = objeto(bloco.tamanho);
        limpo.tamanho = { colunas: numero(tamanho.colunas, 1, 3, true), linhas: numero(tamanho.linhas, 1, 3, true) };
    }
    for (const chave of ['alignBloco', 'alignTitulo', 'alignConteudo']) {
        if (bloco[chave] != null) limpo[chave] = opcao(bloco[chave], alinhamentos);
    }
    if (tipo === 'imagem' && bloco.imagemAjustes != null) limpo.imagemAjustes = ajustesImagem(bloco.imagemAjustes);
    if (tipo === 'numerico' && bloco.modificador != null) {
        const mod = objeto(bloco.modificador);
        limpo.modificador = {
            posicao: opcao(mod.posicao, ['left', 'right', 'top', 'bottom']),
            forma: opcao(mod.forma ?? 'quadrado', ['quadrado', 'circulo']),
            medio: numero(mod.medio, -Number.MAX_VALUE, Number.MAX_VALUE),
            cada: numero(mod.cada, 1, Number.MAX_SAFE_INTEGER, true),
            bonus: numero(mod.bonus, 0, Number.MAX_VALUE)
        };
    }
    if (tipo === 'numerico' && bloco.formula != null) {
        const termos = lista(termosDaFormula(objeto(bloco.formula)), 2 * LIMITE_BLOCOS - 1);
        exigir(termos.length % 2 === 1);
        limpo.formula = { termos: termos.map((termo, i) => i % 2 ? opcao(termo, [...sinaisFormula.keys()]) : id(termo)) };
    }
    return limpo;
}

function limparConteudoCampo(valor) {
    const campo = objeto(valor);
    return {
        nome: texto(campo.nome, 120, true),
        alinhamentoTitulo: opcao(campo.alinhamentoTitulo ?? 'center', alinhamentos),
        linhasTitulo: numero(campo.linhasTitulo ?? 1, 1, 3, true),
        linhas: lista(campo.linhas, LIMITE_BLOCOS).map(linha => ({
            blocos: lista(objeto(linha).blocos, LIMITE_BLOCOS).map(limparBloco)
        }))
    };
}

function limparCampo(valor) {
    const campo = objeto(valor);
    return {
        id: id(campo.id),
        x: numero(campo.x, -LIMITE_MAPA, LIMITE_MAPA, true),
        y: numero(campo.y, -LIMITE_MAPA, LIMITE_MAPA, true),
        ...limparConteudoCampo(campo)
    };
}

function indexarLayout(campos) {
    const blocos = new Map();
    const ids = new Set();
    const posicoes = new Set();
    for (const campo of campos) {
        const posicao = chavePosicao(campo.x, campo.y);
        exigir(!ids.has(campo.id) && !posicoes.has(posicao), 'A ficha possui campos com IDs ou posições repetidas.');
        ids.add(campo.id);
        posicoes.add(posicao);
        for (const linha of campo.linhas) for (const bloco of linha.blocos) {
            exigir(blocos.size < LIMITE_BLOCOS && !blocos.has(bloco.id), 'Há blocos demais ou IDs de bloco repetidos.');
            blocos.set(bloco.id, bloco);
        }
    }

    const alturas = new Map();
    const caminho = new Set();
    function altura(bloco, profundidade = 0) {
        exigir(profundidade <= 128 && !caminho.has(bloco.id), 'Há uma fórmula circular ou longa demais.');
        if (alturas.has(bloco.id)) {
            const total = alturas.get(bloco.id);
            exigir(profundidade + total <= 128, 'Há uma fórmula longa demais.');
            return total;
        }
        caminho.add(bloco.id);
        let total = 0;
        for (const [indice, termo] of (bloco.formula?.termos ?? []).entries()) {
            if (indice % 2) continue;
            const origem = blocos.get(termo);
            exigir(origem?.tipo === 'numerico', 'Uma fórmula aponta para um bloco numérico que não está na ficha.');
            total = Math.max(total, 1 + altura(origem, profundidade + 1));
        }
        caminho.delete(bloco.id);
        alturas.set(bloco.id, total);
        return total;
    }
    for (const bloco of blocos.values()) altura(bloco);
    return blocos;
}

function limparModelo(valor) {
    const modelo = objeto(valor);
    const layout = objeto(modelo.layout);
    exigir(layout.schemaVersion === 2, 'Este arquivo usa uma versão de modelo incompatível.');
    const nome = texto(modelo.nome, 120, true);
    const descricao = texto(modelo.descricao ?? '', 2000);
    const imagemCapa = imagem(modelo.imagemCapa ?? layout.imagemCapa);
    const imagemAjustes = ajustesImagem(modelo.imagemAjustes ?? layout.imagemAjustes);
    const campos = lista(layout.campos, (2 * LIMITE_MAPA + 1) ** 2).map(limparCampo);
    exigir(campos.length, 'O modelo não contém campos.');
    indexarLayout(campos);
    return {
        origemJson: id(modelo.origemJson ?? modelo.id), nome, descricao, imagemCapa, imagemAjustes,
        layout: { schemaVersion: 2, nome, descricao, imagemCapa, imagemAjustes, campos }
    };
}

function limparFicha(valor, modelo) {
    const ficha = objeto(valor);
    const campos = lista(objeto(modelo.layout).campos, (2 * LIMITE_MAPA + 1) ** 2).map(limparCampo);
    const ajustes = objeto(ficha.camposEditados ?? {});
    const camposEditados = {};
    for (const campo of campos) {
        if (!Object.hasOwn(ajustes, campo.id)) continue;
        const ajuste = limparConteudoCampo(ajustes[campo.id]);
        Object.assign(campo, ajuste);
        camposEditados[campo.id] = ajuste;
    }
    const camposCriados = lista(ficha.camposCriados ?? [], (2 * LIMITE_MAPA + 1) ** 2).map(limparCampo);
    const ocupados = indexarCampos(campos);
    for (const campo of camposCriados) {
        exigir(podeAdicionarCampo(ocupados, campo.x, campo.y), 'Há um campo do personagem fora do mapa disponível.');
        ocupados.set(chavePosicao(campo.x, campo.y), campo);
    }
    const blocos = indexarLayout([...campos, ...camposCriados]);
    const valores = {};
    const titulosBlocos = {};
    const dados = objeto(ficha.valores ?? {});
    const titulos = objeto(ficha.titulosBlocos ?? {});
    for (const [chave, bloco] of blocos) {
        if (Object.hasOwn(dados, chave)) {
            const dado = dados[chave];
            const valor = texto(bloco.tipo === 'numerico' && Number.isFinite(dado) ? String(dado) : dado, 32768);
            if (bloco.tipo === 'numerico') {
                exigir(valor === '' || (/^-?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(valor) && Number.isFinite(Number(valor))));
            }
            valores[chave] = bloco.tipo === 'imagem' ? imagem(valor) : valor;
        }
        if (bloco.modelo === 'titulo_editavel' && Object.hasOwn(titulos, chave)) {
            titulosBlocos[chave] = texto(titulos[chave], 120);
        }
    }
    return {
        nomePersonagem: texto(ficha.nomePersonagem, 120, true),
        imagemUrl: imagem(ficha.imagemUrl),
        imagemAjustes: ajustesImagem(ficha.imagemAjustes),
        valores, titulosBlocos, camposEditados, camposCriados
    };
}

function lerEnvelope(valor, formato) {
    const dados = objeto(valor);
    exigir(dados.formato === formato && dados.versao === VERSAO,
        formato === 'codex-modelo' ? 'Selecione um JSON de modelo do Codex.' : 'Selecione um JSON de personagem do Codex.');
    return dados;
}

export function exportarModelo(modelo) {
    return { formato: 'codex-modelo', versao: VERSAO, modelo: limparModelo(modelo) };
}

export function importarModelo(valor) {
    return limparModelo(lerEnvelope(valor, 'codex-modelo').modelo);
}

export function exportarFicha(ficha, modelo) {
    const valores = { ...modelo.valoresPadrao, ...ficha.valores };
    return {
        formato: 'codex-personagem', versao: VERSAO, modelo: id(modelo.origemJson ?? modelo.id),
        ficha: limparFicha({ ...ficha, valores }, modelo)
    };
}

export function importarFicha(valor, modelo) {
    const dados = lerEnvelope(valor, 'codex-personagem');
    exigir(dados.modelo === (modelo.origemJson ?? modelo.id), 'Este personagem pertence a outro modelo. Abra o modelo correspondente.');
    return limparFicha(dados.ficha, modelo);
}

export async function lerArquivoJson(arquivo) {
    exigir(arquivo.size <= LIMITE_ARQUIVO, 'O arquivo JSON ultrapassa 2 MB.');
    const conteudo = await arquivo.text();
    try {
        return JSON.parse(conteudo.replace(/^\uFEFF/, ''));
    } catch {
        throw new Error('O arquivo não contém um JSON válido.');
    }
}

export function baixarJson(nome, valor) {
    const arquivo = new Blob([JSON.stringify(valor, null, 2)], { type: 'application/json' });
    exigir(arquivo.size <= LIMITE_ARQUIVO, 'O arquivo JSON ultrapassa 2 MB.');
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement('a');
    link.href = url;
    link.download = (nome.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim().replace(/[. ]+$/, '') || 'codex') + '.json';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
