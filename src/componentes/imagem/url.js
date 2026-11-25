export function urlDeImagem(valor) {
    if (typeof valor !== 'string') return '';
    try {
        const texto = valor.trim();
        const semProtocolo = /^[\w-]+(?:\.[\w-]+)+(?:[/:?#]|$)/.test(texto);
        const url = new URL(semProtocolo ? 'https://' + texto : texto);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
        return '';
    }
}
