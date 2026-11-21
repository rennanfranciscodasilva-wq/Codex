import { gerarId } from './estado.js';

function listarBlocos(layout) {
    return layout.paginas.flatMap(pagina =>
        pagina.paineis.flatMap(painel => painel.blocos));
}

function camposPreenchidos(bloco) {
    const valores = {};
    if (bloco.tipo === 'numerico') {
        if (bloco.valorNumerico !== undefined) valores.valorNumerico = bloco.valorNumerico;
    } else if (!bloco.tipo || bloco.tipo === 'textual') {
        if (bloco.texto !== undefined) valores.texto = bloco.texto;
    } else if (bloco.tipo === 'imagem') {
        for (const campo of ['urlImagem', 'imgZoom', 'imgX', 'imgY']) {
            if (bloco[campo] !== undefined) valores[campo] = bloco[campo];
        }
    }
    if (bloco.modelo?.includes('editavel') && bloco.tituloBloco !== undefined) {
        valores.tituloBloco = bloco.tituloBloco;
    }
    return valores;
}

export function extrairValores(layout) {
    return listarBlocos(layout).map(bloco => [bloco.id, camposPreenchidos(bloco)]);
}

export function preencherModelo(layout, valores) {
    const preenchido = structuredClone(layout);
    const porBloco = new Map(valores);
    for (const bloco of listarBlocos(preenchido)) {
        Object.assign(bloco, camposPreenchidos({ ...bloco, ...porBloco.get(bloco.id) }));
    }
    return preenchido;
}

function identificarEstrutura(modelo) {
    const { layout } = structuredClone(modelo);
    const idsPaineis = new Map();
    const idsBlocos = new Map();

    for (const [indice, pagina] of layout.paginas.entries()) {
        pagina.id = indice;
        for (const painel of pagina.paineis) {
            idsPaineis.set(painel.id, idsPaineis.size);
            painel.id = idsPaineis.get(painel.id);
            for (const bloco of painel.blocos) {
                idsBlocos.set(bloco.id, idsBlocos.size);
                for (const campo of Object.keys(camposPreenchidos(bloco))) delete bloco[campo];
                bloco.id = idsBlocos.get(bloco.id);
                bloco.tipo ||= 'textual';
                bloco.modelo ||= 'padrao';
                bloco.alignTitulo ||= 'left';
                bloco.alignConteudo ||= 'left';
            }
        }
    }
    for (const bloco of listarBlocos(layout)) {
        for (const item of bloco.formula || []) {
            delete item.id;
            if (item.tipo !== 'campo') continue;
            item.painelId = idsPaineis.get(item.painelId);
            item.blocoId = idsBlocos.get(item.blocoId);
        }
    }

    return JSON.stringify({
        nome: modelo.nome,
        descricao: modelo.descricao || '',
        imagemCapa: modelo.imagemCapa || '',
        imagemAjustes: modelo.imagemCapa ? modelo.imagemAjustes : null,
        modoLayout: layout.modoLayout || 'livre',
        paginas: layout.paginas
    }, (_, valor) => {
        if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return valor;
        return Object.fromEntries(Object.keys(valor).sort().map(chave => [chave, valor[chave]]));
    });
}

function validarBloco(bloco) {
    if (bloco.modelo != null && typeof bloco.modelo !== 'string') return false;
    if (bloco.formula == null) return true;
    return Array.isArray(bloco.formula) && bloco.formula.every(item =>
        item && (item.tipo === 'campo' || (item.tipo === 'operador' &&
            ['+', '-', '*', '/', '×', '÷'].includes(item.valor))));
}

function lerModelo(arquivo) {
    const idValido = id => typeof id === 'string' && /^[\w-]+$/.test(id);
    if (arquivo?.app !== 'CODEX' || typeof arquivo.nomeSistema !== 'string' ||
        !Array.isArray(arquivo.paginas) || !arquivo.paginas.length) {
        throw new Error('Escolha um arquivo de ficha exportado pelo Codex.');
    }
    const ids = new Set();
    const validarItens = (itens, validarConteudo) => Array.isArray(itens) && itens.every(item => {
        if (!item || !idValido(item.id) || ids.has(item.id)) return false;
        ids.add(item.id);
        return validarConteudo(item);
    });
    const valido = validarItens(arquivo.paginas, pagina =>
        validarItens(pagina.paineis, painel => validarItens(painel.blocos, validarBloco)));
    if (!valido) {
        throw new Error('O arquivo contém páginas, campos ou blocos inválidos.');
    }

    const imagem = arquivo.imagemAjustes;
    return {
        id: gerarId('sist_'),
        nome: arquivo.nomeSistema.trim() || 'Modelo importado',
        descricao: typeof arquivo.descricaoSistema === 'string' ? arquivo.descricaoSistema : '',
        imagemCapa: typeof arquivo.imagemCapa === 'string' ? arquivo.imagemCapa : '',
        imagemAjustes: {
            zoom: Number.isFinite(imagem?.zoom) ? imagem.zoom : 0.5,
            posX: Number.isFinite(imagem?.posX) ? imagem.posX : 0,
            posY: Number.isFinite(imagem?.posY) ? imagem.posY : 0
        },
        layout: {
            paginas: structuredClone(arquivo.paginas),
            paginaAtivaId: arquivo.paginas[0].id,
            animacaoAtiva: arquivo.animacaoAtiva ?? true,
            modoLayout: arquivo.modoLayout || 'livre'
        },
        naNuvem: false
    };
}

export function importarModelo(arquivo, armazenamento = localStorage) {
    const modelo = lerModelo(arquivo);
    const valoresOriginais = extrairValores(modelo.layout);
    for (const bloco of listarBlocos(modelo.layout)) {
        for (const campo of Object.keys(camposPreenchidos(bloco))) delete bloco[campo];
    }

    const chaveModelos = 'codex_sistemas';
    const chaveFichas = 'codex_fichas_jogador';
    const modelosAnteriores = armazenamento.getItem(chaveModelos);
    const modelos = JSON.parse(modelosAnteriores || '[]');
    const fichas = JSON.parse(armazenamento.getItem(chaveFichas) || '[]');
    const estrutura = identificarEstrutura(modelo);
    const existente = modelos.find(item => identificarEstrutura(item) === estrutura);
    const destino = existente || modelo;
    const ficha = {
        id: gerarId('ficha_'),
        sistemaId: destino.id,
        nomePersonagem: typeof arquivo.nomePersonagem === 'string' && arquivo.nomePersonagem.trim()
            ? arquivo.nomePersonagem.trim() : 'Personagem importado',
        criadoEm: Date.now(),
        valores: listarBlocos(destino.layout).map((bloco, indice) => [bloco.id, valoresOriginais[indice][1]])
    };

    if (!existente) armazenamento.setItem(chaveModelos, JSON.stringify([...modelos, modelo]));
    try {
        armazenamento.setItem(chaveFichas, JSON.stringify([...fichas, ficha]));
    } catch (erro) {
        if (!existente) {
            if (modelosAnteriores === null) armazenamento.removeItem(chaveModelos);
            else armazenamento.setItem(chaveModelos, modelosAnteriores);
        }
        throw erro;
    }
    return ficha;
}
