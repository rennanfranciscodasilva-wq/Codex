import { confirmarAcao } from '../../../componentes/dialogos/dialogos.js';
import { getPaginaAtiva, salvarEstado } from './paginas/estado.js';

export function configurarRegua(pagina) {
    const folha = pagina.querySelector('.folha');
    const camada = document.createElement('div');
    camada.className = 'folha-regua';
    camada.hidden = true;
    folha.after(camada);
    let ativa = false;
    let excluindo = false;
    let arrasto;

    function posicionar(elemento, eixo, posicao) {
        elemento.style[eixo === 'x' ? 'left' : 'top'] = posicao + 'px';
    }

    function criarLinha(eixo, posicao) {
        const linha = document.createElement('button');
        linha.type = 'button';
        linha.className = 'folha-guia guia-' + eixo;
        linha.setAttribute('aria-label', eixo === 'x' ? 'Guia vertical' : 'Guia horizontal');
        posicionar(linha, eixo, posicao);
        camada.append(linha);
        return linha;
    }

    function iniciarArrasto(evento, eixo, guia, linha) {
        if (evento.button !== 0 || arrasto) return;
        const atual = getPaginaAtiva();
        if (!atual) return;
        evento.preventDefault();
        evento.stopPropagation();
        const alvo = evento.currentTarget;
        if (excluindo) return;

        const previa = linha ?? criarLinha(eixo, 0);
        function mover(ev) {
            const rect = folha.getBoundingClientRect();
            const horizontal = eixo === 'x';
            const limite = horizontal ? folha.offsetWidth : folha.offsetHeight;
            const escala = horizontal ? rect.width / limite : rect.height / limite;
            const ponto = horizontal ? ev.clientX - rect.left : ev.clientY - rect.top;
            return Math.max(0, Math.min(limite, Math.round(ponto / escala)));
        }
        let posicao = guia?.posicao ?? mover(evento);
        posicionar(previa, eixo, posicao);
        const eventos = new AbortController();
        const opcoes = { signal: eventos.signal };
        arrasto = () => {
            eventos.abort();
            if (alvo.hasPointerCapture(evento.pointerId)) alvo.releasePointerCapture(evento.pointerId);
            arrasto = null;
        };
        alvo.addEventListener('pointermove', ev => {
            if (evento.pointerId !== ev.pointerId) return;
            posicao = mover(ev);
            posicionar(previa, eixo, posicao);
        }, opcoes);
        alvo.addEventListener('pointerup', ev => {
            if (evento.pointerId !== ev.pointerId) return;
            if (guia) guia.posicao = posicao;
            else (atual.guias ??= []).push({ eixo, posicao });
            salvarEstado({ guiasPaginaId: atual.id });
            renderizar();
        }, opcoes);
        alvo.addEventListener('lostpointercapture', renderizar, opcoes);
        alvo.setPointerCapture(evento.pointerId);
    }

    function renderizar() {
        arrasto?.();
        camada.replaceChildren();
        if (!ativa) return;
        for (const eixo of ['x', 'y']) {
            const regua = document.createElement('div');
            regua.className = 'folha-regua-borda regua-' + eixo;
            const limite = eixo === 'x' ? folha.offsetHeight : folha.offsetWidth;
            for (let valor = 0; valor < limite; valor += 100) {
                const marca = document.createElement('span');
                marca.textContent = valor;
                posicionar(marca, eixo === 'x' ? 'y' : 'x', valor);
                regua.append(marca);
            }
            regua.addEventListener('pointerdown', evento => iniciarArrasto(evento, eixo, null, null));
            camada.append(regua);
        }
        const atual = getPaginaAtiva();
        for (const guia of atual?.guias ?? []) {
            const linha = criarLinha(guia.eixo, guia.posicao);
            linha.addEventListener('pointerdown', evento => iniciarArrasto(evento, guia.eixo, guia, linha));
            linha.addEventListener('click', async () => {
                if (!excluindo || !(await confirmarAcao('Excluir esta linha-guia?', { pausavel: true }))) return;
                atual.guias = atual.guias.filter(item => item !== guia);
                salvarEstado({ guiasPaginaId: atual.id });
                renderizar();
            });
        }
    }

    pagina.addEventListener('codex:pagina-ficha-atualizada', renderizar);
    return {
        ativar(valor) {
            ativa = valor;
            camada.hidden = !ativa;
            renderizar();
        },
        excluir(valor) {
            excluindo = valor;
            camada.classList.toggle('excluir-guias', valor);
        }
    };
}

export function encaixarNasGuias(folha, area, x, y, largura, altura, zoom) {
    if (!folha.closest('.modo-edicao') || !folha.nextElementSibling?.matches('.folha-regua:not([hidden])')) return { x, y };
    const guias = getPaginaAtiva()?.guias;
    if (!guias?.length) return { x, y };
    const origem = folha.getBoundingClientRect();
    const destino = area.getBoundingClientRect();
    function encaixar(eixo, posicao, tamanho, deslocamento) {
        let ajuste = 0;
        let distancia = 8 / zoom;
        for (const guia of guias) {
            if (guia.eixo !== eixo) continue;
            for (const ancora of [0, tamanho / 2, tamanho]) {
                const delta = guia.posicao - deslocamento - posicao - ancora;
                if (Math.abs(delta) < distancia) {
                    distancia = Math.abs(delta);
                    ajuste = delta;
                }
            }
        }
        return posicao + ajuste;
    }
    return {
        x: encaixar('x', x, largura, (destino.left - origem.left) / zoom + area.clientLeft),
        y: encaixar('y', y, altura, (destino.top - origem.top) / zoom + area.clientTop)
    };
}
