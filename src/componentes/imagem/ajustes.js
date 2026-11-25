import './ajustes.css';
import { urlDeImagem } from './url.js';

export { urlDeImagem };

export function configurarPreviaImagem(input, quadro, img, controles, status) {
    let enderecoAtual = '';
    img.onload = () => {
        if (img.getAttribute('src') !== enderecoAtual) return;
        img.hidden = false;
        status.textContent = '';
    };
    img.onerror = () => {
        if (img.getAttribute('src') !== enderecoAtual) return;
        img.hidden = true;
        status.textContent = 'A imagem não carregou. Confira se o endereço abre diretamente a imagem.';
    };

    return () => {
        const texto = input.value.trim();
        const endereco = urlDeImagem(texto);
        quadro.hidden = !texto;
        controles.hidden = !texto;
        if (!endereco) {
            enderecoAtual = '';
            img.hidden = true;
            img.removeAttribute('src');
            status.textContent = texto ? 'Digite ou cole um endereço de imagem válido.' : '';
        } else if (endereco !== enderecoAtual) {
            enderecoAtual = endereco;
            img.hidden = true;
            status.textContent = 'Carregando imagem…';
            img.src = endereco;
        }
        return endereco;
    };
}

export function aplicarAjustes(img, { zoom = 1, posX = 0, posY = 0 } = {}) {
    img.style.transform = `translate(-50%, -50%) translate(${posX}%, ${posY}%) scale(${zoom})`;
}

export function criarAjustesImagem(conteudo, aoAlterar, zoomInicial = 1) {
    const controles = [
        ['zoom', 'Zoom', 0.1, 5, 0.1, zoomInicial],
        ['posX', 'Posição horizontal', -100, 100, 1, 0],
        ['posY', 'Posição vertical', -100, 100, 1, 0]
    ].map(([chave, nome, min, max, step, valor]) => {
        const linha = document.createElement('div');
        linha.className = 'ajustes-imagem-linha';
        linha.innerHTML = `
            <span>${nome}</span><output></output>
            <button type="button" aria-label="Diminuir ${nome.toLowerCase()}">−</button>
            <input type="range" aria-label="${nome}" min="${min}" max="${max}" step="${step}" value="${valor}">
            <button type="button" aria-label="Aumentar ${nome.toLowerCase()}">+</button>`;
        const input = linha.querySelector('input');
        const mostrar = () => {
            linha.querySelector('output').textContent = chave === 'zoom'
                ? Math.round(input.valueAsNumber * 100) + '%'
                : input.value + '%';
        };
        const mover = direcao => {
            if (direcao > 0) input.stepUp();
            else input.stepDown();
            input.dispatchEvent(new Event('input'));
        };
        const [menos, mais] = linha.querySelectorAll('button');
        menos.onclick = () => mover(-1);
        mais.onclick = () => mover(1);
        input.oninput = () => {
            mostrar();
            aoAlterar(obter());
        };
        mostrar();
        conteudo.append(linha);
        return { chave, input, mostrar, valor };
    });

    const obter = () => Object.fromEntries(controles.map(({ chave, input }) => [chave, input.valueAsNumber]));
    return {
        obter,
        definir(ajustes = {}) {
            for (const { chave, input, mostrar, valor } of controles) {
                input.value = Number.isFinite(ajustes[chave]) ? ajustes[chave] : valor;
                mostrar();
            }
            return obter();
        }
    };
}
