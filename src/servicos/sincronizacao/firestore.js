import { doc, getDocFromServer, runTransaction, serverTimestamp, Timestamp } from 'firebase/firestore';
import { auth, db } from '../firebase/config.js';
import { chaveNomeNaLista, criadoEmDoModelo, erroNomeOcupado } from '../armazenamento/modelos.js';

export const limiteManual = 5;
const hora = 3_600_000;
const dia = 24 * hora;

function diaBrasilia(agora = Date.now()) {
    return Math.floor((agora - 3 * hora) / dia) * dia;
}

function controleDaConta(uid) {
    return doc(db, 'usuarios', uid, 'controle', 'sincronizacao');
}

function usosHoje(controle, hoje) {
    return controle?.dia?.toMillis?.() === hoje ? controle.usados : 0;
}

export async function lerSaldoManual(uid) {
    const registro = await getDocFromServer(controleDaConta(uid));
    return limiteManual - usosHoje(registro.data(), diaBrasilia());
}

function conteudoCanonico(conteudo) {
    return conteudo === null ? null : JSON.stringify(JSON.parse(conteudo), (_, valor) => {
        if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return valor;
        return Object.fromEntries(Object.keys(valor).sort().map(chave => [chave, valor[chave]]));
    });
}

function erroDeBackup(code, mensagem) {
    return Object.assign(new Error(mensagem), { code });
}

async function reservaDoItem(item) {
    if (item.conteudo === null || item.colecao === 'rascunhos') return null;
    const chave = item.colecao === 'sistemas' ? 'codex_sistemas' : 'codex_fichas_jogador';
    const nome = chaveNomeNaLista(chave, JSON.parse(item.conteudo));
    if (!nome) return null;
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(nome));
    return item.colecao + '_' + Array.from(new Uint8Array(hash), b => b.toString(16).padStart(2, '0')).join('');
}

export async function publicarBackup(uid, manual, itens) {
    const controleRef = controleDaConta(uid);
    const refs = itens.map(item => doc(db, 'usuarios', uid, item.colecao, item.id));
    const modelosNoEnvio = new Set(itens.filter(item => item.colecao === 'sistemas' && item.conteudo !== null)
        .map(item => item.id));
    const modelos = [...new Set(itens.map(item => item.sistemaId).filter(id => id && !modelosNoEnvio.has(id)))];
    const reservasNovas = await Promise.all(itens.map(reservaDoItem));

    return runTransaction(db, async transacao => {
        if (uid !== auth.currentUser?.uid) throw erroDeBackup('backup/sessao', 'A conta mudou.');
        const [controle, registros, modelosEncontrados] = await Promise.all([
            transacao.get(controleRef),
            Promise.all(refs.map(ref => transacao.get(ref))),
            Promise.all(modelos.map(id => transacao.get(doc(db, 'usuarios', uid, 'sistemas', id))))
        ]);
        if (modelosEncontrados.some(modelo => !modelo.exists())) {
            throw erroDeBackup('backup/modelo-ausente', 'O modelo da ficha ainda não está no Firestore.');
        }
        const agora = Date.now();
        const hoje = diaBrasilia(agora);
        const anterior = controle.data();
        const usados = usosHoje(anterior, hoje);
        const ultimaAutomatica = anterior?.ultimaAutomatica ?? null;
        const reservasAntigas = registros.map(registro => registro.data()?.reserva || null);
        const nomes = [...new Set([...reservasNovas, ...reservasAntigas].filter(Boolean))];
        const reservas = new Map(await Promise.all(nomes.map(async nome => {
            const ref = doc(db, 'usuarios', uid, 'nomes', nome);
            return [nome, { ref, dono: (await transacao.get(ref)).data()?.registro }];
        })));
        const donosNovos = new Map();
        for (const [i, nome] of reservasNovas.entries()) {
            if (!nome) continue;
            const dono = reservas.get(nome).dono;
            if ((dono && dono !== itens[i].id) || donosNovos.has(nome)) {
                throw erroNomeOcupado(itens[i].colecao === 'sistemas' ? 'codex_sistemas' : 'codex_fichas_jogador');
            }
            donosNovos.set(nome, itens[i].id);
        }
        const alterados = [];
        for (const [indice, item] of itens.entries()) {
            const registro = registros[indice].data();
            const atual = registro?.conteudo ?? null;
            const dado = item.colecao !== 'rascunhos' && item.conteudo !== null ? JSON.parse(item.conteudo) : null;
            const nome = item.colecao === 'sistemas' ? dado?.nome : dado?.nomePersonagem;
            const data = dado && (item.colecao === 'sistemas' ? criadoEmDoModelo(dado) : dado.criadoEm);
            const atualizarMetadados = nome && (registro?.nome !== nome ||
                registro?.reserva !== reservasNovas[indice] || reservas.get(reservasNovas[indice])?.dono !== item.id ||
                (data && registro?.criadoEm?.toMillis?.() !== data));
            if (!atualizarMetadados && conteudoCanonico(atual) === conteudoCanonico(item.conteudo)) continue;
            if (conteudoCanonico(atual) !== conteudoCanonico(item.base)) {
                throw erroDeBackup('backup/conflito', 'Outro dispositivo alterou um registro.');
            }
            alterados.push(indice);
        }
        if (!alterados.length) return { total: 0, restantes: limiteManual - usados };
        if (manual && usados >= limiteManual) {
            throw erroDeBackup('backup/limite-manual', 'Sem sincronizações manuais disponíveis.');
        }
        if (!manual && ultimaAutomatica && agora - ultimaAutomatica.toMillis() < hora) {
            throw erroDeBackup('backup/intervalo', 'Houve um backup automático nesta conta na última hora.');
        }
        if (uid !== auth.currentUser?.uid) throw erroDeBackup('backup/sessao', 'A conta mudou.');

        for (const indice of alterados) {
            const { conteudo, colecao, id } = itens[indice];
            const antiga = reservasAntigas[indice];
            const nova = reservasNovas[indice];
            if (antiga && antiga !== nova && reservas.get(antiga).dono === id) transacao.delete(reservas.get(antiga).ref);
            if (nova && reservas.get(nova).dono !== id) transacao.set(reservas.get(nova).ref, { registro: id });
            if (conteudo === null) transacao.delete(refs[indice]);
            else {
                const dados = { conteudo };
                if (nova) {
                    const modelo = JSON.parse(conteudo);
                    const data = colecao === 'sistemas' ? criadoEmDoModelo(modelo) : modelo.criadoEm;
                    dados.nome = colecao === 'sistemas' ? modelo.nome : modelo.nomePersonagem;
                    dados.reserva = nova;
                    if (Number.isSafeInteger(data) && data > 0 && data <= 253_402_300_799_999) {
                        dados.criadoEm = Timestamp.fromMillis(data);
                    }
                }
                transacao.set(refs[indice], dados);
            }
        }
        transacao.set(controleRef, {
            dia: Timestamp.fromMillis(hoje),
            usados: usados + Number(manual),
            ultimaAutomatica: manual ? ultimaAutomatica : serverTimestamp(),
            atualizadoEm: serverTimestamp(),
            modo: manual ? 'manual' : 'automatico'
        });
        return { total: alterados.length, restantes: limiteManual - usados - Number(manual) };
    });
}
