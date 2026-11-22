import { aplicarMedidas, capturarBlocos, escalarMedidas } from './medidas.js';
import { redimensionar } from './redimensionamento.js';
import { estado, estaEmModoEdicao, getPaginaAtiva, salvarEstado } from './paginas/estado.js';

export function aplicarTamanhoDaFolha(folha, pagina) {
    folha.style.width = pagina?.larguraFolha ? pagina.larguraFolha + 'px' : '';
    folha.style.height = pagina?.alturaFolha ? pagina.alturaFolha + 'px' : '';
}

export function configurarTamanhoDaFolha(tela, conteudo) {
    const folha = conteudo.closest('.folha');
    const area = tela.querySelector('.ficha-nova-area');
    for (const lado of ['topo', 'base', 'esq', 'dir']) {
        const alca = document.createElement('div');
        alca.className = 'folha-borda folha-borda-' + lado;
        alca.title = 'Redimensionar folha';
        alca.addEventListener('pointerdown', evento => iniciar(evento, lado, alca));
        folha.append(alca);
    }

    function iniciar(evento, lado, alca) {
        if (evento.button !== 0 || !evento.isPrimary || !estaEmModoEdicao()) return;
        const pagina = getPaginaAtiva();
        if (!pagina) return;
        evento.preventDefault();
        evento.stopPropagation();
        const largura = folha.offsetWidth;
        const altura = folha.offsetHeight;
        const origem = { x: 0, y: 0, largura, altura };
        const zoom = folha.getBoundingClientRect().width / largura || 1;
        const escalaConteudo = estado.redimensionarBlocosDoCampo;
        const proporcional = estado.redimensionarEmConjunto;
        const larguraArea = conteudo.clientWidth;
        const alturaArea = conteudo.clientHeight;
        const campos = pagina.paineis ?? [];
        const elementos = new Map(Array.from(conteudo.children, el => [el.dataset.painelId, el]));
        const medidas = escalaConteudo ? campos.map(campo => {
            const elemento = elementos.get(String(campo.id));
            const interno = elemento?.querySelector('.painel-conteudo');
            return { campo, origem: { ...campo }, elemento, atualizarBlocos: interno && capturarBlocos(campo, interno) };
        }) : [];
        const guias = escalaConteudo ? (pagina.guias ?? []).map(guia => ({ guia, origem: guia.posicao })) : [];
        const minLargura = Math.min(largura, escalaConteudo ? 320
            : Math.max(320, ...campos.map(campo => campo.x + campo.largura + largura - larguraArea)));
        const minAltura = Math.min(altura, escalaConteudo ? 320
            : Math.max(320, ...campos.map(campo => campo.y + campo.altura + altura - alturaArea)));
        const eventos = new AbortController();
        let alterou = false;
        let larguraAnterior = largura;
        let alturaAnterior = altura;

        alca.addEventListener('pointermove', ev => {
            if (ev.pointerId !== evento.pointerId) return;
            const dx = (ev.clientX - evento.clientX) / zoom;
            const dy = (ev.clientY - evento.clientY) / zoom;
            const tamanho = redimensionar(origem, lado === 'esq' ? 'dir' : lado === 'topo' ? 'base' : lado,
                lado === 'esq' ? -dx : dx, lado === 'topo' ? -dy : dy,
                { minLargura, minAltura, proporcional });
            tamanho.largura = Math.round(tamanho.largura);
            tamanho.altura = Math.round(tamanho.altura);
            if (tamanho.largura === larguraAnterior && tamanho.altura === alturaAnterior) return;
            alterou = true;
            pagina.larguraFolha = tamanho.largura;
            pagina.alturaFolha = tamanho.altura;
            aplicarTamanhoDaFolha(folha, pagina);
            if (lado === 'esq') area.scrollLeft += (tamanho.largura - larguraAnterior) * zoom;
            if (lado === 'topo') area.scrollTop += (tamanho.altura - alturaAnterior) * zoom;
            larguraAnterior = tamanho.largura;
            alturaAnterior = tamanho.altura;
            const escalaX = larguraArea ? conteudo.clientWidth / larguraArea : 1;
            const escalaY = alturaArea ? conteudo.clientHeight / alturaArea : 1;
            for (const campo of medidas) {
                aplicarMedidas(campo.campo, campo.elemento, escalarMedidas(campo.origem, escalaX, escalaY));
            }
            for (const campo of medidas) campo.atualizarBlocos?.();
            for (const { guia, origem } of guias) {
                guia.posicao = Math.round(origem * (guia.eixo === 'x' ? tamanho.largura / largura : tamanho.altura / altura));
            }
        }, { signal: eventos.signal });
        alca.addEventListener('lostpointercapture', () => {
            eventos.abort();
            if (!alterou) return;
            salvarEstado({ tamanhoFolha: { pagina, escalaConteudo }, guiasPaginaId: guias.length ? pagina.id : undefined });
            tela.dispatchEvent(new Event('codex:pagina-ficha-atualizada'));
        }, { signal: eventos.signal, once: true });
        alca.setPointerCapture(evento.pointerId);
    }
}
