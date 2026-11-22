const HORA = 3_600_000;

export function lerTempo(uid) {
    const salvo = JSON.parse(localStorage.getItem('codex_relogio:' + uid) || 'null');
    return salvo ?? { restante: HORA, ultimo: 0 };
}

export function avancarTempo(uid, inicio, agora) {
    const chave = 'codex_relogio:' + uid;
    const tempo = lerTempo(uid);
    const decorrido = Math.max(0, agora - Math.max(inicio, tempo.ultimo));
    const chegou = decorrido >= tempo.restante;
    tempo.restante = chegou ? HORA : tempo.restante - decorrido;
    tempo.ultimo = Math.max(tempo.ultimo, agora);
    localStorage.setItem(chave, JSON.stringify(tempo));
    return chegou;
}

export function formatarTempo(ms) {
    const segundos = Math.ceil(ms / 1000);
    return String(Math.floor(segundos / 60)).padStart(2, '0') +
        ':' + String(segundos % 60).padStart(2, '0');
}
