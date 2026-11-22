/* ============================================================
   MÓDULO: ESTADO GLOBAL (Ficha Nova) - MULTI-FICHAS
   ============================================================ */

import { armazenamentoBiblioteca } from '../../../../servicos/armazenamento/biblioteca.js';
import { salvarRascunho } from '../wizard/rascunho.js';
import { extrairValores, preservarValoresDoModelo } from './modelo-importado.js';

export const MAX_PAGINAS = 10;
export const GRID = 20;
export const PAD_X = 40;
export const PAD_Y = 30;

export let estado = {
    paginas: [],
    paginaAtivaId: null,
    animacaoAtiva: true,
    modoLayout: 'livre',
    redimensionarEmConjunto: false,
    redimensionarBlocosDoCampo: true,
    nomeSistema: '',
    editandoModelo: false,
    idSistemaAtual: null, // ID do molde (ex: sist_dnd)
    idFichaAtual: null    // ID da ficha do jogador (ex: ficha_joao)
};

export const areaTransferenciaCodex = { tipo: null, dados: null };

export function gerarId(prefixo) {
    return prefixo + Date.now().toString() + Math.random().toString(36).substring(2, 6);
}

const historico = [];
let instantaneo;

function obterRegistro() {
    if (estado.editandoModelo) return { chave: 'codex_sistemas', id: estado.idSistemaAtual };
    if (estado.idFichaAtual) return { chave: 'codex_fichas_jogador', id: estado.idFichaAtual };
    return { chave: 'codex_ficha_dados' };
}

function capturarAlteracao() {
    const { chave, id } = obterRegistro();
    const registro = id
        ? JSON.stringify(JSON.parse(armazenamentoBiblioteca.getItem(chave) || '[]').find(item => item.id === id))
        : localStorage.getItem(chave);
    const conteudo = JSON.stringify({
        paginas: estado.paginas,
        animacaoAtiva: estado.animacaoAtiva,
        modoLayout: estado.modoLayout
    });
    return { chave, id, registro, conteudo, paginaAtivaId: estado.paginaAtivaId };
}

export function iniciarHistorico() {
    historico.length = 0;
    instantaneo = capturarAlteracao();
}

export function desfazerAlteracao() {
    const anterior = historico.at(-1);
    if (!anterior) return false;
    const { chave, id, registro } = anterior;
    if (id) {
        const itens = JSON.parse(armazenamentoBiblioteca.getItem(chave) || '[]');
        const indice = itens.findIndex(item => item.id === id);
        if (indice === -1 || !registro) return false;
        itens[indice] = JSON.parse(registro);
        armazenamentoBiblioteca.setItem(chave, JSON.stringify(itens));
    } else if (registro === null) {
        localStorage.removeItem(chave);
    } else {
        localStorage.setItem(chave, registro);
    }
    Object.assign(estado, JSON.parse(anterior.conteudo), { paginaAtivaId: anterior.paginaAtivaId });
    historico.pop();
    instantaneo = anterior;
    return true;
}

export function salvarEstado(opcoes) {
    const salvo = persistirEstado(opcoes);
    if (!salvo || !instantaneo || localStorage.getItem('codex_wizard_novo_sistema') === 'true') return salvo;
    const atual = capturarAlteracao();
    if (atual.conteudo !== instantaneo.conteudo && estaEmModoEdicao() && !opcoes?.preenchimento) {
        historico.push(instantaneo);
        if (historico.length > 30) historico.shift();
    }
    instantaneo = atual;
    return salvo;
}

