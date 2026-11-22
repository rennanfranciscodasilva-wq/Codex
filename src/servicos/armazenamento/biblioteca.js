import { httpsCallable, getFunctions } from 'firebase/functions';
import { collection, doc, getDocsFromServer, getDocFromServer } from 'firebase/firestore';
import { auth, db } from '../firebase/config.js';
import { mostrarNotificacao } from '../../componentes/notificacoes/notificacoes.js';

const colecoes = { codex_sistemas: 'sistemas', codex_fichas_jogador: 'fichas', codex_rascunhos: 'rascunhos' };
const carregamentos = new Map();
const avisos = new Set();
let uidDaTela = null;

function donoDaBiblioteca() {
    const uid = auth.currentUser?.uid ?? null;
    if (uid !== uidDaTela) throw new Error('A conta mudou. Reabra a biblioteca.');
    return uid;
}

function chaveLocal(uid) {
    return 'codex_biblioteca:' + uid;
}

function lerBiblioteca(uid) {
    const biblioteca = JSON.parse(localStorage.getItem(chaveLocal(uid)) || 'null') ?? { dados: {}, pendentes: {} };
    biblioteca.confirmados ??= {};
    for (const chave of Object.keys(colecoes)) biblioteca.dados[chave] ??= [];
    return biblioteca;
}

function gravarBiblioteca(uid, biblioteca) {
    localStorage.setItem(chaveLocal(uid), JSON.stringify(biblioteca));
    window.dispatchEvent(new Event('codex-biblioteca'));
}

function avisar(uid, mensagem, erro) {
    console.error('[biblioteca]', erro);
    if (uid !== auth.currentUser?.uid || avisos.has(uid)) return;
    avisos.add(uid);
    mostrarNotificacao('Biblioteca do Codex', mensagem, 'aviso');
}

export async function prepararBiblioteca() {
    await auth.authStateReady();
    const uid = auth.currentUser?.uid ?? null;
    uidDaTela = uid;
    if (!uid) return;
    if (!carregamentos.has(uid)) carregamentos.set(uid, baixarBiblioteca(uid));
    await carregamentos.get(uid);
}

async function baixarBiblioteca(uid) {
    try {
        const listas = await Promise.all(Object.entries(colecoes).map(async ([chave, nome]) => {
            const snapshot = await getDocsFromServer(collection(db, 'usuarios', uid, nome));
            return [chave, snapshot.docs.map(documento => ({
                item: { ...JSON.parse(documento.data().conteudo), id: documento.id },
                conteudo: documento.data().conteudo
            }))];
        }));
        if (auth.currentUser?.uid !== uid) return;
        const biblioteca = lerBiblioteca(uid);
        for (const [chave, remotos] of listas) {
            const itens = new Map(remotos.map(({ item }) => [item.id, item]));
            biblioteca.confirmados[chave] = Object.fromEntries(remotos.map(({ item, conteudo }) => [item.id, conteudo]));
            for (const pendente of Object.values(biblioteca.pendentes)) {
                if (pendente.chave !== chave) continue;
                if (!Object.hasOwn(pendente, 'base')) {
                    pendente.base = biblioteca.confirmados[chave][pendente.id] ?? null;
                }
                if (pendente.conteudo === null) itens.delete(pendente.id);
                else itens.set(pendente.id, JSON.parse(pendente.conteudo));
            }
            biblioteca.dados[chave] = [...itens.values()];
        }
        const modelos = new Set(biblioteca.dados.codex_sistemas.map(modelo => modelo.id));
        for (const ficha of biblioteca.dados.codex_fichas_jogador) {
            const destino = 'codex_fichas_jogador/' + ficha.id;
            if (!ficha.sistemaId || modelos.has(ficha.sistemaId) || biblioteca.pendentes[destino]) continue;
            biblioteca.pendentes[destino] = {
                chave: 'codex_fichas_jogador', id: ficha.id, conteudo: null,
                base: biblioteca.confirmados.codex_fichas_jogador[ficha.id],
                modeloAusente: ficha.sistemaId, versao: Date.now() + ':' + Math.random()
            };
        }
        biblioteca.dados.codex_fichas_jogador = biblioteca.dados.codex_fichas_jogador
            .filter(ficha => !biblioteca.pendentes['codex_fichas_jogador/' + ficha.id]?.modeloAusente);
        gravarBiblioteca(uid, biblioteca);
    } catch (erro) {
        carregamentos.delete(uid);
        avisar(uid, 'A biblioteca na nuvem está indisponível. Mostrando os dados deste navegador.', erro);
    }
}

const publicar = httpsCallable(getFunctions(), 'sincronizarCodex');

export function temAlteracoes(uid) {
    return Object.keys(lerBiblioteca(uid).pendentes).length > 0;
}

export async function lerSaldoManual(uid) {
    const registro = await getDocFromServer(doc(db, 'usuarios', uid, 'controle', 'sincronizacao'));
    return registro.data();
}

