import { ajustarTituloAoRedimensionar } from './redimensionamento.js';

export function aplicarMedidas(item, elemento, medidas) {
    Object.assign(item, medidas);
    if (!elemento) return;
    elemento.style.left = item.x + 'px';
    elemento.style.top = item.y + 'px';
    elemento.style.width = item.largura + 'px';
    elemento.style.height = item.altura + 'px';
}

export function escalarMedidas(origem, escalaX, escalaY) {
    return {
        x: origem.x * escalaX,
        y: origem.y * escalaY,
        largura: origem.largura * escalaX,
        altura: origem.altura * escalaY
    };
}

export function capturarBlocos(painel, conteudo) {
    const largura = conteudo.clientWidth;
    const altura = conteudo.clientHeight;
    const elementos = new Map(Array.from(conteudo.children, elemento => [elemento.dataset.blocoId, elemento]));
    const blocos = (painel.blocos ?? []).map(bloco => ({
        bloco, origem: { ...bloco }, elemento: elementos.get(String(bloco.id))
    }));

    return () => {
        const escalaX = largura ? conteudo.clientWidth / largura : 1;
        const escalaY = altura ? conteudo.clientHeight / altura : 1;
        for (const { bloco, origem, elemento } of blocos) {
            const medidas = escalarMedidas(origem, escalaX, escalaY);
            ajustarTituloAoRedimensionar(bloco, elemento, medidas);
            aplicarMedidas(bloco, elemento, medidas);
        }
    };
}
