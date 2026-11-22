/* ============================================================
   CODEX — Estado Global
   Guarda SOMENTE informações realmente compartilhadas.
   ============================================================ */

import { observarAutenticacao } from '../servicos/autenticacao/autenticacao.js';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../servicos/firebase/config.js';
import { armazenamentoBiblioteca, prepararBiblioteca } from '../servicos/armazenamento/biblioteca.js';

const estadoInicial = {
    tema: 'escuro',
    usuario: null,          // { uid, email, nome, fotoUrl, ultimaTrocaNome }
    rotaAtual: '/',
    rotaAnterior: null,
    personagens: [],        // Lista de personagens do usuário
    personagemAtivo: null   // O personagem selecionado no cabeçalho
};

let estado = { ...estadoInicial };
const ouvintes = new Set();
let sessaoPerfil = 0;

// Conecta o Firebase ao estado global.
observarAutenticacao(async (userFirebase) => {
    const sessao = ++sessaoPerfil;
    if (userFirebase) {
        // 1. Define o usuário básico primeiro (para o site não travar enquanto busca)
        definirEstado({
            personagens: [],
            personagemAtivo: null,
            usuario: {
                uid: userFirebase.uid,
                email: userFirebase.email,
                nome: null,
                fotoUrl: null
            }
        });
        prepararBiblioteca().then(() => {
            if (sessao === sessaoPerfil) atualizarPersonagensDaBiblioteca();
        }).catch(erro => console.error('[estado] Falha ao preparar biblioteca:', erro));

        // 2. Busca os dados complementares (nome, foto) no Firestore
        try {
            const docRef = doc(db, 'usuarios', userFirebase.uid);
            const docSnap = await getDoc(docRef);
            if (sessao !== sessaoPerfil) return;

            if (docSnap.exists()) {
                const dados = docSnap.data();
                // Atualiza o estado com o nome e foto salvos no banco
                definirEstado({
                    usuario: {
                        uid: userFirebase.uid,
                        email: userFirebase.email,
                        nome: dados.nome || userFirebase.email.split('@')[0],
                        fotoUrl: dados.fotoUrl || null,
                        ultimaTrocaNome: dados.ultimaTrocaNome || null
                    }
                });
            } else {
                // Se o usuário existe no Auth mas não tem documento no Firestore,
                // criamos um documento básico para ele não ficar sem dados.
                const dados = await runTransaction(db, async transacao => {
                    const perfil = await transacao.get(docRef);
                    if (perfil.exists()) return perfil.data();
                    const inicial = {
                        nome: userFirebase.email.split('@')[0],
                        email: userFirebase.email,
                        fotoUrl: ""
                    };
                    transacao.set(docRef, inicial);
                    return inicial;
                });
                if (sessao !== sessaoPerfil) return;
                
                // E já atualiza o estado local
                definirEstado({
                    usuario: {
                        uid: userFirebase.uid,
                        email: userFirebase.email,
                        nome: dados.nome || userFirebase.email.split('@')[0],
                        fotoUrl: dados.fotoUrl || null,
                        ultimaTrocaNome: dados.ultimaTrocaNome || null
                    }
                });
            }
        } catch (erro) {
            if (sessao !== sessaoPerfil) return;
            console.error("[estado] Erro ao buscar dados do usuário no Firestore:", erro);
            // Mesmo se der erro no Firestore, garante que o usuário tenha o nome do email
            definirEstado({
                usuario: {
                    uid: userFirebase.uid,
                    email: userFirebase.email,
                    nome: userFirebase.email.split('@')[0],
                    fotoUrl: null
                }
            });
        }

    } else {
        // Se deslogar, limpa o usuário E os personagens
        definirEstado({ 
            usuario: null,
            personagens: [],
            personagemAtivo: null
        });
    }
});

window.addEventListener('codex-biblioteca', atualizarPersonagensDaBiblioteca);

/**
 * Retorna cópia do estado (evita mutação externa acidental).
 */
export function obterEstado() {
    return { ...estado };
}

/**
 * Atualiza parte do estado e notifica ouvintes.
 */
export function definirEstado(parcial) {
    estado = { ...estado, ...parcial };
    notificar();
}

/**
 * Reseta o estado para o inicial.
 */
export function resetarEstado() {
    estado = { ...estadoInicial };
    notificar();
}

/**
 * Registra um ouvinte. Retorna função para cancelar.
 */
export function observarEstado(callback) {
    ouvintes.add(callback);
    return () => ouvintes.delete(callback);
}

/**
 * Função específica para definir o personagem ativo.
 */
export function definirPersonagemAtivo(personagem) {
    definirEstado({ personagemAtivo: personagem });
}

/**
 * Função específica para atualizar a lista de personagens.
 */
export function definirListaPersonagens(lista) {
    definirEstado({ personagens: lista });
}

/**
 * Notifica todos os ouvintes sobre mudanças.
 */
function notificar() {
    const copia = { ...estado };
    ouvintes.forEach((cb) => {
        try { cb(copia); } catch (e) { console.error('[estado] ouvinte falhou:', e); }
    });
}

function atualizarPersonagensDaBiblioteca() {
    if (!estado.usuario) return;
    try {
        const sistemas = JSON.parse(armazenamentoBiblioteca.getItem('codex_sistemas') || '[]');
        const nomes = new Map(sistemas.map(sistema => [sistema.id, sistema.nome]));
        const fichas = JSON.parse(armazenamentoBiblioteca.getItem('codex_fichas_jogador') || '[]');
        const personagens = fichas.map(ficha => ({
            id: ficha.id,
            nome: ficha.nomePersonagem || 'Sem nome',
            sistema: nomes.get(ficha.sistemaId) || 'Sem sistema'
        }));
        const ativo = personagens.find(personagem => personagem.id === estado.personagemAtivo?.id) || null;
        definirEstado({ personagens, personagemAtivo: ativo });
    } catch (erro) {
        console.warn('[estado] Não foi possível ler os personagens:', erro);
    }
}
