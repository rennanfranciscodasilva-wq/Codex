export function configurarDescricao(sheet, aoAlterar) {
    const controles = document.createElement('div');
    controles.innerHTML = `
        <label class="sheet-field">
            Adicionar descrição
            <select class="sheet-input">
                <option value="nao">Não</option>
                <option value="sim">Sim</option>
            </select>
        </label>
        <label class="sheet-field descricao-texto" hidden>
            Descrição
            <textarea class="sheet-input" rows="3"></textarea>
        </label>
    `;
    sheet.querySelector('.sheet-body').appendChild(controles);
    const seletor = controles.querySelector('select');
    const texto = controles.querySelector('textarea');
    const rotulo = texto.parentElement;

    seletor.addEventListener('change', () => {
        rotulo.hidden = seletor.value !== 'sim';
        if (rotulo.hidden) texto.value = '';
        aoAlterar(rotulo.hidden ? undefined : texto.value);
    });
    texto.addEventListener('input', () => {
        if (!rotulo.hidden) aoAlterar(texto.value);
    });

    return (descricao, editavel = true) => {
        const ativa = typeof descricao === 'string';
        controles.hidden = !editavel;
        seletor.value = ativa ? 'sim' : 'nao';
        rotulo.hidden = !ativa;
        texto.value = ativa ? descricao : '';
    };
}

let contadorDescricao = 0;
const descricoesPorTitulo = new WeakMap();

export function adicionarDescricaoAoTitulo(titulo, descricao) {
    if (!titulo) return;
    const texto = typeof descricao === 'string' ? descricao.trim() : '';
    const atualizarDescricao = descricoesPorTitulo.get(titulo);
    if (atualizarDescricao) {
        atualizarDescricao(texto);
        return;
    }
    if (!texto) return;

    const dica = document.createElement('div');
    dica.id = 'ficha-descricao-' + ++contadorDescricao;
    dica.className = 'ficha-descricao-dica';
    dica.setAttribute('popover', 'auto');
    dica.setAttribute('role', 'tooltip');
    const entrada = titulo.matches('.painel-header, .bloco-titulo-wrapper') ? titulo.querySelector('input') : null;
    const ancoraAcessivel = entrada ?? titulo;
    function atualizar(valor) {
        dica.textContent = valor;
        if (valor) ancoraAcessivel.setAttribute('aria-describedby', dica.id);
        else {
            ocultar();
            ancoraAcessivel.removeAttribute('aria-describedby');
        }
        if (!entrada) titulo.tabIndex = valor ? 0 : -1;
    }
    descricoesPorTitulo.set(titulo, atualizar);

    function mostrar() {
        if (!dica.textContent || dica.matches(':popover-open')) return;
        dica.showPopover();
        const zoom = dica.currentCSSZoom;
        if (zoom && zoom !== 1 && !dica.style.zoom) dica.style.zoom = 1 / zoom;
        const ancora = titulo.getBoundingClientRect();
        const caixa = dica.getBoundingClientRect();
        const margem = 8;
        const esquerda = ancora.left + (ancora.width - caixa.width) / 2;
        dica.style.left = Math.max(margem, Math.min(esquerda, document.documentElement.clientWidth - caixa.width - margem)) + 'px';
        const abaixo = ancora.bottom + margem;
        const acima = ancora.top - caixa.height - margem;
        const limite = document.documentElement.clientHeight - caixa.height - margem;
        dica.style.top = Math.max(margem, Math.min(acima >= margem ? acima : abaixo, limite)) + 'px';
    }

    function ocultar() {
        if (dica.matches(':popover-open')) dica.hidePopover();
    }

    let toqueEmDescricaoAberta = false;
    titulo.addEventListener('pointerdown', evento => {
        if (evento.pointerType === 'touch') toqueEmDescricaoAberta = dica.matches(':popover-open');
    });
    titulo.addEventListener('pointerenter', evento => {
        if (evento.pointerType === 'mouse') mostrar();
    });
    titulo.addEventListener('pointerleave', evento => {
        if (evento.pointerType === 'mouse') ocultar();
    });
    titulo.addEventListener('focusin', evento => {
        if (evento.target === (entrada ?? titulo) && evento.target.matches(':focus-visible')) mostrar();
    });
    titulo.addEventListener('focusout', ocultar);
    titulo.addEventListener('click', evento => {
        if (evento.pointerType !== 'touch' || titulo.closest('.modo-edicao') ||
            evento.target.closest('input:not([readonly]), textarea:not([readonly]), button, a')) return;
        if (toqueEmDescricaoAberta) ocultar();
        else mostrar();
    });
    titulo.append(dica);
    atualizar(texto);
}
