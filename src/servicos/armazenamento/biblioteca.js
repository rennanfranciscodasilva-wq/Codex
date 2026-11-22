import { collection, getDocsFromServer } from 'firebase/firestore';
import { auth, db } from '../firebase/config.js';
import { mostrarNotificacao } from '../../componentes/notificacoes/notificacoes.js';
import { publicarBackup } from '../sincronizacao/firestore.js';
import { chaveNomeNaLista, criadoEmDoModelo, validarNomeNaLista } from './modelos.js';

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

export async function prepararBiblioteca({ atualizar = false } = {}) {
    await auth.authStateReady();
    const uid = auth.currentUser?.uid ?? null;
    uidDaTela = uid;
    if (!uid) return;
    if (atualizar || !carregamentos.has(uid)) carregamentos.set(uid, baixarBiblioteca(uid));
    await carregamentos.get(uid);
}

async function baixarBiblioteca(uid) {
    try {
        const listas = await Promise.all(Object.entries(colecoes).map(async ([chave, nome]) => {
            const snapshot = await getDocsFromServer(collection(db, 'usuarios', uid, nome));
            return [chave, snapshot.docs.map(documento => ({
                item: { ...JSON.parse(documento.data().conteudo), id: documento.id },
                conteudo: documento.data().conteudo,
                nome: documento.data().nome,
                reserva: documento.data().reserva,
                criadoEm: documento.data().criadoEm?.toMillis?.()
            }))];
        }));
        if (auth.currentUser?.uid !== uid) return;
        const biblioteca = lerBiblioteca(uid);
        const modelosLocais = biblioteca.dados.codex_sistemas;
        // A ausência do modelo não significa que o usuário pediu para excluir a ficha.
        for (const [chave, item] of Object.entries(biblioteca.pendentes)) {
            if (item.modeloAusente) delete biblioteca.pendentes[chave];
        }
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
            if (chave !== 'codex_rascunhos') {
                for (const remoto of remotos) {
                    const { item, conteudo, nome, criadoEm, reserva } = remoto;
                    const destino = chave + '/' + item.id;
                    const titulo = chave === 'codex_sistemas' ? item.nome : item.nomePersonagem;
                    const data = chave === 'codex_sistemas' ? criadoEmDoModelo(item) : item.criadoEm;
                    const chaveNome = chaveNomeNaLista(chave, item);
                    if (!chaveNome || biblioteca.pendentes[destino] ||
                        (reserva && nome === titulo && (!data || criadoEm === data))) continue;
                    if (remotos.some(outro => outro.item.id !== item.id &&
                        chaveNomeNaLista(chave, outro.item) === chaveNome)) continue;
                    biblioteca.pendentes[destino] = {
                        chave, id: item.id, conteudo, base: conteudo, metadados: true,
                        versao: Date.now() + ':' + Math.random()
                    };
                }
            }
        }
        incluirModelosDasFichas(biblioteca, modelosLocais);
        gravarBiblioteca(uid, biblioteca);
    } catch (erro) {
        carregamentos.delete(uid);
        avisar(uid, 'A biblioteca na nuvem está indisponível. Mostrando os dados deste navegador.', erro);
    }
}

function incluirModelosDasFichas(biblioteca, modelosLocais) {
    const chave = 'codex_sistemas';
    const confirmados = biblioteca.confirmados[chave] ?? {};
    const vinculados = new Set(biblioteca.dados.codex_fichas_jogador.map(ficha => ficha.sistemaId));
    const presentes = new Set(biblioteca.dados[chave].map(modelo => modelo.id));
    let alterou = false;
    for (const modelo of modelosLocais) {
        const destino = chave + '/' + modelo.id;
        if (!modelo.layout || !vinculados.has(modelo.id) || Object.hasOwn(confirmados, modelo.id) ||
            Object.hasOwn(biblioteca.pendentes, destino)) continue;
        biblioteca.pendentes[destino] = {
            chave, id: modelo.id, conteudo: JSON.stringify(modelo), base: null,
            versao: Date.now() + ':' + Math.random()
        };
        if (!presentes.has(modelo.id)) biblioteca.dados[chave].push(modelo);
        alterou = true;
    }
    return alterou;
}

export function temAlteracoes(uid) {
    return Object.keys(lerBiblioteca(uid).pendentes).length > 0;
}

