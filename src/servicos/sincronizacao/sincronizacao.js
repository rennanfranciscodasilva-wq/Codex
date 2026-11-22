import { observarAutenticacao } from '../autenticacao/autenticacao.js';
import { auth } from '../firebase/config.js';
import { enviarPendencias, temAlteracoes } from '../armazenamento/biblioteca.js';
import { lerSaldoManual } from './firestore.js';
import { adiarTentativa, avancarTempo, formatarTempo, lerTempo, reiniciarTempo } from './relogio.js';
import { abrirDialogo, mostrarAviso } from '../../componentes/dialogos/dialogos.js';
import { mostrarNotificacao } from '../../componentes/notificacoes/notificacoes.js';

const calendario = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
});
const ouvintes = new Set();
let uid, amostra, saldo, dia, ocupada, mensagem, confirmando;
let pedidoSaldo = 0;

function atualizar() {
    const estado = uid ? {
        tempo: formatarTempo(lerTempo(uid).restante),
        processando: Boolean(ocupada),
        saldo,
        disponivel: navigator.onLine && !ocupada && !confirmando && saldo !== 0 && temAlteracoes(uid),
        mensagem: mensagem || (temAlteracoes(uid) ? 'Salvo neste navegador' : 'Sem alterações pendentes')
    } : null;
    for (const ouvinte of ouvintes) ouvinte(estado);
}

export function observarSincronizacao(ouvinte) {
    ouvintes.add(ouvinte);
    atualizar();
}

async function atualizarSaldo(conta) {
    const pedido = ++pedidoSaldo;
    try {
        const restantes = await lerSaldoManual(conta);
        if (uid !== conta || pedido !== pedidoSaldo) return;
        saldo = Math.max(0, restantes);
    } catch (erro) {
        console.error('[sincronizacao] saldo indisponível:', erro);
        if (uid !== conta || pedido !== pedidoSaldo) return;
        saldo = null;
    }
    atualizar();
    return saldo;
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
        mensagem = pendente ? 'Sincronização em nuvem está acontecendo agora' : 'Verificando alterações…';
        if (pendente) mostrarNotificacao(mensagem, '', 'aviso');
        atualizar();
        try {
            const [resultado] = await Promise.all([
                pendente ? enviarPendencias(conta, manual) : { total: 0 },
                new Promise(resolve => setTimeout(resolve, 500))
            ]);
            if (conta !== uid || !resultado) return;
            if (manual && resultado.restantes != null) {
                pedidoSaldo++;
                saldo = resultado.restantes;
            }
            const restam = temAlteracoes(conta);
            if (resultado.total > 0) {
                if (restam) mostrarNotificacao('Backup parcial concluído', 'Há mais alterações salvas neste navegador.', 'aviso');
                else mostrarNotificacao('Dados sincronizados', '', 'sucesso');
            }
            mensagem = restam ? 'Há alterações pendentes'
                : resultado.total > 0 ? 'Dados sincronizados' : 'Sem alterações para sincronizar';
            if (!manual) reiniciarTempo(conta);
        } catch (erro) {
            console.error('[sincronizacao]', erro);
            if (conta !== uid) return;
            if (!manual) adiarTentativa(conta);
            if (erro.code === 'backup/limite-manual') {
                pedidoSaldo++;
                saldo = 0;
                mensagem = 'Você usou as cinco sincronizações manuais de hoje.';
                return;
            }
            mensagem = erro.code === 'backup/conflito'
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
    if (!conta || !navigator.onLine || ocupada || confirmando || !temAlteracoes(conta)) return;
    confirmando = true;
    atualizar();
    try {
        const disponiveis = await atualizarSaldo(conta);
        if (conta !== uid) return;
        if (disponiveis == null) {
            await mostrarAviso('Não foi possível consultar seu saldo de sincronizações. As alterações continuam salvas neste navegador. Confira a conexão e se as regras do Firestore foram publicadas.');
            return;
        }
        if (!disponiveis) {
            await mostrarAviso('Você usou as cinco sincronizações manuais de hoje. O saldo volta à meia-noite de Brasília.');
            return;
        }
        const confirmado = await abrirDialogo({
            titulo: 'Sincronizar com a nuvem',
            mensagem: `Você realmente deseja sincronizar as informações agora?\nVocê tem ${disponiveis} de 5 sincronizações manuais disponíveis hoje.`,
            confirmar: 'Sincronizar agora'
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

    const hoje = calendario.format(new Date());
    if (dia !== hoje) {
        dia = hoje;
        saldo = null;
        void atualizarSaldo(conta);
    }
}

export function iniciarSincronizacao() {
    observarAutenticacao(usuario => {
        uid = usuario?.uid;
        amostra = Date.now();
        dia = calendario.format(new Date());
        saldo = null;
        mensagem = '';
        ocupada = false;
        confirmando = false;
        if (uid && navigator.onLine) void atualizarSaldo(uid);
        atualizar();
    });
    window.addEventListener('codex-biblioteca', () => {
        if (!ocupada) mensagem = '';
        atualizar();
    });
    window.addEventListener('storage', evento => {
        if (uid && evento.key === 'codex_biblioteca:' + uid) {
            if (!ocupada) mensagem = '';
            atualizar();
        }
    });
    window.addEventListener('focus', () => {
        if (uid && navigator.onLine && !confirmando) void atualizarSaldo(uid);
    });
    window.addEventListener('offline', () => { amostra = null; atualizar(); });
    window.addEventListener('online', () => {
        amostra = Date.now();
        if (uid) void atualizarSaldo(uid);
        atualizar();
    });
    window.addEventListener('pagehide', () => { amostra = null; });
    window.addEventListener('pageshow', () => { amostra = Date.now(); });
    setInterval(marcarTempo, 1000);
}
