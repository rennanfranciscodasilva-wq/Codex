const HORA = 3_600_000;

export function lerTempo(uid) {
    const salvo = JSON.parse(localStorage.getItem('codex_relogio:' + uid) || 'null');
    return salvo ?? { restante: HORA, ultimo: 0 };
}

export function avancarTempo(uid, inicio, agora) {
    const chave = 'codex_relogio:' + uid;
    const tempo = lerTempo(uid);
    const decorrido = Math.max(0, agora - Math.max(inicio, tempo.ultimo));
    const anterior = tempo.restante;
    tempo.restante = Math.max(0, anterior - decorrido);
    tempo.ultimo = Math.max(tempo.ultimo, agora);
    localStorage.setItem(chave, JSON.stringify(tempo));
    const aviso = [1, 5].find(minutos => anterior > minutos * 60_000 &&
        tempo.restante <= minutos * 60_000 && tempo.restante > 0);
    return { ...tempo, aviso };
}

export function reiniciarTempo(uid) {
    localStorage.setItem('codex_relogio:' + uid, JSON.stringify({ restante: HORA, ultimo: Date.now() }));
}

export function adiarTentativa(uid) {
    const tempo = lerTempo(uid);
    localStorage.setItem('codex_relogio:' + uid, JSON.stringify({
        ...tempo, tentarApos: Date.now() + 60_000
    }));
}

export function formatarTempo(ms) {
    const segundos = Math.ceil(ms / 1000);
    return String(Math.floor(segundos / 60)).padStart(2, '0') +
        ':' + String(segundos % 60).padStart(2, '0');
}
