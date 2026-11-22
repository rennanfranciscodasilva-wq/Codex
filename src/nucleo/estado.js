/* ============================================================
   CODEX — Estado Global
   Guarda SOMENTE informações realmente compartilhadas.
   ============================================================ */

import { observarAutenticacao } from '../servicos/autenticacao/autenticacao.js';
import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { db } from '../servicos/firebase/config.js';

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

// Conecta o Firebase ao estado global.
observarAutenticacao(async (userFirebase) => {
    if (userFirebase) {
        // 1. Define o usuário básico primeiro (para o site não travar enquanto busca)
        definirEstado({
            usuario: {
                uid: userFirebase.uid,
                email: userFirebase.email,
                nome: null,
                fotoUrl: null
            }
        });

        // 2. Busca os dados complementares (nome, foto) no Firestore
        try {
            const docRef = doc(db, 'usuarios', userFirebase.uid);
            const docSnap = await getDoc(docRef);

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

        // 3. Busca os personagens assim que o usuário logar
        carregarPersonagensDoUsuario(userFirebase.uid);
    } else {
        // Se deslogar, limpa o usuário E os personagens
        definirEstado({ 
            usuario: null,
            personagens: [],
            personagemAtivo: null
        });
    }
});

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

/* ============================================================
   FUNÇÃO: Buscar no Cache + Firebase (Mantendo Únicos)
   ============================================================ */
export async function carregarPersonagensDoUsuario(uid) {
    try {
        // 1. Busca no Cache (LocalStorage)
        const cacheStr = localStorage.getItem(`codex_personagens_${uid}`);
        let personagensCache = cacheStr ? JSON.parse(cacheStr) : [];

        // 2. Busca no Firebase (Simulação por enquanto)
        // TODO: Substitua este bloco pela chamada real ao Firestore no futuro.
        const personagensFirebase = await new Promise((resolve) => {
            setTimeout(() => {
                // Quando o Firebase for conectado, ele vai retornar um array aqui.
                // Para testar o visual do menu sem Firebase, você pode simular:
                /*
                resolve([
                    { id: '1', nome: 'Kael, o Bárbaro', sistema: 'Vastura' },
                    { id: '2', nome: 'Lyra, a Feiticeira', sistema: 'Vastura' },
                    { id: '3', nome: 'Thorin', sistema: 'Old Dragon' }
                ]);
                */
                resolve([]); 
            }, 500);
        });

        // 3. Junta as duas listas e remove duplicados
        const todosPersonagens = [...personagensCache, ...personagensFirebase];
        
        // O Map garante que se um personagem estiver nos dois lugares, ele apareça só uma vez.
        const unicos = new Map();
        todosPersonagens.forEach(p => unicos.set(p.id, p));
        
        const listaFinal = Array.from(unicos.values());

        // 4. Atualiza o estado global (o cabeçalho vai reagir a isso)
        definirEstado({ personagens: listaFinal });

    } catch (erro) {
        console.error('[estado] Erro ao carregar personagens:', erro);
        definirEstado({ personagens: [] });
    }
}
