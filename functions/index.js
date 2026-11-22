const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { isDeepStrictEqual } = require('node:util');

initializeApp();
const db = getFirestore();
const colecoes = new Set(['fichas', 'sistemas', 'rascunhos']);
const limite = 5;
const calendario = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
});

exports.sincronizarCodex = onCall(async solicitacao => {
    const uid = solicitacao.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Entre na sua conta.');

    const { manual, itens } = solicitacao.data ?? {};
    if (typeof manual !== 'boolean' || !Array.isArray(itens) || !itens.length ||
        itens.length > 400 || Buffer.byteLength(JSON.stringify(itens)) > 7_000_000) {
        throw new HttpsError('invalid-argument', 'Envio inválido.');
    }
    const usuario = db.collection('usuarios').doc(uid);
    const controle = usuario.collection('controle').doc('sincronizacao');
    const destinos = new Set();
    for (const item of itens) {
        if (!colecoes.has(item?.colecao) || typeof item.id !== 'string' ||
            !/^[^/]{1,200}$/.test(item.id) || /^(\.|\.\.|__.*__)$/.test(item.id)) {
            throw new HttpsError('invalid-argument', 'Registro inválido.');
        }
        const destino = item.colecao + '/' + item.id;
        if (destinos.has(destino)) throw new HttpsError('invalid-argument', 'Registro duplicado.');
        destinos.add(destino);
        if (item.modeloAusente != null && (item.colecao !== 'fichas' || item.conteudo !== null ||
            typeof item.modeloAusente !== 'string' || !/^[^/]{1,200}$/.test(item.modeloAusente) ||
            /^(\.|\.\.|__.*__)$/.test(item.modeloAusente))) {
            throw new HttpsError('invalid-argument', 'Modelo inválido.');
        }
        for (const valor of [item.conteudo, item.base]) {
            if (valor === null) continue;
            try {
                if (typeof valor !== 'string' || Buffer.byteLength(valor) > 1_000_000) throw Error();
                if (JSON.parse(valor)?.id !== item.id) throw Error();
            } catch {
                throw new HttpsError('invalid-argument', 'Conteúdo de backup inválido.');
            }
        }
    }

    const refs = itens.map(item => usuario.collection(item.colecao).doc(item.id));
    return db.runTransaction(async transacao => {
        const dia = calendario.format(new Date());
        const snapshots = await transacao.getAll(...refs, ...(manual ? [controle] : []));
        const saldo = manual ? snapshots.at(-1).data() : null;
        const modelosVerificados = new Map();
        for (const id of new Set(itens.map(item => item.modeloAusente).filter(Boolean))) {
            modelosVerificados.set(id, await transacao.get(usuario.collection('sistemas').doc(id)));
        }
        const usados = saldo?.dia === dia ? saldo.usados : 0;
        let total = 0;

        for (const [i, item] of itens.entries()) {
            const atual = snapshots[i].data()?.conteudo ?? null;
            const comparar = valor => valor === null ? null : JSON.parse(valor);
            if (isDeepStrictEqual(comparar(atual), comparar(item.conteudo))) continue;
            if (item.modeloAusente && (modelosVerificados.get(item.modeloAusente).exists ||
                comparar(atual)?.sistemaId !== item.modeloAusente)) {
                throw new HttpsError('aborted', 'O modelo deste personagem mudou na nuvem.');
            }
            if (!isDeepStrictEqual(comparar(atual), comparar(item.base))) {
                throw new HttpsError('aborted', 'Outro dispositivo alterou um registro. As alterações locais foram preservadas.');
            }
            if (manual && usados >= limite) {
                throw new HttpsError('resource-exhausted', 'Os cinco backups manuais de hoje já foram usados.');
            }
            if (item.conteudo === null) transacao.delete(refs[i]);
            else transacao.set(refs[i], { conteudo: item.conteudo });
            total++;
        }
        if (manual && total) transacao.set(controle, { dia, usados: usados + 1 });
        return { total, restantes: manual ? limite - usados - Number(total > 0) : null };
    });
});