function persistirEstado({ redefinirLayout = false, tituloModelo, imagemModelo, preenchimento = false, descricaoEditada, campoColadoId, guiasPaginaId, tamanhoFolha, elementoExcluido } = {}) {
    if (!estado.editandoModelo && localStorage.getItem('codex_wizard_novo_sistema') === 'true') {
        return salvarRascunho();
    }

    const dados = { 
        paginas: estado.paginas, 
        paginaAtivaId: estado.paginaAtivaId,
        animacaoAtiva: estado.animacaoAtiva,
        modoLayout: estado.modoLayout,
        nomeSistema: estado.nomeSistema,
        idSistemaAtual: estado.idSistemaAtual,
        idFichaAtual: estado.idFichaAtual
    };

    if (estado.editandoModelo) {
        if (preenchimento) return;
        const sistemas = JSON.parse(armazenamentoBiblioteca.getItem('codex_sistemas') || '[]');
        const modelo = sistemas.find(item => item.id === estado.idSistemaAtual);
        if (!modelo) return;
        const { nomeSistema, idSistemaAtual, idFichaAtual, ...layout } = dados;
        modelo.layout = preservarValoresDoModelo({ ...modelo.layout, ...layout }, modelo.layout, tituloModelo, imagemModelo);
        armazenamentoBiblioteca.setItem('codex_sistemas', JSON.stringify(sistemas));
        return true;
    }

    if (!estado.idFichaAtual) {
        localStorage.setItem('codex_ficha_dados', JSON.stringify(dados));
        return true;
    }

    const fichasJogador = JSON.parse(armazenamentoBiblioteca.getItem('codex_fichas_jogador') || '[]');
    const ficha = fichasJogador.find(f => f.id === estado.idFichaAtual);
    if (!ficha) return;

    if (redefinirLayout) {
        delete ficha.valores;
        delete ficha.descricoes;
        delete ficha.camposColados;
        delete ficha.guiasPorPagina;
        delete ficha.tamanhosPorPagina;
        delete ficha.elementosExcluidos;
    }
    if (Array.isArray(ficha.valores)) {
        ficha.valores = extrairValores(dados);
        if (tamanhoFolha) {
            const { pagina, escalaConteudo } = tamanhoFolha;
            const tamanhos = new Map(ficha.tamanhosPorPagina);
            const medidas = {
                larguraFolha: pagina.larguraFolha,
                alturaFolha: pagina.alturaFolha,
                campos: escalaConteudo ? pagina.paineis.map(campo => ({
                    id: campo.id, x: campo.x, y: campo.y, largura: campo.largura, altura: campo.altura,
                    blocos: campo.blocos.map(bloco => ({
                        id: bloco.id, x: bloco.x, y: bloco.y, largura: bloco.largura, altura: bloco.altura,
                        larguraTitulo: bloco.larguraTitulo ?? null
                    }))
                })) : tamanhos.get(pagina.id)?.campos
            };
            tamanhos.set(pagina.id, medidas);
            ficha.tamanhosPorPagina = [...tamanhos];
        }
        if (elementoExcluido) (ficha.elementosExcluidos ??= []).push(elementoExcluido);
        if (guiasPaginaId !== undefined) {
            const pagina = dados.paginas.find(item => item.id === guiasPaginaId);
            if (pagina) {
                ficha.guiasPorPagina = (ficha.guiasPorPagina ?? []).filter(([id]) => id !== pagina.id);
                ficha.guiasPorPagina.push([pagina.id, pagina.guias ?? []]);
            }
        }
        if (campoColadoId || ficha.camposColados?.length) {
            const ids = new Set((ficha.camposColados ?? []).map(({ campo }) => campo.id));
            if (campoColadoId) ids.add(campoColadoId);
            ficha.camposColados = dados.paginas.flatMap(pagina => pagina.paineis
                .filter(campo => ids.has(campo.id))
                .map(campo => ({ paginaId: pagina.id, campo })));
        }
        if (descricaoEditada) {
            const { tipo, id } = descricaoEditada;
            ficha.descricoes = (ficha.descricoes ?? []).filter(item => item.tipo !== tipo || item.id !== id);
            ficha.descricoes.push(descricaoEditada);
        }
    }
    else ficha.dados = dados;
    armazenamentoBiblioteca.setItem('codex_fichas_jogador', JSON.stringify(fichasJogador));
    return true;
}

export function getPaginaAtiva() {
    return estado.paginas.find(p => p.id === estado.paginaAtivaId);
}

export function estaEmModoEdicao() {
    const el = document.querySelector('#pagina-ficha-nova');
    return el && el.classList.contains('modo-edicao');
}

export function gerarNomeUnico(nomeBase, lista) {
    if (!lista || lista.length === 0) return nomeBase;
    let nome = nomeBase;
    let count = 1;
    while (lista.some(item => item.titulo === nome || item.nome === nome)) {
        nome = `${nomeBase} ${count}`;
        count++;
    }
    return nome;
}
