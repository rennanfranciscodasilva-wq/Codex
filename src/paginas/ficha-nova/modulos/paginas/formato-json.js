import { urlDeImagem } from '../../../../componentes/imagem/url.js';

const texto = valor => typeof valor === 'string';
const id = valor => texto(valor) && /^[\w-]+$/.test(valor);
const numero = Number.isFinite;
const numeroOuTextoNumerico = valor => numero(valor) ||
    (texto(valor) && (valor === '' || (valor.trim() && numero(Number(valor)))));
const opcao = (...valores) => valor => valores.includes(valor);
const alinhamento = opcao('left', 'center', 'right');
const geometria = { x: numero, y: numero, largura: numero, altura: numero };

function copiarCampos(origem, regras) {
    const dados = {};
    for (const [chave, validar] of Object.entries(regras)) {
        if (Object.hasOwn(origem, chave) && validar(origem[chave])) dados[chave] = origem[chave];
    }
    return dados;
}

function estruturaInvalida() {
    throw new Error('O arquivo contém páginas, campos, blocos ou fórmulas inválidos.');
}

function lista(itens, ler) {
    if (!Array.isArray(itens)) estruturaInvalida();
    return itens.map(ler);
}

function lerFormula(item) {
    if (item?.tipo === 'campo') {
        return { tipo: 'campo', ...copiarCampos(item, { id, painelId: id, blocoId: id, nome: texto }) };
    }
    if (item?.tipo === 'operador' && ['+', '-', '*', '/', '×', '÷'].includes(item.valor)) {
        return { tipo: 'operador', valor: item.valor, ...copiarCampos(item, { id }) };
    }
    estruturaInvalida();
}

export function lerArquivoCodex(arquivo) {
    if (arquivo?.app !== 'CODEX' || !texto(arquivo.nomeSistema) ||
        !Array.isArray(arquivo.paginas) || !arquivo.paginas.length) {
        throw new Error('Escolha um arquivo de ficha exportado pelo Codex.');
    }

    const ids = new Set();
    function lerId(item) {
        if (!id(item?.id) || ids.has(item.id)) estruturaInvalida();
        ids.add(item.id);
        return item.id;
    }

    const paginas = lista(arquivo.paginas, pagina => {
        const dados = {
            id: lerId(pagina),
            ...copiarCampos(pagina, {
                nome: texto, descricao: texto,
                icone: valor => valor === null || (texto(valor) && /^fa-[\w-]+$/.test(valor)),
                larguraFolha: numero, alturaFolha: numero
            })
        };
        if (pagina.guias != null) {
            dados.guias = lista(pagina.guias, guia => {
                if (!['x', 'y'].includes(guia?.eixo) || !numero(guia.posicao)) estruturaInvalida();
                return { eixo: guia.eixo, posicao: guia.posicao };
            });
        }
        dados.paineis = lista(pagina.paineis, painel => ({
            id: lerId(painel),
            ...copiarCampos(painel, { ...geometria, titulo: texto, descricao: texto }),
            blocos: lista(painel.blocos, bloco => {
                const dadosBloco = {
                    id: lerId(bloco),
                    ...copiarCampos(bloco, {
                        ...geometria, larguraTitulo: numero, descricao: texto, tituloBloco: texto, texto,
                        tipo: opcao('textual', 'numerico', 'imagem'),
                        modelo: opcao('padrao', 'padrao_expansivel', 'titulo', 'titulo_expansivel',
                            'titulo_editavel', 'titulo_editavel_expansivel'),
                        alignTitulo: alinhamento, alignConteudo: alinhamento,
                        valorNumerico: numeroOuTextoNumerico,
                        modTipo: opcao('sem', 'com'), modPosicao: opcao('lado', 'embaixo'),
                        modMedio: numeroOuTextoNumerico, modCada: numeroOuTextoNumerico, modBonus: numeroOuTextoNumerico,
                        imgZoom: numero, imgX: numero, imgY: numero
                    })
                };
                if (bloco.formula != null) dadosBloco.formula = lista(bloco.formula, lerFormula);
                if (Object.hasOwn(bloco, 'urlImagem')) dadosBloco.urlImagem = urlDeImagem(bloco.urlImagem);
                return dadosBloco;
            })
        }));
        return dados;
    });

    return {
        app: 'CODEX',
        ...copiarCampos(arquivo, {
            versao: texto, data: texto, nomeSistema: texto, descricaoSistema: texto, nomePersonagem: texto,
            idSistemaAtual: id, paginaAtivaId: id, animacaoAtiva: valor => typeof valor === 'boolean',
            modoLayout: opcao('livre', 'grid')
        }),
        ...(Object.hasOwn(arquivo, 'imagemCapa') && { imagemCapa: urlDeImagem(arquivo.imagemCapa) }),
        ...(arquivo.imagemAjustes && {
            imagemAjustes: copiarCampos(arquivo.imagemAjustes, { zoom: numero, posX: numero, posY: numero })
        }),
        paginas
    };
}