export async function enviarPendencias(uid, manual) {
    if (!carregamentos.has(uid)) carregamentos.set(uid, baixarBiblioteca(uid));
    await carregamentos.get(uid);
    if (auth.currentUser?.uid !== uid) return;
    const bibliotecaAntes = lerBiblioteca(uid);
    const { pendentes } = bibliotecaAntes;
    let limpos = false;
    for (const [chave, item] of Object.entries(pendentes)) {
        if (!item.metadados && Object.hasOwn(item, 'base') && item.conteudo === item.base) {
            delete pendentes[chave];
            limpos = true;
        }
    }
    const incluiuModelos = incluirModelosDasFichas(bibliotecaAntes, bibliotecaAntes.dados.codex_sistemas);
    if (limpos || incluiuModelos) gravarBiblioteca(uid, bibliotecaAntes);
    const itens = [];
    let bytes = 0;
    // Cada registro gravado consulta o controle nas regras do Firestore.
    const prioridade = item => item.chave === 'codex_sistemas' ? (item.conteudo === null ? 2 : 0) : 1;
    const ordenados = Object.entries(pendentes).sort(([, a], [, b]) => prioridade(a) - prioridade(b));
    const modelosSelecionados = new Set();
    let faltaModelo = false;
    for (const [chave, item] of ordenados) {
        const tamanho = item.conteudo === null ? 0 : new Blob([item.conteudo]).size;
        if (tamanho > 950_000) continue;
        if (itens.length === 6 || bytes + tamanho > 7_000_000) break;
        const sistemaId = item.chave === 'codex_fichas_jogador' && item.conteudo !== null
            ? JSON.parse(item.conteudo).sistemaId : null;
        if (sistemaId && !modelosSelecionados.has(sistemaId) &&
            !Object.hasOwn(bibliotecaAntes.confirmados.codex_sistemas ?? {}, sistemaId)) {
            faltaModelo = true;
            continue;
        }
        itens.push({ ...item, chave, colecao: colecoes[item.chave], sistemaId });
        if (item.chave === 'codex_sistemas' && item.conteudo !== null) modelosSelecionados.add(item.id);
        bytes += tamanho;
    }
    if (!itens.length && faltaModelo) {
        throw Object.assign(new Error('Modelo da ficha indisponível para backup.'), { code: 'backup/modelo-ausente' });
    }
    if (!itens.length && Object.keys(pendentes).length) {
        throw new Error('Um registro excede o tamanho permitido para o backup.');
    }
    if (!itens.length) return { total: 0 };
    if (itens.some(item => !Object.hasOwn(item, 'base'))) {
        throw new Error('Ainda não foi possível confirmar a versão anterior na nuvem.');
    }
    await Promise.all(itens.filter(item => item.conteudo !== null && item.colecao !== 'rascunhos')
        .map(item => validarNomeNaConta(item.chave.split('/')[0], JSON.parse(item.conteudo), uid)));
    const data = await publicarBackup(uid, manual, itens);
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
        const anteriores = JSON.parse(this.getItem(chave) || '[]');
        const novos = JSON.parse(valor);
        for (const item of novos) {
            const anterior = anteriores.find(registro => registro.id === item.id);
            if (!anterior || chaveNomeNaLista(chave, anterior) !== chaveNomeNaLista(chave, item)) {
                validarNomeNaLista(chave, item, novos);
            }
        }
        if (!uid) return localStorage.setItem(chave, JSON.stringify(novos));
        const biblioteca = lerBiblioteca(uid);
        atualizarLista(biblioteca, chave, novos);
        gravarBiblioteca(uid, biblioteca);
    },

    removeItem(chave) {
        if (donoDaBiblioteca()) this.setItem(chave, '[]');
        else localStorage.removeItem(chave);
    }
};

export async function validarNomeNaConta(chave, candidato, uid = donoDaBiblioteca()) {
    const locais = uid ? lerBiblioteca(uid).dados[chave] : JSON.parse(localStorage.getItem(chave) || '[]');
    validarNomeNaLista(chave, candidato, locais);
    if (!uid || !navigator.onLine) return;
    let snapshot;
    try {
        snapshot = await getDocsFromServer(collection(db, 'usuarios', uid, colecoes[chave]));
    } catch (erro) {
        if (erro.code === 'unavailable') return;
        throw erro;
    }
    if (uid !== auth.currentUser?.uid) throw new Error('A conta mudou.');
    const pendentes = lerBiblioteca(uid).pendentes;
    validarNomeNaLista(chave, candidato, snapshot.docs
        .filter(registro => !Object.hasOwn(pendentes, chave + '/' + registro.id) ||
            pendentes[chave + '/' + registro.id].conteudo !== null)
        .map(registro => ({ ...JSON.parse(registro.data().conteudo), id: registro.id })));
}

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
