export function configurarMenuFicha(pagina, atualizarModoEdicao) {
    const ferramentas = pagina.querySelector('.folha-menu-lateral.direito');
    const paginas = pagina.querySelector('.folha-menu-lateral.esquerdo');
    const edicao = ferramentas.querySelector('#btn-modo-edicao');
    const animacao = ferramentas.querySelector('#btn-toggle-animacao');
    const ferramentasEdicao = ferramentas.querySelector('#folha-ferramentas-extras');
    const arquivos = criarBotao('Arquivos da ficha', 'fa-folder-open');
    const acoesArquivo = criarGrupo('folha-submenu arquivos');
    acoesArquivo.id = 'folha-acoes-arquivo';

    for (const botao of pagina.querySelectorAll('#btn-exportar-ficha, #btn-importar-ficha, #btn-limpar-ficha')) {
        botao.className = 'folha-btn-ferramenta';
        botao.setAttribute('aria-label', botao.title);
        botao.replaceChildren(botao.querySelector('i'));
        acoesArquivo.append(botao);
    }
    ferramentas.replaceChildren(edicao, animacao, arquivos, ferramentasEdicao, acoesArquivo);
    pagina.append(ferramentas, paginas);
    ferramentas.setAttribute('aria-label', 'Ferramentas da ficha');
    ferramentas.setAttribute('role', 'group');
    paginas.setAttribute('aria-label', 'Páginas da ficha');
    paginas.setAttribute('role', 'navigation');

    for (const botao of ferramentas.querySelectorAll('button[data-tooltip]')) {
        botao.setAttribute('aria-label', botao.dataset.tooltip);
        botao.title = botao.dataset.tooltip;
    }

    function mostrar(botao, grupo, aberto) {
        grupo.hidden = !aberto;
        botao.setAttribute('aria-controls', grupo.id);
        botao.setAttribute('aria-expanded', String(aberto));
    }

    function abrirMenu(menu) {
        mostrar(edicao, ferramentasEdicao, menu === 'edicao');
        mostrar(arquivos, acoesArquivo, menu === 'arquivos');
        const editando = pagina.classList.contains('wizard-ativo') || menu === 'edicao';
        if (editando !== (edicao.getAttribute('aria-pressed') === 'true')) {
            pagina.classList.toggle('modo-edicao', editando);
            edicao.setAttribute('aria-pressed', String(editando));
            atualizarModoEdicao();
        }
    }

    edicao.addEventListener('click', () => abrirMenu(ferramentasEdicao.hidden ? 'edicao' : null));
    arquivos.addEventListener('click', () => abrirMenu(acoesArquivo.hidden ? 'arquivos' : null));
    abrirMenu(null);
    return () => abrirMenu('edicao');
}

function criarGrupo(classe) {
    const grupo = document.createElement('div');
    grupo.className = classe;
    grupo.hidden = true;
    return grupo;
}

function criarBotao(nome, icone) {
    const botao = document.createElement('button');
    botao.type = 'button';
    botao.className = 'folha-btn-ferramenta';
    botao.title = nome;
    botao.setAttribute('aria-label', nome);
    const imagem = document.createElement('i');
    imagem.className = 'fas ' + icone;
    imagem.setAttribute('aria-hidden', 'true');
    botao.append(imagem);
    return botao;
}
