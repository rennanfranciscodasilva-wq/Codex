const PREFIXO = 'codex_confirmacoes_pausadas:';
const DIA = 86_400_000;
const FUSO_BRASILIA = -3 * 3_600_000;
const emMemoria = new Map();

export const EVENTO_CONFIRMACOES = 'codex:confirmacoes-alteradas';

export function areaDasConfirmacoes() {
    const rota = location.hash.slice(1).split('?')[0].replace(/\/+$/, '') || '/inicio';
    if (['/ficha/nova', '/ficha/modelo', '/ficha/ficha-nova'].includes(rota)) return 'editor da ficha';
    if (rota === '/inicio') return 'menu inicial';
    if (rota === '/perfil') return 'perfil';
    return rota;
}

export function fimDaPausa(area) {
    const chave = PREFIXO + area;
    let fim;
    try {
        fim = Number(localStorage.getItem(chave));
    } catch {
        fim = emMemoria.get(chave);
    }
    return fim > Date.now() ? fim : 0;
}

export function definirPausaDeConfirmacoes(area, pausar) {
    const chave = PREFIXO + area;
    const fim = (Math.floor((Date.now() + FUSO_BRASILIA) / DIA) + 1) * DIA - FUSO_BRASILIA;
    try {
        if (pausar) localStorage.setItem(chave, String(fim));
        else localStorage.removeItem(chave);
    } catch {
        if (pausar) emMemoria.set(chave, fim);
        else emMemoria.delete(chave);
    }
    window.dispatchEvent(new Event(EVENTO_CONFIRMACOES));
}