export async function enviarPendencias(uid, manual) {
    if (!carregamentos.has(uid)) carregamentos.set(uid, baixarBiblioteca(uid));
    await carregamentos.get(uid);
    if (auth.currentUser?.uid !== uid) return;
    const bibliotecaAntes = lerBiblioteca(uid);
    const { pendentes } = bibliotecaAntes;
    let limpos = false;
    for (const [chave, item] of Object.entries(pendentes)) {
        if (Object.hasOwn(item, 'base') && item.conteudo === item.base) {
            delete pendentes[chave];
            limpos = true;
        }
    }
    if (limpos) gravarBiblioteca(uid, bibliotecaAntes);
    const itens = Object.entries(pendentes).map(([chave, item]) => ({
        ...item, chave, colecao: colecoes[item.chave]
    }));
    if (!itens.length) return { total: 0 };
    if (itens.some(item => !Object.hasOwn(item, 'base'))) {
        throw new Error('Ainda não foi possível confirmar a versão anterior na nuvem.');
    }
    if (itens.some(item => item.conteudo !== null && new Blob([item.conteudo]).size > 950000)) {
        throw new Error('Um registro excede o tamanho permitido para o backup.');
    }
    if (itens.length > 400 || new Blob([JSON.stringify(itens)]).size > 7_000_000) {
        throw new Error('O backup pendente excede o tamanho de um envio.');
    }
    const { data } = await publicar({ manual, itens });
    const biblioteca = lerBiblioteca(uid);
    for (const item of itens) {
        const pendente = biblioteca.pendentes[item.chave];
        const grupo = biblioteca.confirmados[item.chave.split('/')[0]] ??= {};
        if (item.conteudo === null) delete grupo[item.id];
        else grupo[item.id] = item.conteudo;
        if (pendente?.versao === item.versao) delete biblioteca.pendentes[item.chave];
        else if (pendente) pendente.base = item.conteudo;
    }
    gravarBiblioteca(uid, biblioteca);
    return data;
}

function atualizarLista(biblioteca, chave, novos) {
    const anteriores = new Map(biblioteca.dados[chave].map(item => [item.id, JSON.stringify(item)]));
    const atualizados = new Map(novos.map(item => [item.id, JSON.stringify(item)]));
    for (const [id, conteudo] of atualizados) {
        if (conteudo !== anteriores.get(id)) registrarOperacao(id, conteudo);
    }
    for (const id of anteriores.keys()) {
        if (!atualizados.has(id)) registrarOperacao(id, null);
    }
    biblioteca.dados[chave] = novos;

    function registrarOperacao(id, conteudo) {
        const destino = chave + '/' + id;
        const anterior = biblioteca.pendentes[destino];
        const base = anterior ? anterior.base : (biblioteca.confirmados[chave]?.[id] ?? null);
        biblioteca.pendentes[destino] = { chave, id, conteudo, base, versao: Date.now() + ':' + Math.random() };

    }
}

export const armazenamentoBiblioteca = {
    getItem(chave) {
        const uid = donoDaBiblioteca();
        return uid ? JSON.stringify(lerBiblioteca(uid).dados[chave]) : localStorage.getItem(chave);
    },

    setItem(chave, valor) {
        const uid = donoDaBiblioteca();
        if (!uid) return localStorage.setItem(chave, valor);
        const biblioteca = lerBiblioteca(uid);
        const novos = JSON.parse(valor);
        atualizarLista(biblioteca, chave, novos);
        gravarBiblioteca(uid, biblioteca);
    },

    removeItem(chave) {
        if (donoDaBiblioteca()) this.setItem(chave, '[]');
        else localStorage.removeItem(chave);
    }
};

export function excluirModeloComFichas(idModelo) {
    const fichas = JSON.parse(armazenamentoBiblioteca.getItem('codex_fichas_jogador') || '[]');
    const modelos = JSON.parse(armazenamentoBiblioteca.getItem('codex_sistemas') || '[]');
    const restantes = fichas.filter(ficha => ficha.sistemaId !== idModelo);
    const modelosRestantes = modelos.filter(modelo => modelo.id !== idModelo);
    const uid = donoDaBiblioteca();
    if (uid) {
        const biblioteca = lerBiblioteca(uid);
        atualizarLista(biblioteca, 'codex_fichas_jogador', restantes);
        atualizarLista(biblioteca, 'codex_sistemas', modelosRestantes);
        gravarBiblioteca(uid, biblioteca);
        return;
    }

    localStorage.setItem('codex_fichas_jogador', JSON.stringify(restantes));
    try {
        localStorage.setItem('codex_sistemas', JSON.stringify(modelosRestantes));
    } catch (erro) {
        localStorage.setItem('codex_fichas_jogador', JSON.stringify(fichas));
        throw erro;
    }
}

export function temBibliotecaLocalParaCopiar() {
    const uid = donoDaBiblioteca();
    if (!uid) return false;
    const biblioteca = lerBiblioteca(uid);
    return Object.keys(colecoes).some(chave => {
        const existentes = new Set(biblioteca.dados[chave].map(item => item.id));
        const copiados = new Set(biblioteca.copiasLocais?.[chave]);
        return lerListaLocal(chave).some(item => !existentes.has(item.id) && !copiados.has(item.id));
    });
}

export function copiarBibliotecaLocal() {
    const uid = donoDaBiblioteca();
    if (!uid) return;
    for (const chave of Object.keys(colecoes)) {
        const atuais = JSON.parse(armazenamentoBiblioteca.getItem(chave));
        const copiados = new Set(lerBiblioteca(uid).copiasLocais?.[chave]);
        const ids = new Set([...copiados, ...atuais.map(item => item.id)]);
        const locais = lerListaLocal(chave);
        armazenamentoBiblioteca.setItem(chave, JSON.stringify([
            ...atuais, ...locais.filter(item => !ids.has(item.id))
        ]));
        const biblioteca = lerBiblioteca(uid);
        biblioteca.copiasLocais ??= {};
        biblioteca.copiasLocais[chave] = [...new Set([...copiados, ...locais.map(item => item.id)])];
        gravarBiblioteca(uid, biblioteca);
    }
}

function lerListaLocal(chave) {
    try {
        const itens = JSON.parse(localStorage.getItem(chave) || '[]');
        return Array.isArray(itens) ? itens.filter(item => typeof item?.id === 'string') : [];
    } catch {
        return [];
    }
}
