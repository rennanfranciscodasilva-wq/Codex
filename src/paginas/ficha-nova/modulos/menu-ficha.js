import { mostrarNotificacao } from '../../../componentes/notificacoes/notificacoes.js';
import { salvarEstado } from './paginas/estado.js';
import { configurarRegua } from './regua.js';

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
    const salvar = criarBotao('Salvar neste navegador', 'fa-floppy-disk');
    salvar.id = 'btn-salvar-ficha-local';
    salvar.addEventListener('click', () => {
        try {
            if (!salvarEstado()) throw new Error('Dados da ficha indisponíveis.');
            mostrarNotificacao('Salvo neste navegador', '', 'sucesso');
        } catch (erro) {
            console.error('[ficha] falha ao salvar manualmente:', erro);
            mostrarNotificacao('Não foi possível salvar neste navegador', '', 'erro');
        }
    });
    acoesArquivo.append(salvar);
    const grupos = [
        ['layout', 'Layout', 'fa-table-cells', ['#btn-modo-layout', '#btn-redimensionar-conjunto', '#btn-redimensionar-blocos-campo']],
        ['adicionar', 'Adicionar', 'fa-plus', ['#btn-add-campo', '#btn-add-bloco']],
        ['selecao', 'Ações de seleção', 'fa-arrow-pointer', ['#btn-acao-config', '#btn-acao-copiar', '#btn-acao-colar', '#btn-acao-excluir']]
    ].map(([id, nome, icone, seletores]) => {
        const botao = criarBotao(nome, icone);
        const faixa = criarGrupo('folha-submenu folha-faixa-edicao');
        faixa.id = 'folha-grupo-' + id;
        for (const seletor of seletores) {
            const controle = ferramentasEdicao.querySelector(seletor);
            if (controle) faixa.append(controle);
        }
        return { botao, faixa };
    });
    ferramentasEdicao.replaceChildren(...grupos.map(grupo => grupo.botao), ...grupos.map(grupo => grupo.faixa));

    const layout = grupos[0].faixa;
    const regua = configurarRegua(pagina);
    const botaoRegua = criarBotao('Régua', 'fa-ruler-combined');
    const submenuRegua = criarGrupo('folha-submenu folha-submenu-regua');
    submenuRegua.id = 'folha-acoes-regua';
    const excluirGuias = criarBotao('Excluir guias', 'fa-eraser');
    submenuRegua.append(excluirGuias);
    layout.append(botaoRegua, submenuRegua);
    let reguaAtiva = false;
    let excluirAtivo = false;

    function marcar(botao, ativo) {
        botao.setAttribute('aria-pressed', String(ativo));
        botao.classList.toggle('ativo', ativo);
    }

    function abrirSubmenuRegua(aberto) {
        mostrar(botaoRegua, submenuRegua, aberto);
        if (!aberto) {
            excluirAtivo = false;
            marcar(excluirGuias, false);
            regua.excluir(false);
        }
    }

    function abrirGrupo(grupoAtual) {
        for (const grupo of grupos) mostrar(grupo.botao, grupo.faixa, grupo === grupoAtual);
        abrirSubmenuRegua(false);
    }

    for (const grupo of grupos) {
        grupo.botao.addEventListener('click', () => abrirGrupo(grupo.faixa.hidden ? grupo : null));
    }
    layout.addEventListener('click', evento => {
        const alvo = evento.target.closest('button');
        if (alvo && alvo !== botaoRegua && !submenuRegua.contains(alvo)) abrirSubmenuRegua(false);
    });
    botaoRegua.addEventListener('click', () => {
        if (!reguaAtiva || !submenuRegua.hidden) {
            reguaAtiva = !reguaAtiva;
            regua.ativar(reguaAtiva);
            marcar(botaoRegua, reguaAtiva);
        }
        abrirSubmenuRegua(reguaAtiva);
    });
    excluirGuias.addEventListener('click', () => {
        excluirAtivo = !excluirAtivo;
        marcar(excluirGuias, excluirAtivo);
        regua.excluir(excluirAtivo);
    });
    marcar(botaoRegua, false);
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
        if (menu !== 'edicao') abrirGrupo(null);
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
