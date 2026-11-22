import { observarAutenticacao } from '../autenticacao/autenticacao.js';
import { auth } from '../firebase/config.js';
import { enviarPendencias, lerSaldoManual, temAlteracoes } from '../armazenamento/biblioteca.js';
import { avancarTempo, formatarTempo, lerTempo } from './relogio.js';

const calendario = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
});
const ouvintes = new Set();
let uid, amostra, saldo, dia, ocupada, mensagem;

function atualizar() {
    const estado = uid ? {
        tempo: formatarTempo(lerTempo(uid).restante),
        saldo,
        disponivel: navigator.onLine && !ocupada && saldo > 0 && temAlteracoes(uid),
        mensagem: mensagem || (temAlteracoes(uid) ? 'Salvo neste navegador' : 'Sem alterações pendentes')
    } : null;
    for (const ouvinte of ouvintes) ouvinte(estado);
}

export function observarSincronizacao(ouvinte) {
    ouvintes.add(ouvinte);
    atualizar();
}

async function atualizarSaldo(conta) {
    try {
        const registro = await lerSaldoManual(conta);
        if (uid === conta) saldo = registro?.dia === dia ? 5 - registro.usados : 5;
    } catch (erro) {
        console.error('[sincronizacao] saldo indisponível:', erro);
        if (uid === conta) saldo = null;
    }
    atualizar();
}

async function sincronizar(manual) {
    const conta = uid;
    if (!conta || !navigator.onLine || ocupada || !temAlteracoes(conta)) return;
    const executar = async () => {
        if (conta !== uid || conta !== auth.currentUser?.uid) return;
        ocupada = true;
        mensagem = 'Sincronizando…';
        atualizar();
        try {
            const resultado = await enviarPendencias(conta, manual);
            if (conta !== uid || !resultado) return;
            if (manual && resultado.restantes != null) saldo = resultado.restantes;
            mensagem = temAlteracoes(conta) ? 'Há alterações pendentes' : 'Sincronizado';
        } catch (erro) {
            console.error('[sincronizacao]', erro);
            if (conta !== uid) return;
            if (erro.code === 'functions/resource-exhausted') saldo = 0;
            mensagem = erro.code === 'functions/aborted'
                ? 'Conflito com outro dispositivo. Dados locais preservados.'
                : 'Backup pendente neste navegador';
        } finally {
            if (conta === uid) {
                ocupada = false;
                atualizar();
            }
        }
    };
    if (navigator.locks) await navigator.locks.request('codex-envio:' + conta, executar);
    else await executar();
}

export function sincronizarAgora() {
    if (saldo > 0) return sincronizar(true);
}

function marcarTempo() {
    const conta = uid;
    const agora = Date.now();
    const inicio = amostra;
    amostra = agora;
    if (!conta || !navigator.onLine || !inicio) return;
    const contar = () => {
        if (conta !== uid || !navigator.onLine) return;
        if (avancarTempo(conta, inicio, agora)) void sincronizar(false);
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
        if (uid && navigator.onLine) void atualizarSaldo(uid);
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
