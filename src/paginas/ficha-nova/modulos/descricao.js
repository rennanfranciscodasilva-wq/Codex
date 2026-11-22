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

export function adicionarIndicadorDescricao(titulo, descricao) {
    if (typeof descricao !== 'string' || !descricao.trim()) return;

    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'ficha-descricao-botao';
    botao.textContent = '?';
    botao.setAttribute('aria-label', 'Mostrar descrição');
    const dica = document.createElement('div');
    dica.id = 'ficha-descricao-' + ++contadorDescricao;
    dica.className = 'ficha-descricao-dica';
    dica.setAttribute('popover', 'auto');
    dica.textContent = descricao.trim();
    botao.setAttribute('aria-controls', dica.id);
    botao.setAttribute('aria-expanded', 'false');
    dica.addEventListener('toggle', evento => {
        botao.setAttribute('aria-expanded', String(evento.newState === 'open'));
    });

    function mostrar() {
        if (dica.matches(':popover-open')) return;
        dica.showPopover();
        const zoom = dica.currentCSSZoom;
        if (zoom && zoom !== 1 && !dica.style.zoom) dica.style.zoom = 1 / zoom;
        const ancora = botao.getBoundingClientRect();
        const caixa = dica.getBoundingClientRect();
        const margem = 8;
        dica.style.left = Math.max(margem, Math.min(ancora.right - caixa.width, document.documentElement.clientWidth - caixa.width - margem)) + 'px';
        const abaixo = ancora.bottom + margem;
        const alturaTela = document.documentElement.clientHeight;
        const topo = abaixo + caixa.height <= alturaTela - margem ? abaixo : ancora.top - caixa.height - margem;
        dica.style.top = Math.max(margem, topo) + 'px';
    }

    botao.addEventListener('pointerdown', evento => evento.stopPropagation());
    botao.addEventListener('pointerenter', evento => {
        if (evento.pointerType === 'mouse') mostrar();
    });
    botao.addEventListener('pointerleave', evento => {
        if (evento.pointerType === 'mouse' && dica.matches(':popover-open')) dica.hidePopover();
    });
    botao.addEventListener('click', evento => {
        evento.stopPropagation();
        if (dica.matches(':popover-open')) dica.hidePopover();
        else mostrar();
    });
    titulo.classList.add('com-descricao');
    titulo.append(botao, dica);
}
