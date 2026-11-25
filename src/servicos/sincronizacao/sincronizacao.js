import { observarAutenticacao } from '../autenticacao/autenticacao.js';
import { auth } from '../firebase/config.js';
import { enviarPendencias, temAlteracoes } from '../armazenamento/biblioteca.js';
import { lerSaldoManual, limiteManual } from './firestore.js';
import { adiarTentativa, avancarTempo, formatarTempo, lerTempo, reiniciarTempo } from './relogio.js';
import { abrirDialogo, mostrarAviso } from '../../componentes/dialogos/dialogos.js';
import { mostrarNotificacao } from '../../componentes/notificacoes/notificacoes.js';

const ouvintes = new Set();
let uid, amostra, ocupada, confirmando;

function atualizar() {
    const estado = uid ? {
        tempo: formatarTempo(lerTempo(uid).restante),
        processando: Boolean(ocupada),
        uid,
        pendente: temAlteracoes(uid),
        disponivel: navigator.onLine && !ocupada && !confirmando
    } : null;
    for (const ouvinte of ouvintes) ouvinte(estado);
}

export function observarSincronizacao(ouvinte) {
    ouvintes.add(ouvinte);
    atualizar();
}

async function consultarSaldo(conta) {
    try {
        return Math.max(0, await lerSaldoManual(conta));
    } catch (erro) {
        console.error('[sincronizacao] saldo indisponível:', erro);
        return null;
    }
}

async function sincronizar(manual) {
    const conta = uid;
    if (!conta || !navigator.onLine || ocupada) return;
    const executar = async () => {
        if (conta !== uid || conta !== auth.currentUser?.uid || !navigator.onLine) return;
        const relogio = lerTempo(conta);
        if (!manual && (relogio.restante > 0 || relogio.tentarApos > Date.now())) return;
        const pendente = temAlteracoes(conta);
        if (manual && !pendente) return;
        ocupada = true;
        if (pendente) mostrarNotificacao('Sincronização em nuvem está acontecendo agora', '', 'aviso');
        atualizar();
        try {
            const [resultado] = await Promise.all([
                pendente ? enviarPendencias(conta, manual) : { total: 0 },
                new Promise(resolve => setTimeout(resolve, 500))
            ]);
            if (conta !== uid || !resultado) return;
            if (resultado.total > 0 && temAlteracoes(conta)) {
                mostrarNotificacao('Backup parcial concluído', 'Há mais alterações salvas neste navegador.', 'aviso');
            }
            if (!manual) reiniciarTempo(conta);
        } catch (erro) {
            console.error('[sincronizacao]', erro);
            if (conta !== uid) return;
            if (!manual) adiarTentativa(conta);
            const mensagem = erro.code === 'backup/limite-manual'
                ? 'Você usou todas as sincronizações manuais de hoje.'
                : erro.code === 'backup/conflito'
                ? 'Conflito com outro dispositivo. Dados locais preservados.'
                : erro.code === 'backup/nome-ocupado'
                    ? erro.message
                : erro.code === 'backup/modelo-ausente'
                    ? 'O modelo da ficha não está na nuvem. Os dados locais foram preservados.'
                : erro.code === 'permission-denied'
                    ? 'O Firestore recusou o backup. Confira se as regras atualizadas foram publicadas.'
                    : erro.code === 'backup/intervalo'
                        ? 'Aguardando o intervalo entre backups automáticos desta conta'
                        : 'Backup pendente neste navegador';
            mostrarNotificacao('Sincronização não concluída', mensagem, 'aviso');
        } finally {
            if (conta === uid) {
                ocupada = false;
                atualizar();
            }
        }
    };
    if (navigator.locks) {
        await navigator.locks.request('codex-envio:' + conta, { ifAvailable: !manual }, trava => {
            if (trava) return executar();
        });
    }
    else await executar();
}

export async function sincronizarAgora() {
    const conta = uid;
    if (!conta || !navigator.onLine || ocupada || confirmando) return;
    confirmando = true;
    atualizar();
    try {
        const disponiveis = await consultarSaldo(conta);
        if (conta !== uid) return;
        if (disponiveis == null) {
            await mostrarAviso('Não foi possível consultar seu saldo de sincronizações. As alterações continuam salvas neste navegador. Confira a conexão e se as regras do Firestore foram publicadas.');
            return;
        }
        const resumo = `Sincronizações manuais hoje: ${limiteManual - disponiveis} feitas, ${disponiveis} restantes.`;
        if (!disponiveis || !temAlteracoes(conta)) {
            await mostrarAviso(resumo);
            return;
        }
        const confirmado = await abrirDialogo({
            titulo: 'Sincronizar com a nuvem',
            mensagem: `Sincronizar as alterações com a nuvem?\n${resumo}`,
            confirmar: 'Sincronizar'
        });
        if (confirmado && conta === uid) await sincronizar(true);
    } finally {
        if (conta === uid) {
            confirmando = false;
            atualizar();
        }
    }
}

function marcarTempo() {
    const conta = uid;
    const agora = Date.now();
    const inicio = amostra;
    amostra = agora;
    if (!conta || !navigator.onLine || !inicio) return;
    const contar = () => {
        if (conta !== uid || !navigator.onLine) return;
        const tempo = avancarTempo(conta, inicio, agora);
        if (tempo.aviso) {
            const minutos = tempo.aviso === 1 ? 'Falta 1 minuto' : 'Faltam 5 minutos';
            mostrarNotificacao(minutos + ' para a sincronização em nuvem', '', 'aviso');
        }
        if (!tempo.restante) void sincronizar(false);
        atualizar();
    };
    if (navigator.locks) void navigator.locks.request('codex-relogio:' + conta, contar);
    else contar();
}

export function iniciarSincronizacao() {
    observarAutenticacao(usuario => {
        uid = usuario?.uid;
        amostra = Date.now();
        ocupada = false;
        confirmando = false;
        atualizar();
    });
    window.addEventListener('codex-biblioteca', atualizar);
    window.addEventListener('storage', evento => {
        if (uid && evento.key === 'codex_biblioteca:' + uid) atualizar();
    });
    window.addEventListener('offline', () => { amostra = null; atualizar(); });
    window.addEventListener('online', () => {
        amostra = Date.now();
        atualizar();
    });
    window.addEventListener('pagehide', () => { amostra = null; });
    window.addEventListener('pageshow', () => { amostra = Date.now(); });
    setInterval(marcarTempo, 1000);
}
