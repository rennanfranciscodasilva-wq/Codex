import { urlDeImagem } from '../../componentes/imagem/url.js';
import { aplicarAjustes, criarEditorImagem } from '../../componentes/imagem/ajustes.js';
import { confirmarAcao, mostrarAviso } from '../../componentes/dialogos/dialogos.js';
import { armazenamentoBiblioteca, prepararBiblioteca, validarNomeNaConta } from '../../servicos/armazenamento/biblioteca.js';
import { prepararEditorFormula } from './formula.js';
import { adicionarFichaJson, adicionarModeloJson } from './biblioteca-json.js';
import { baixarJson, exportarFicha, exportarModelo, lerArquivoJson } from './portabilidade.js';
import {
    adicionarBloco, adicionarCampo, calcularModificador, calcularNumericos, criarSistema, DIRECOES, LIMITE_MAPA,
    ajustarLinhas, chavePosicao, dimensoesBloco, indexarCampos, modificadorLateral, moverBloco,
    blocosNumericos, colarBloco, podeAdicionarCampo, tamanhoBloco, termosDaFormula, tituloDuplicado
} from './modelo.js';

const SISTEMAS = 'codex_sistemas';
const FICHAS = 'codex_fichas_jogador';
const lerLista = chave => JSON.parse(armazenamentoBiblioteca.getItem(chave) || '[]');
let observadorTitulo;
let encerrarGravacaoBloco;

export function desmontarPagina() {
    encerrarGravacaoBloco?.();
    encerrarGravacaoBloco = undefined;
    observadorTitulo?.disconnect();
    observadorTitulo = undefined;
}

function limitarLinhasTitulo(texto, limite) {
    const linhas = texto.split(/\r\n?|\n/);
    return [...linhas.slice(0, limite - 1), linhas.slice(limite - 1).join(' ')].join('\n');
}

function formatarNomeNoMapa(nome) {
    const texto = nome.trim().replace(/\s/g, ' ');
    for (const palavra of texto.matchAll(/\S+/g)) {
        if (palavra.index && [...texto.slice(0, palavra.index + palavra[0].length)].length > 10) {
            return texto.slice(0, palavra.index).trimEnd() + '\n' + texto.slice(palavra.index);
        }
    }
    return texto;
}

function salvarRegistro(chave, registro) {
    const lista = lerLista(chave);
    const indice = lista.findIndex(item => item.id === registro.id);
    if (indice === -1) lista.push(registro);
    else lista[indice] = registro;
    armazenamentoBiblioteca.setItem(chave, JSON.stringify(lista));
}

function botao(texto, acao) {
    const elemento = document.createElement('button');
    elemento.type = 'button';
    elemento.className = 'btn-secondary';
    elemento.textContent = texto;
    elemento.onclick = acao;
    return elemento;
}

function rotular(texto, controle) {
    const label = document.createElement('label');
    label.append(texto, controle);
    return label;
}

export async function montarPagina(container) {
    const rota = window.location.hash;
    await prepararBiblioteca();
    if (!container.isConnected || window.location.hash !== rota) return;

    const [caminho, consulta] = rota.split('?');
    const criando = caminho === '#/ficha/nova';
    const jogando = caminho === '#/ficha/ficha-nova';
    const id = new URLSearchParams(consulta).get('id');
    const ficha = jogando && lerLista(FICHAS).find(item => item.id === id);
    let modelo = !criando && (!jogando || ficha) && lerLista(SISTEMAS).find(item =>
        item.id === (jogando ? ficha.sistemaId : id));
    if (!criando && modelo?.layout?.schemaVersion !== 2) {
        await mostrarAviso('Este modelo pertence à estrutura anterior ou não está disponível.');
        if (window.location.hash === rota) window.location.hash = '#/ficha';
        return;
    }

    const pagina = container.querySelector('#pagina-ficha-responsiva');
    const obter = seletor => pagina.querySelector('.ficha-responsiva-' + seletor);
    const inicio = obter('formulario');
    const capa = criando ? criarEditorImagem({ rotulo: 'Imagem de capa (opcional)', descricaoPrevia: 'Prévia da capa do sistema' }) : null;
    if (capa) obter('imagem-modelo').replaceChildren(capa.elemento);
    const editor = obter('editor');
    const status = obter('status');
    let limparStatus;
    function mostrarStatusTemporario(mensagem) {
        clearTimeout(limparStatus);
        status.textContent = mensagem;
        limparStatus = setTimeout(() => {
            if (status.textContent === mensagem) status.textContent = '';
        }, 4000);
    }
    const mapa = obter('mapa');
    const grade = obter('grade');
    const configurar = obter('configurar');
    const config = obter('config');
    const alinhamento = obter('alinhamento');
    const blocos = obter('blocos');
    const rolagem = obter('rolagem');
    const nomeCampo = obter('nome-campo');
    const linhasTitulo = obter('linhas-titulo');
    const formularioBloco = obter('adicionar');
    const opcoesBloco = formularioBloco.elements;
    const editorFormula = prepararEditorFormula(obter, () => sistema, () => salvarConfiguracaoBloco());
    const erroBloco = obter('erro-bloco');
    const secoesAbertasPorBloco = new WeakMap();
    const secoesBloco = [
        ['descricao', opcoesBloco.temDescricao],
        ['modificador', opcoesBloco.temModificador],
        ['formula', opcoesBloco.temFormula]
    ].map(([id, controle]) => ({
        id, controle,
        painel: formularioBloco.querySelector('[data-config="' + id + '"]'),
        botao: controle.previousElementSibling
    }));
    let blocoConfigurado = null;
    let configuracaoOriginal;
    let valorOriginalBloco;
    let editorImagemBloco;
    let configuracaoAlterada = false;
    let gravacaoBloco;
    let previaTitulo;
    let tituloOriginal;
    let tamanhoSelecionado;
    const gradeTamanho = obter('grade-tamanho');
    const resumoTamanho = obter('resumo-tamanho');
    const finalizar = obter('finalizar');
    const salvar = obter('salvar');
    const menuSalvar = obter('menu-salvar');
    const arquivoJson = obter('arquivo-json');
    const edicao = obter('edicao');
    const abrirMapa = obter('abrir-mapa');
    const joystick = obter('joystick');
    const direcoes = obter('direcoes');
    const editarTitulo = obter('editar-titulo');
    const tituloCampo = obter('campo');
    const medidorTitulo = document.createElement('canvas').getContext('2d');
    const novoBloco = obter('novo-bloco');
    const copiar = obter('copiar-bloco');
    const colar = obter('colar-bloco');
    const excluir = obter('excluir-bloco');
    let blocoSelecionado;
    let blocoCopiado;
    let sistema = modelo ? structuredClone(modelo.layout) : null;
    const camposEditados = new Set();
    const camposCriados = new Map();
    if (jogando) {
        const ocupados = indexarCampos(sistema.campos);
        for (const salvo of ficha.camposCriados ?? []) {
            const campo = structuredClone(salvo);
            camposCriados.set(campo.id, campo);
            if (!podeAdicionarCampo(ocupados, campo.x, campo.y)) continue;
            sistema.campos.push(campo);
            ocupados.set(chavePosicao(campo.x, campo.y), campo);
        }
        for (const campo of sistema.campos) {
            const ajuste = ficha.camposEditados?.[campo.id];
            if (!ajuste) continue;
            camposEditados.add(campo.id);
            Object.assign(campo, structuredClone(ajuste));
        }
    }
    const valores = jogando ? { ...ficha.valores } : { ...modelo?.valoresPadrao };
    const titulosBlocos = jogando ? { ...ficha.titulosBlocos } : {};
    let ativo = sistema?.campos[0];
    let mapaAberto = false;
    let editando = !jogando;
    let descricaoAberta;
    const respostas = new Map();
    let salvando = false;
    let gesto;
    let arrastou = false;
    finalizar.hidden = !criando;
    salvar.parentElement.hidden = criando;
    edicao.disabled = criando;
    if (jogando) {
        const voltar = obter('voltar');
        voltar.href = '#/ficha/personagens?' + new URLSearchParams({ id: modelo.id });
        voltar.setAttribute('aria-label', 'Voltar aos personagens');
        voltar.title = 'Voltar aos personagens';
    }

    function fecharFerramentas({ preservarMenuSalvar = false } = {}) {
        if (!nomeCampo.hidden) nomeCampo.blur();
        fecharConfiguracaoBloco();
        if (!preservarMenuSalvar) fecharMenuSalvar();
        for (const [controle, painel] of [[configurar, config], [joystick, direcoes]]) {
            painel.hidden = true;
            controle.setAttribute('aria-expanded', 'false');
        }
        nomeCampo.hidden = true;
    }

    function alternarPainel(controle, painel) {
        const abrir = painel.hidden;
        painel.hidden = !abrir;
        controle.setAttribute('aria-expanded', String(abrir));
        return abrir;
    }

    function fecharMenuSalvar() {
        menuSalvar.hidden = true;
        salvar.setAttribute('aria-expanded', 'false');
    }

    function abrirCampo(campo) {
        fecharFerramentas();
        if (campo !== ativo) blocoSelecionado = undefined;
        ativo = campo;
        mapaAberto = false;
        renderizar();
        rolagem.scrollTop = 0;
        tituloCampo.focus({ preventScroll: true });
    }

    function destinoDirecional(direcao) {
        return sistema.campos.find(campo => campo.x === ativo.x + direcao.x && campo.y === ativo.y + direcao.y);
    }

    function navegarDirecao(direcao) {
        const destino = destinoDirecional(direcao);
        if (!destino) {
            status.textContent = 'Nenhum campo a ' + direcao.nome.toLowerCase() + '.';
            return;
        }
        status.textContent = '';
        abrirCampo(destino);
        joystick.focus();
    }

    function atualizarResultados() {
        if (!respostas.size) return;
        const calcular = calcularNumericos(sistema, jogando ? { ...modelo.valoresPadrao, ...valores } : valores);
        for (const [id, exibir] of respostas) {
            const resultado = calcular(id);
            exibir(resultado);
        }
    }

    function renderizarMapa() {
        const porPosicao = indexarCampos(sistema.campos);
        const xs = [0, ...sistema.campos.map(campo => campo.x)];
        const ys = [0, ...sistema.campos.map(campo => campo.y)];
        const minX = Math.max(-LIMITE_MAPA, Math.min(...xs) - 1);
        const maxX = Math.min(LIMITE_MAPA, Math.max(...xs) + 1);
        const minY = Math.max(-LIMITE_MAPA, Math.min(...ys) - 1);
        const maxY = Math.min(LIMITE_MAPA, Math.max(...ys) + 1);
        grade.style.setProperty('--colunas-mapa', maxX - minX + 1);
        const celulas = document.createDocumentFragment();
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const posicao = chavePosicao(x, y);
                const campo = porPosicao.get(posicao);
                const disponivel = editando && podeAdicionarCampo(porPosicao, x, y);
                const estado = campo ? (campo === ativo ? 'atual' : 'existente') : disponivel ? 'disponivel' : 'bloqueado';
                const celula = botao(!campo && disponivel ? '+' : '', () => {
                    const destino = campo ?? adicionarCampo(sistema, porPosicao.size ? 'Novo campo' : 'Campo central', x, y);
                    if (!destino) return;
                    if (!campo && jogando) camposCriados.set(destino.id, destino);
                    abrirCampo(destino);
                });
                celula.className = 'ficha-responsiva-celula';
                celula.dataset.posicao = posicao;
                celula.dataset.estado = estado;
                celula.disabled = !campo && !disponivel;
                if (campo) {
                    const nome = document.createElement('span');
                    nome.className = 'ficha-responsiva-nome-mapa';
                    nome.textContent = formatarNomeNoMapa(campo.nome);
                    celula.setAttribute('aria-label', campo.nome);
                    celula.append(nome);
                }
                if (!campo) celula.setAttribute('aria-label', disponivel
                    ? (porPosicao.size ? 'Criar campo em ' + posicao : 'Criar campo central')
                    : 'Posição bloqueada em ' + posicao);
                if (estado === 'atual') celula.setAttribute('aria-current', 'true');
                celulas.append(celula);
            }
        }
        grade.replaceChildren(celulas);
        ajustarNomesDoMapa();
        obter('total').textContent = sistema.campos.length + '/' + (2 * LIMITE_MAPA + 1) ** 2;
        obter('mapa-instrucao').textContent = porPosicao.size
            ? (!editando ? 'Selecione um campo para abrir.' : 'Escolha uma célula verde para expandir o mapa.')
            : 'Selecione a célula central verde para iniciar.';
    }

    function renderizar() {
        fecharDescricaoBloco();
        inicio.hidden = Boolean(sistema);
        mapa.hidden = !sistema || !mapaAberto;
        editor.hidden = !ativo || mapaAberto;
        obter('orbs-grupo').hidden = !sistema;
        obter('acoes').hidden = editor.hidden;
        abrirMapa.disabled = !ativo;
        abrirMapa.setAttribute('aria-pressed', String(mapaAberto));
        joystick.disabled = !ativo || mapaAberto;
        edicao.setAttribute('aria-pressed', String(editando));
        configurar.hidden = novoBloco.hidden = !editando;
        atualizarAcoesBloco();
        if (!sistema) return;
        if (mapaAberto) {
            respostas.clear();
            blocos.replaceChildren();
            renderizarMapa();
            return;
        }
        if (!ativo) return;
        mostrarTituloCampo(ativo.nome);
        atualizarAlinhamento();

        ajustarLinhas(ativo);
        respostas.clear();
        blocos.replaceChildren(...ativo.linhas.map(linha => {
            const elemento = document.createElement('div');
            elemento.className = 'ficha-responsiva-linha';
            elemento.append(...linha.blocos.map((bloco, indice) =>
                renderizarBloco(bloco, tamanhoBloco(bloco, indice, linha.blocos.length))));
            posicionarCartoes(elemento);
            return elemento;
        }));
        atualizarResultados();
    }

    function renderizarBloco(bloco, tamanho) {
        const cartao = document.createElement('article');
        cartao.dataset.blocoId = bloco.id;
        const modeloBloco = bloco.modelo ?? (bloco.titulo ? 'titulo' : 'padrao');
        cartao.classList.toggle('ficha-responsiva-bloco-simples', modeloBloco === 'padrao' &&
            bloco.tipo === 'textual' && !bloco.descricao);
        const temTitulo = modeloBloco !== 'padrao';
        const modificador = bloco.tipo === 'numerico' && bloco.modificador;
        aplicarGeometriaBloco(cartao, tamanho, temTitulo, modificador, bloco.alignBloco);
        cartao.classList.toggle('ficha-responsiva-bloco-com-titulo', temTitulo);
        const cabecalho = document.createElement('div');
        cabecalho.className = 'ficha-responsiva-bloco-topo';
        if (temTitulo) {
            const tituloDoJogador = jogando && !editando && modeloBloco === 'titulo_editavel';
            const podeEditarTitulo = editando || tituloDoJogador;
            const titulo = document.createElement(podeEditarTitulo ? 'input' : 'span');
            titulo.className = 'ficha-responsiva-titulo-bloco';
            titulo.dataset.alinhar = bloco.alignTitulo ?? 'left';
            const nome = bloco.titulo;
            titulo.style.textAlign = bloco.alignTitulo ?? 'left';
            if (podeEditarTitulo) {
                titulo.value = tituloDoJogador ? titulosBlocos[bloco.id] ?? nome : nome;
                titulo.maxLength = 120;
                titulo.setAttribute('aria-label', 'Título do bloco');
                if (editando) {
                    titulo.onchange = () => {
                        const novoTitulo = titulo.value.trim() || bloco.titulo;
                        if (tituloDuplicado(sistema, bloco, novoTitulo)) {
                            status.textContent = 'Já existe um bloco com esse título na ficha.';
                            titulo.value = bloco.titulo;
                            return;
                        }
                        bloco.titulo = novoTitulo;
                        titulo.value = bloco.titulo;
                        camposEditados.add(ativo.id);
                    };
                } else titulo.oninput = () => { titulosBlocos[bloco.id] = titulo.value; };
            } else titulo.textContent = nome;
            cabecalho.append(titulo);
        }
        if (bloco.descricao) {
            prepararDescricaoBloco(cartao, bloco);
        }
        if (editando) {
            const mover = botao('', null);
            mover.className = 'ficha-responsiva-orb ficha-responsiva-mover-bloco';
            mover.setAttribute('aria-label', 'Mover ' + (bloco.titulo || 'bloco ' + bloco.tipo));
            mover.title = 'Selecione ou arraste o bloco';
            mover.setAttribute('aria-pressed', String(blocoSelecionado === bloco));
            if (blocoSelecionado === bloco) cartao.dataset.selecionado = '';
            mover.onclick = () => selecionarBloco(bloco);
            const iconeMover = document.createElement('i');
            iconeMover.className = 'fas fa-grip-vertical';
            iconeMover.setAttribute('aria-hidden', 'true');
            mover.append(iconeMover);
            prepararMovimento(mover, bloco);
            cartao.append(mover);
        }
        if (editando || bloco.tipo === 'imagem') {
            const engrenagem = botao('⚙', () => abrirConfiguracaoBloco(bloco));
            engrenagem.className = 'ficha-responsiva-orb ficha-responsiva-configurar-bloco';
            engrenagem.setAttribute('aria-label', 'Configurar ' + (bloco.titulo || 'bloco ' + bloco.tipo));
            cartao.append(engrenagem);
        }
        cartao.append(cabecalho);

        const valor = valores[bloco.id] ?? modelo?.valoresPadrao?.[bloco.id] ?? '';
        const corpo = document.createElement('div');
        corpo.className = 'ficha-responsiva-bloco-corpo';
        cartao.append(corpo);
        if (bloco.tipo === 'imagem') {
            const quadro = document.createElement('div');
            quadro.className = 'ficha-responsiva-quadro-imagem imagem-enquadrada';
            const endereco = urlDeImagem(valor);
            if (endereco) {
                const imagem = document.createElement('img');
                imagem.alt = bloco.titulo ?? '';
                aplicarAjustes(imagem, bloco.imagemAjustes);
                imagem.src = endereco;
                quadro.append(imagem);
            }
            corpo.append(quadro);
            return cartao;
        }

        const entrada = document.createElement(bloco.tipo === 'textual' ? 'textarea' : 'input');
        if (bloco.tipo === 'numerico') {
            entrada.type = 'number';
            entrada.step = 'any';
        } else entrada.rows = 1;
        entrada.value = valor;
        entrada.setAttribute('aria-label', bloco.titulo || 'Valor do bloco ' + bloco.tipo);
        const valorPrincipal = bloco.formula && bloco.tipo === 'numerico' ? document.createElement('output') : entrada;
        if (valorPrincipal === entrada) {
            entrada.style.textAlign = bloco.alignConteudo ?? (bloco.tipo === 'numerico' ? 'center' : 'left');
        } else {
            valorPrincipal.className = 'ficha-responsiva-resultado-formula';
            valorPrincipal.setAttribute('aria-label', entrada.getAttribute('aria-label'));
        }
        corpo.append(valorPrincipal);
        atualizarModificador(bloco, corpo, entrada.value);
        if (valorPrincipal !== entrada) respostas.set(bloco.id, resultado => {
            valorPrincipal.textContent = Number.isFinite(resultado) ? String(resultado) : 'Fórmula inválida';
            atualizarModificador(bloco, corpo, resultado);
        });
        entrada.oninput = () => {
            valores[bloco.id] = entrada.value;
            if (bloco.tipo === 'numerico') {
                atualizarModificador(bloco, corpo, entrada.value);
                atualizarResultados();
            }
        };

        return cartao;
    }

    function fecharDescricaoBloco() {
        if (descricaoAberta) descricaoAberta.hidden = true;
        descricaoAberta = null;
    }

    function prepararDescricaoBloco(cartao, bloco) {
        const texto = document.createElement('p');
        texto.id = 'descricao-bloco-' + bloco.id;
        texto.className = 'ficha-responsiva-descricao';
        texto.setAttribute('role', 'tooltip');
        texto.textContent = bloco.descricao;
        texto.hidden = true;
        cartao.tabIndex = 0;
        cartao.setAttribute('aria-describedby', texto.id);
        cartao.append(texto);

        function mostrar() {
            fecharDescricaoBloco();
            descricaoAberta = texto;
            const area = rolagem.getBoundingClientRect();
            const bloco = cartao.getBoundingClientRect();
            texto.style.maxInlineSize = Math.max(0, Math.min(240, area.width - 16)) + 'px';
            texto.hidden = false;
            const caixa = texto.getBoundingClientRect();
            const esquerda = Math.max(area.left + 8, Math.min(bloco.left, area.right - caixa.width - 8));
            const acima = bloco.top - caixa.height - 6;
            const topo = acima >= area.top ? acima :
                Math.max(area.top, Math.min(bloco.bottom + 6, area.bottom - caixa.height - 8));
            texto.style.insetInlineStart = esquerda - bloco.left - cartao.clientLeft + 'px';
            texto.style.insetBlockStart = topo - bloco.top - cartao.clientTop + 'px';
        }

        function alternar() {
            if (descricaoAberta === texto) fecharDescricaoBloco();
            else mostrar();
        }

        cartao.onpointerenter = evento => {
            if (evento.pointerType === 'mouse') mostrar();
        };
        cartao.onpointerleave = evento => {
            if (evento.pointerType === 'mouse' && descricaoAberta === texto) fecharDescricaoBloco();
        };
        cartao.onclick = evento => {
            if (evento.target.closest('button, input, textarea, select, label, a[href], [contenteditable], [role="button"]')) return;
            evento.stopPropagation();
            if (evento.pointerType !== 'mouse') alternar();
            else if (descricaoAberta !== texto) mostrar();
        };
        cartao.onkeydown = evento => {
            if (evento.key === 'Escape' && descricaoAberta === texto) fecharDescricaoBloco();
            if (evento.target !== cartao || !['Enter', ' '].includes(evento.key)) return;
            evento.preventDefault();
            alternar();
        };
        cartao.onfocusout = evento => {
            if (!cartao.contains(evento.relatedTarget) && descricaoAberta === texto) fecharDescricaoBloco();
        };
    }

    pagina.onclick = evento => {
        fecharDescricaoBloco();
        if (!salvar.parentElement.contains(evento.target) && !edicao.contains(evento.target) &&
            !copiar.contains(evento.target)) fecharMenuSalvar();
    };
    rolagem.onscroll = fecharDescricaoBloco;

    function aplicarGeometriaBloco(cartao, tamanho, temTitulo, modificador, alinhamento) {
        const { colunas, linhas } = dimensoesBloco(tamanho, temTitulo, modificador);
        cartao.dataset.colunasBloco = colunas;
        cartao.dataset.linhasBloco = linhas;
        cartao.dataset.linhasCampo = tamanho.linhas;
        cartao.dataset.alinhamentoBloco = alinhamento ?? '';
        cartao.style.setProperty('--linhas-campo', tamanho.linhas);
    }

    function posicionarCartoes(linha) {
        let linhaInicial = 1;
        let grupo = [];
        let ocupadas = 0;
        function posicionarGrupo() {
            let inicio = 1;
            let restantes = ocupadas * 2;
            for (const cartao of grupo) {
                const largura = Number(cartao.dataset.colunasBloco) * 2;
                const preferencia = { center: 4 - largura / 2, right: 7 - largura };
                inicio = Math.min(7 - restantes, Math.max(inicio, preferencia[cartao.dataset.alinhamentoBloco] ?? inicio));
                cartao.style.gridColumn = inicio + ' / span ' + largura;
                cartao.style.gridRow = linhaInicial;
                inicio += largura;
                restantes -= largura;
            }
            linhaInicial++;
        }
        for (const cartao of linha.children) {
            const colunas = Number(cartao.dataset.colunasBloco);
            if (ocupadas + colunas > 3) {
                posicionarGrupo();
                grupo = [];
                ocupadas = 0;
            }
            grupo.push(cartao);
            ocupadas += colunas;
        }
        posicionarGrupo();
    }

    function obterCartaoBloco(bloco) {
        return blocos.querySelector('[data-bloco-id="' + CSS.escape(bloco.id) + '"]');
    }

    function atualizarAcoesBloco() {
        copiar.hidden = colar.hidden = excluir.hidden = !editando;
        copiar.disabled = excluir.disabled = !blocoSelecionado;
        colar.disabled = !blocoCopiado;
    }

    function selecionarBloco(bloco) {
        if (!editando || blocoSelecionado === bloco) return;
        if (blocoSelecionado) {
            const anterior = obterCartaoBloco(blocoSelecionado);
            anterior?.removeAttribute('data-selecionado');
            anterior?.querySelector('.ficha-responsiva-mover-bloco')?.setAttribute('aria-pressed', 'false');
        }
        blocoSelecionado = bloco;
        const cartao = obterCartaoBloco(bloco);
        cartao?.setAttribute('data-selecionado', '');
        cartao?.querySelector('.ficha-responsiva-mover-bloco')?.setAttribute('aria-pressed', 'true');
        atualizarAcoesBloco();
    }

    function prepararMovimento(controle, bloco) {
        let ponteiro;
        let destino;
        let quadro;
        let ponto;
        let atualizarDepoisDoGesto = false;
        function atualizarDestino() {
            destino?.elemento.removeAttribute('data-destino-bloco');
            destino = null;
            const { x, y } = ponto;
            const area = rolagem.getBoundingClientRect();
            if (x < area.left || x > area.right || y < area.top || y > area.bottom) return;
            for (const [indice, elemento] of Array.from(blocos.children).entries()) {
                const retangulo = elemento.getBoundingClientRect();
                const ultima = indice === blocos.children.length - 1;
                if (y > retangulo.bottom + 4 && !ultima) continue;
                const margem = Math.min(24, retangulo.height / 4);
                const antes = y < retangulo.top + margem;
                const depois = y > retangulo.bottom - margem;
                const linha = ativo.linhas[indice];
                if (antes || depois) {
                    destino = { elemento, linha, indice: Number(depois), novaLinha: true };
                    elemento.dataset.destinoBloco = depois ? 'depois' : 'antes';
                } else {
                    const inserirAntes = Array.from(elemento.children).findIndex(cartao => {
                        const caixa = cartao.getBoundingClientRect();
                        return x < caixa.left + caixa.width / 2;
                    });
                    const posicao = inserirAntes < 0 ? linha.blocos.length : inserirAntes;
                    const cartao = elemento.children[posicao] ?? elemento.lastElementChild;
                    const colunas = linha.blocos.reduce((total, item) => total +
                        (item === bloco ? 0 : Number(obterCartaoBloco(item).dataset.colunasBloco)), 0);
                    if (colunas + Number(obterCartaoBloco(bloco).dataset.colunasBloco) <= 3) {
                        destino = { elemento: cartao, linha, indice: posicao, novaLinha: false };
                        cartao.dataset.destinoBloco = inserirAntes < 0 ? 'direita' : 'esquerda';
                    }
                }
                break;
            }
        }

        function acompanhar() {
            if (!controle.isConnected) {
                limpar();
                return;
            }
            const { top, bottom } = rolagem.getBoundingClientRect();
            const anterior = rolagem.scrollTop;
            if (ponto.y >= top && ponto.y < top + 36) rolagem.scrollTop -= 8;
            if (ponto.y <= bottom && ponto.y > bottom - 36) rolagem.scrollTop += 8;
            if (rolagem.scrollTop !== anterior) atualizarDestino();
            quadro = requestAnimationFrame(acompanhar);
        }

        function concluir(alvo) {
            const moveu = alvo && moverBloco(ativo, bloco, alvo.linha, alvo.indice, alvo.novaLinha);
            if (moveu) camposEditados.add(ativo.id);
            if (!moveu && !atualizarDepoisDoGesto) return;
            atualizarDepoisDoGesto = false;
            renderizar();
            obterCartaoBloco(bloco)?.querySelector('.ficha-responsiva-mover-bloco')?.focus({ preventScroll: true });
        }

        function limpar() {
            cancelAnimationFrame(quadro);
            destino?.elemento.removeAttribute('data-destino-bloco');
            destino = null;
            ponteiro = undefined;
            controle.removeAttribute('data-arrastando');
        }

        controle.onpointerdown = evento => {
            if (!evento.isPrimary || evento.button !== 0) return;
            atualizarDepoisDoGesto = fecharConfiguracaoBloco();
            ponteiro = evento.pointerId;
            ponto = { x: evento.clientX, y: evento.clientY };
            controle.setPointerCapture(ponteiro);
        };
        controle.onpointermove = evento => {
            if (evento.pointerId !== ponteiro) return;
            const x = evento.clientX;
            const y = evento.clientY;
            if (!controle.hasAttribute('data-arrastando') && Math.hypot(x - ponto.x, y - ponto.y) < 6) return;
            ponto = { x, y };
            atualizarDestino();
            if (controle.hasAttribute('data-arrastando')) return;
            controle.setAttribute('data-arrastando', '');
            selecionarBloco(bloco);
            acompanhar();
        };
        controle.onpointerup = evento => {
            if (evento.pointerId !== ponteiro) return;
            if (controle.hasAttribute('data-arrastando')) {
                ponto = { x: evento.clientX, y: evento.clientY };
                atualizarDestino();
            }
            const alvo = destino;
            limpar();
            if (atualizarDepoisDoGesto) selecionarBloco(bloco);
            concluir(alvo);
        };
        controle.onlostpointercapture = () => {
            limpar();
            concluir();
        };
        controle.onkeydown = evento => {
            if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(evento.key)) return;
            evento.preventDefault();
            atualizarDepoisDoGesto = fecharConfiguracaoBloco();
            const linha = ativo.linhas.find(item => item.blocos.includes(bloco));
            const indice = linha.blocos.indexOf(bloco);
            if (evento.key === 'ArrowLeft' && indice > 0) concluir({ linha, indice: indice - 1 });
            if (evento.key === 'ArrowRight' && indice + 1 < linha.blocos.length) concluir({ linha, indice: indice + 2 });
            if (evento.key === 'ArrowUp' || evento.key === 'ArrowDown') {
                const abaixo = evento.key === 'ArrowDown';
                const vizinha = ativo.linhas[ativo.linhas.indexOf(linha) + (abaixo ? 1 : -1)];
                if (vizinha || linha.blocos.length > 1) concluir({
                    linha: vizinha ?? linha,
                    indice: Number(abaixo),
                    novaLinha: true
                });
            }
            concluir();
        };
    }

    function lerModificador() {
        if (opcoesBloco.tipo.value !== 'numerico' || !opcoesBloco.temModificador.checked) return null;
        return {
            posicao: opcoesBloco.modPosicao.value,
            forma: opcoesBloco.modForma.value,
            medio: opcoesBloco.modMedio.valueAsNumber,
            cada: opcoesBloco.modCada.valueAsNumber,
            bonus: opcoesBloco.modBonus.valueAsNumber
        };
    }

    function atualizarModificador(bloco, corpo, valor) {
        const modificador = bloco === blocoConfigurado ? lerModificador() : bloco.tipo === 'numerico' && bloco.modificador;
        let saida = corpo.querySelector('.ficha-responsiva-modificador');
        if (!modificador) {
            saida?.remove();
            delete corpo.dataset.modPosicao;
            return;
        }
        if (!saida) {
            saida = document.createElement('output');
            saida.className = 'ficha-responsiva-modificador';
            saida.setAttribute('aria-label', 'Modificador');
            corpo.append(saida);
        }
        corpo.dataset.modPosicao = modificador.posicao;
        saida.dataset.forma = modificador.forma ?? 'quadrado';
        const resultado = calcularModificador(valor, modificador);
        const texto = resultado === null ? '—' : resultado > 0 ? '+' + resultado : String(resultado);
        if (saida.textContent !== texto) saida.textContent = texto;
    }

    function atualizarPreviaModificador(bloco = blocoConfigurado) {
        if (!bloco) return;
        const corpo = obterCartaoBloco(bloco)?.querySelector('.ficha-responsiva-bloco-corpo');
        if (corpo) atualizarModificador(bloco, corpo, corpo.firstElementChild.value ?? valores[bloco.id] ?? '');
    }

    function mostrarBlocoNaFicha() {
        if (!blocoConfigurado) return;
        const cartao = obterCartaoBloco(blocoConfigurado);
        if (!cartao) return;
        rolagem.scrollTop += cartao.getBoundingClientRect().top - rolagem.getBoundingClientRect().top - 12;
    }

    inicio.onsubmit = evento => {
        evento.preventDefault();
        const dados = new FormData(inicio);
        const nome = dados.get('nome').trim();
        const endereco = capa.input.value.trim();
        const imagem = urlDeImagem(endereco);
        if (!nome || (endereco && !imagem)) {
            status.textContent = 'Informe um nome e use HTTP ou HTTPS para a imagem de capa.';
            return;
        }
        sistema = criarSistema(nome, dados.get('descricao').trim(), imagem);
        sistema.imagemAjustes = capa.obterAjustes();
        mapaAberto = true;
        status.textContent = '';
        renderizar();
        grade.querySelector('button:not(:disabled)')?.focus();
    };
    abrirMapa.onclick = () => {
        if (mapaAberto) return abrirCampo(ativo);
        mapaAberto = true;
        fecharFerramentas();
        renderizar();
        const celulaAtual = grade.querySelector('[aria-current="true"]');
        celulaAtual?.scrollIntoView({ block: 'nearest', inline: 'center' });
        celulaAtual?.focus({ preventScroll: true });
    };
    joystick.onpointerdown = evento => {
        if (evento.button !== 0 || gesto) return;
        arrastou = false;
        gesto = { id: evento.pointerId, x: evento.clientX, y: evento.clientY };
        joystick.setPointerCapture(evento.pointerId);
    };
    joystick.onlostpointercapture = () => { gesto = null; };
    joystick.onpointerup = evento => {
        if (gesto?.id !== evento.pointerId) return;
        const x = evento.clientX - gesto.x;
        const y = evento.clientY - gesto.y;
        gesto = null;
        if (Math.max(Math.abs(x), Math.abs(y)) < 16) return;
        arrastou = true;
        const direcao = Math.abs(x) > Math.abs(y)
            ? { x: Math.sign(x), y: 0 }
            : { x: 0, y: Math.sign(y) };
        navegarDirecao(DIRECOES.find(item => item.x === direcao.x && item.y === direcao.y));
    };
    joystick.onkeydown = evento => {
        const indice = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(evento.key);
        if (indice < 0) return;
        evento.preventDefault();
        navegarDirecao(DIRECOES[indice]);
    };
    joystick.onclick = evento => {
        if (arrastou && evento.detail > 0) return;
        if (!alternarPainel(joystick, direcoes)) return;
        direcoes.replaceChildren(...DIRECOES.map(direcao => {
            const controle = botao(direcao.nome, () => navegarDirecao(direcao));
            controle.disabled = !destinoDirecional(direcao);
            return controle;
        }));
    };
    edicao.onclick = () => {
        if (criando) return;
        editando = !editando;
        fecharFerramentas({ preservarMenuSalvar: true });
        renderizar();
    };
    configurar.onclick = () => {
        if (!nomeCampo.hidden) nomeCampo.blur();
        alternarPainel(configurar, config);
    };
    const opcoesDeAlinhamento = [
        ['left', 'Esquerda'], ['center', 'Centro'], ['right', 'Direita']
    ];
    const gruposAlinhamento = formularioBloco.querySelectorAll('[data-alinhamento-bloco]');
    for (const grupo of gruposAlinhamento) {
        const entrada = document.createElement('input');
        entrada.type = 'hidden';
        entrada.name = grupo.dataset.alinhamentoBloco;
        const controles = document.createDocumentFragment();
        controles.append(entrada);
        for (const [posicao, nome] of opcoesDeAlinhamento) {
            const opcao = botao('', () => {
                entrada.value = posicao;
                atualizarMarcacaoAlinhamento();
                atualizarPreviaTitulo();
                if (entrada.name === 'alignBloco') atualizarPreviaGeometria();
                salvarConfiguracaoBloco();
            });
            opcao.dataset.alinhar = posicao;
            opcao.setAttribute('aria-label', nome);
            opcao.title = nome;
            const icone = document.createElement('i');
            icone.className = 'fas fa-align-' + posicao;
            icone.setAttribute('aria-hidden', 'true');
            opcao.append(icone);
            controles.append(opcao);
        }
        grupo.replaceChildren(controles);
    }

    function atualizarMarcacaoAlinhamento() {
        for (const grupo of gruposAlinhamento) {
            const posicao = opcoesBloco.namedItem(grupo.dataset.alinhamentoBloco).value;
            for (const opcao of grupo.querySelectorAll('[data-alinhar]')) {
                opcao.setAttribute('aria-pressed', String(opcao.dataset.alinhar === posicao));
            }
        }
    }

    const celulasTamanho = document.createDocumentFragment();
    for (let linhas = 1; linhas <= 3; linhas++) {
        for (let colunas = 1; colunas <= 3; colunas++) {
            const celula = botao('', () => {
                selecionarTamanho({ colunas, linhas });
                salvarConfiguracaoBloco();
            });
            celula.className = 'ficha-responsiva-celula-tamanho';
            celula.dataset.colunas = colunas;
            celula.dataset.linhas = linhas;
            celula.setAttribute('aria-label', colunas + ' × ' + linhas);
            celulasTamanho.append(celula);
        }
    }
    gradeTamanho.replaceChildren(celulasTamanho);

    function selecionarTamanho(tamanho) {
        const lateral = modificadorLateral(lerModificador());
        const { linhas } = tamanho;
        const colunas = lateral ? Math.max(2, tamanho.colunas) : tamanho.colunas;
        tamanhoSelecionado = { colunas, linhas };
        for (const celula of gradeTamanho.children) {
            celula.disabled = lateral && Number(celula.dataset.colunas) === 1;
            const preenchida = Number(celula.dataset.colunas) <= colunas && Number(celula.dataset.linhas) <= linhas;
            celula.classList.toggle('preenchida', preenchida);
            celula.setAttribute('aria-pressed', String(Number(celula.dataset.colunas) === colunas &&
                Number(celula.dataset.linhas) === linhas));
        }
        resumoTamanho.textContent = colunas + (colunas === 1 ? ' coluna' : ' colunas') +
            ' × ' + linhas + (linhas === 1 ? ' linha' : ' linhas');
        atualizarPreviaGeometria();
    }

    function atualizarPreviaGeometria() {
        if (!blocoConfigurado || !tamanhoSelecionado) return;
        const cartao = obterCartaoBloco(blocoConfigurado);
        if (!cartao) return;
        const temTitulo = opcoesBloco.modelo.value !== 'padrao';
        aplicarGeometriaBloco(cartao, tamanhoSelecionado, temTitulo, lerModificador(), opcoesBloco.alignBloco.value);
        cartao.classList.toggle('ficha-responsiva-bloco-com-titulo', temTitulo);
        posicionarCartoes(cartao.parentElement);
    }

    function atualizarConfiguracaoBloco() {
        const numerico = opcoesBloco.tipo.value === 'numerico';
        const temAlinhamento = numerico || opcoesBloco.tipo.value === 'textual';
        const temTitulo = opcoesBloco.modelo.value !== 'padrao';
        obter('bloco-titulo-opcoes').hidden = !temTitulo;
        const visibilidade = {
            titulo: temTitulo,
            'alinhamento-titulo': temAlinhamento && temTitulo,
            'alinhamento-conteudo': temAlinhamento,
            numerico,
            automatizacao: numerico,
            imagem: opcoesBloco.tipo.value === 'imagem'
        };
        for (const [grupo, visivel] of Object.entries(visibilidade)) {
            formularioBloco.querySelector('[data-config="' + grupo + '"]').hidden = !visivel;
        }
        for (const secao of secoesBloco) {
            const ativa = secao.controle.checked && (secao.id === 'descricao' || numerico);
            secao.painel.hidden = !ativa || !secoesAbertasPorBloco.get(blocoConfigurado)?.has(secao.id);
            secao.botao.setAttribute('aria-expanded', String(!secao.painel.hidden));
            secao.painel.disabled = !ativa;
        }
        opcoesBloco.titulo.required = temTitulo;
        opcoesBloco.descricao.required = opcoesBloco.temDescricao.checked;
        atualizarMarcacaoAlinhamento();
        atualizarPreviaTitulo();
        atualizarPreviaModificador();
        selecionarTamanho(tamanhoSelecionado);
    }

    function fecharConfiguracaoBloco() {
        restaurarTitulo();
        if (blocoConfigurado) {
            const cartao = obterCartaoBloco(blocoConfigurado);
            const linha = ativo.linhas.find(item => item.blocos.includes(blocoConfigurado));
            if (cartao && linha) {
                const indice = linha.blocos.indexOf(blocoConfigurado);
                const modelo = blocoConfigurado.modelo ?? (blocoConfigurado.titulo ? 'titulo' : 'padrao');
                const temTitulo = modelo !== 'padrao';
                const modificador = blocoConfigurado.tipo === 'numerico' && blocoConfigurado.modificador;
                const tamanho = tamanhoBloco(blocoConfigurado, indice, linha.blocos.length);
                aplicarGeometriaBloco(cartao, tamanho, temTitulo, modificador, blocoConfigurado.alignBloco);
                cartao.classList.toggle('ficha-responsiva-bloco-com-titulo', temTitulo);
                posicionarCartoes(cartao.parentElement);
            }
        }
        const bloco = blocoConfigurado;
        blocoConfigurado = null;
        atualizarPreviaModificador(bloco);
        formularioBloco.hidden = true;
        const alterada = configuracaoAlterada;
        configuracaoAlterada = false;
        configuracaoOriginal = undefined;
        if (alterada) gravarConfiguracaoBloco();
        return alterada;
    }

    function restaurarTitulo() {
        previaTitulo?.remove();
        if (tituloOriginal) tituloOriginal.hidden = false;
        previaTitulo = tituloOriginal = null;
    }

    function atualizarPreviaTitulo() {
        if (!blocoConfigurado) {
            restaurarTitulo();
            return;
        }
        if (opcoesBloco.modelo.value === 'padrao') {
            restaurarTitulo();
            tituloOriginal = obterCartaoBloco(blocoConfigurado)?.querySelector('.ficha-responsiva-titulo-bloco');
            if (tituloOriginal) tituloOriginal.hidden = true;
            return;
        }
        if (!previaTitulo) {
            const cabecalho = obterCartaoBloco(blocoConfigurado)?.querySelector('.ficha-responsiva-bloco-topo');
            if (!cabecalho) return;
            tituloOriginal = cabecalho.querySelector('.ficha-responsiva-titulo-bloco');
            if (tituloOriginal) tituloOriginal.hidden = true;
            previaTitulo = document.createElement('span');
            previaTitulo.className = 'ficha-responsiva-previa-titulo';
            cabecalho.prepend(previaTitulo);
        }
        previaTitulo.textContent = opcoesBloco.titulo.value.trim() || 'Título do bloco';
        previaTitulo.style.textAlign = opcoesBloco.alignTitulo.value;
        previaTitulo.dataset.alinhar = opcoesBloco.alignTitulo.value;
    }

    function abrirConfiguracaoBloco(bloco) {
        if (!editando && bloco.tipo !== 'imagem') return;
        if (fecharConfiguracaoBloco()) renderizar();
        blocoConfigurado = bloco;
        configuracaoOriginal = structuredClone(bloco);
        valorOriginalBloco = valores[bloco.id];
        formularioBloco.reset();
        formularioBloco.classList.toggle('somente-imagem', !editando);
        editorImagemBloco = criarEditorImagem({
            rotulo: 'URL da imagem',
            descricaoPrevia: 'Prévia da imagem do bloco',
            endereco: bloco.tipo === 'imagem' ? valores[bloco.id] ?? modelo?.valoresPadrao?.[bloco.id] ?? '' : '',
            enquadramento: bloco.imagemAjustes,
            aoAlterar: () => salvarConfiguracaoBloco()
        });
        obter('imagem-bloco').replaceChildren(editorImagemBloco.elemento);
        opcoesBloco.tipo.value = bloco?.tipo ?? 'textual';
        opcoesBloco.modelo.value = bloco?.modelo ?? (bloco?.titulo ? 'titulo' : 'padrao');
        opcoesBloco.titulo.value = bloco?.titulo ?? '';
        opcoesBloco.temDescricao.checked = Boolean(bloco?.descricao);
        opcoesBloco.descricao.value = bloco?.descricao ?? '';
        opcoesBloco.alignTitulo.value = bloco?.alignTitulo ?? 'left';
        opcoesBloco.alignConteudo.value = bloco.alignConteudo ?? (bloco.tipo === 'numerico' ? 'center' : 'left');
        opcoesBloco.alignBloco.value = bloco.alignBloco ?? '';
        if (bloco?.modificador) {
            const { posicao, forma, medio, cada, bonus } = bloco.modificador;
            opcoesBloco.temModificador.checked = true;
            opcoesBloco.modPosicao.value = posicao;
            opcoesBloco.modForma.value = forma ?? 'quadrado';
            opcoesBloco.modMedio.value = medio;
            opcoesBloco.modCada.value = cada;
            opcoesBloco.modBonus.value = bonus;
        }
        opcoesBloco.temFormula.checked = Boolean(bloco.formula);
        editorFormula.abrir(bloco);
        if (!secoesAbertasPorBloco.has(bloco)) secoesAbertasPorBloco.set(bloco, new Set());
        erroBloco.hidden = true;
        const linha = ativo.linhas.find(linha => linha.blocos.includes(bloco)).blocos;
        selecionarTamanho(tamanhoBloco(bloco, linha.indexOf(bloco), linha.length));
        atualizarConfiguracaoBloco();
        formularioBloco.hidden = false;
        const tituloPainel = formularioBloco.querySelector('h2');
        tituloPainel.textContent = editando ? 'Configuração do bloco' : 'Imagem do bloco';
        const foco = editando ? opcoesBloco.tipo : tituloPainel;
        foco.focus({ preventScroll: true });
        mostrarBlocoNaFicha();
    }

    for (const secao of secoesBloco) {
        secao.botao.onclick = () => {
            if (!blocoConfigurado || !secao.controle.checked) return;
            const abertas = secoesAbertasPorBloco.get(blocoConfigurado);
            if (abertas.has(secao.id)) abertas.delete(secao.id);
            else abertas.add(secao.id);
            atualizarConfiguracaoBloco();
        };
    }
    formularioBloco.onchange = evento => {
        const secao = secoesBloco.find(item => item.controle === evento.target);
        if (secao?.controle.checked && blocoConfigurado) secoesAbertasPorBloco.get(blocoConfigurado).add(secao.id);
        atualizarConfiguracaoBloco();
        salvarConfiguracaoBloco();
    };
    formularioBloco.oninput = evento => {
        if (evento.target.name && evento.target.type !== 'checkbox' && evento.target.tagName !== 'SELECT') {
            salvarConfiguracaoBloco();
        }
    };
    formularioBloco.querySelector('[data-config="modificador"]').oninput = () => atualizarPreviaModificador();
    opcoesBloco.titulo.oninput = atualizarPreviaTitulo;
    novoBloco.onclick = () => {
        if (!editando || !ativo || mapaAberto) return;
        fecharConfiguracaoBloco();
        adicionarBloco(ativo);
        camposEditados.add(ativo.id);
        renderizar();
        blocos.lastElementChild?.scrollIntoView({ block: 'nearest' });
    };
    copiar.onclick = () => {
        if (!editando || !blocoSelecionado) return;
        const { id } = blocoSelecionado;
        blocoCopiado = {
            bloco: structuredClone(blocoSelecionado),
            valor: valores[id] ?? modelo?.valoresPadrao?.[id]
        };
        atualizarAcoesBloco();
        mostrarStatusTemporario('Bloco copiado.');
    };
    colar.onclick = () => {
        if (!editando || !ativo || mapaAberto || !blocoCopiado) return;
        fecharConfiguracaoBloco();
        const bloco = colarBloco(sistema, ativo, blocoCopiado.bloco);
        if (blocoCopiado.valor !== undefined) valores[bloco.id] = blocoCopiado.valor;
        blocoSelecionado = bloco;
        camposEditados.add(ativo.id);
        renderizar();
        obterCartaoBloco(bloco)?.scrollIntoView({ block: 'nearest' });
    };
    excluir.onclick = async () => {
        const bloco = blocoSelecionado;
        const campo = ativo;
        const linha = campo?.linhas.find(item => item.blocos.includes(bloco));
        if (!editando || !bloco || !linha) return;
        if (blocoEmFormula(bloco)) {
            mostrarStatusTemporario('Remova as referências a este bloco das fórmulas antes de excluí-lo.');
            return;
        }
        const nome = bloco.titulo || 'bloco sem título';
        if (!(await confirmarAcao('Excluir "' + nome + '"?', { confirmar: 'Excluir', perigo: true })) ||
            !pagina.isConnected || window.location.hash !== rota) return;
        fecharConfiguracaoBloco();
        linha.blocos.splice(linha.blocos.indexOf(bloco), 1);
        if (!linha.blocos.length) campo.linhas.splice(campo.linhas.indexOf(linha), 1);
        delete valores[bloco.id];
        delete titulosBlocos[bloco.id];
        blocoSelecionado = undefined;
        camposEditados.add(campo.id);
        renderizar();
        novoBloco.focus({ preventScroll: true });
    };
    obter('cancelar-bloco').onclick = () => {
        const id = blocoConfigurado?.id;
        if (configuracaoAlterada) {
            for (const chave of Object.keys(blocoConfigurado)) delete blocoConfigurado[chave];
            Object.assign(blocoConfigurado, configuracaoOriginal);
            if (valorOriginalBloco === undefined) delete valores[id];
            else valores[id] = valorOriginalBloco;
            agendarGravacaoBloco();
        }
        if (fecharConfiguracaoBloco()) renderizar();
        blocos.querySelector('[data-bloco-id="' + CSS.escape(id ?? '') + '"] .ficha-responsiva-configurar-bloco')?.focus();
    };
    editarTitulo.onclick = () => {
        if (!editando) return;
        nomeCampo.hidden = false;
        nomeCampo.value = limitarLinhasTitulo(ativo.nome, nomeCampo.rows);
        ajustarFonteTitulo(nomeCampo, nomeCampo.value);
        nomeCampo.focus();
        nomeCampo.select();
    };
    nomeCampo.oninput = () => {
        const texto = limitarLinhasTitulo(nomeCampo.value, nomeCampo.rows);
        if (texto !== nomeCampo.value) {
            const cursor = nomeCampo.selectionStart;
            nomeCampo.value = texto;
            nomeCampo.setSelectionRange(cursor, cursor);
        }
        ajustarFonteTitulo(nomeCampo, texto);
        mostrarTituloCampo(texto);
    };
    nomeCampo.onbeforeinput = evento => {
        if (!['insertLineBreak', 'insertParagraph'].includes(evento.inputType)) return;
        const restantes = nomeCampo.value.slice(0, nomeCampo.selectionStart) +
            nomeCampo.value.slice(nomeCampo.selectionEnd);
        if (restantes.split('\n').length >= nomeCampo.rows) evento.preventDefault();
    };
    nomeCampo.onblur = () => {
        if (nomeCampo.hidden) return;
        const nome = nomeCampo.value.trim();
        if (nome && nome !== ativo.nome) {
            ativo.nome = nome;
            camposEditados.add(ativo.id);
        }
        mostrarTituloCampo(ativo.nome);
        nomeCampo.hidden = true;
    };
    nomeCampo.onkeydown = evento => {
        if (evento.isComposing) return;
        if (evento.key === 'Escape') nomeCampo.value = ativo.nome;
        if (evento.key !== 'Escape' && !(evento.key === 'Enter' && nomeCampo.rows === 1)) return;
        evento.preventDefault();
        editarTitulo.focus();
    };

    function ajustarFonteTitulo(elemento, texto) {
        elemento.style.fontSize = '';
        const estilo = getComputedStyle(elemento);
        const largura = elemento.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
        if (!medidorTitulo || largura <= 1) return;
        const tamanho = parseFloat(estilo.fontSize);
        medidorTitulo.font = [estilo.fontStyle, estilo.fontWeight, estilo.fontSize, estilo.fontFamily].join(' ');
        const maiorLinha = Math.max(...texto.toLocaleUpperCase('pt-BR').split('\n')
            .map(linha => medidorTitulo.measureText(linha).width));
        if (maiorLinha > largura - 1) elemento.style.fontSize = tamanho * (largura - 1) / maiorLinha + 'px';
    }

    function ajustarNomesDoMapa() {
        for (const nome of grade.querySelectorAll('.ficha-responsiva-nome-mapa')) {
            ajustarFonteTitulo(nome, nome.textContent);
        }
    }

    function mostrarTituloCampo(texto) {
        const limite = ativo.linhasTitulo ?? 1;
        for (const opcao of linhasTitulo.children) {
            opcao.setAttribute('aria-pressed', String(Number(opcao.dataset.linhas) === limite));
        }
        nomeCampo.rows = limite;
        tituloCampo.textContent = limitarLinhasTitulo(texto, limite);
        ajustarFonteTitulo(tituloCampo, tituloCampo.textContent);
    }

    linhasTitulo.onclick = evento => {
        const opcao = evento.target.closest('button[data-linhas]');
        if (!opcao || !editando || Number(opcao.dataset.linhas) === (ativo.linhasTitulo ?? 1)) return;
        ativo.linhasTitulo = Number(opcao.dataset.linhas);
        ativo.nome = limitarLinhasTitulo(ativo.nome, ativo.linhasTitulo);
        camposEditados.add(ativo.id);
        mostrarTituloCampo(ativo.nome);
    };

    function atualizarAlinhamento() {
        const posicao = ativo.alinhamentoTitulo ?? 'center';
        tituloCampo.style.textAlign = posicao;
        nomeCampo.style.textAlign = posicao;
        for (const opcao of alinhamento.querySelectorAll('[data-alinhar]')) {
            opcao.setAttribute('aria-pressed', String(opcao.dataset.alinhar === posicao));
        }
    }

    alinhamento.onclick = evento => {
        const opcao = evento.target.closest('[data-alinhar]');
        if (!opcao || !editando) return;
        ativo.alinhamentoTitulo = opcao.dataset.alinhar;
        camposEditados.add(ativo.id);
        atualizarAlinhamento();
    };
    function blocoEmFormula(bloco) {
        return blocosNumericos(sistema).some(({ bloco: item }) => item !== bloco &&
            termosDaFormula(item.formula).some((termo, indice) => indice % 2 === 0 && termo === bloco.id));
    }

    function salvarConfiguracaoBloco(confirmando = false) {
        if (!blocoConfigurado || (!editando && blocoConfigurado.tipo !== 'imagem')) return false;
        const dados = new FormData(formularioBloco);
        const tipo = dados.get('tipo');
        const modelo = dados.get('modelo');
        const titulo = modelo === 'padrao' ? '' : dados.get('titulo').trim();
        const descricao = dados.has('temDescricao') ? dados.get('descricao').trim() : '';
        const bloco = blocoConfigurado;
        erroBloco.hidden = true;
        function rejeitar(mensagem) {
            if (confirmando) {
                erroBloco.textContent = mensagem;
                erroBloco.hidden = false;
                erroBloco.scrollIntoView({ block: 'nearest' });
            }
            return false;
        }
        const enderecoImagem = tipo === 'imagem' ? editorImagemBloco.input.value.trim() : '';
        const imagemUrl = urlDeImagem(enderecoImagem);
        if (enderecoImagem && !imagemUrl) return rejeitar('Use um endereço de imagem com HTTP ou HTTPS.');
        const valorAlterado = tipo === 'imagem' && imagemUrl !== (valores[bloco.id] ?? modelo?.valoresPadrao?.[bloco.id] ?? '');
        const imagemAjustes = tipo === 'imagem' ? editorImagemBloco.obterAjustes() : undefined;
        if (!editando) {
            registrarConfiguracaoBloco(bloco, { ...bloco, imagemAjustes }, valorAlterado, imagemUrl);
            return true;
        }
        if (modelo !== 'padrao' && !titulo) return rejeitar('Informe o título do bloco.');
        if (dados.has('temDescricao') && !descricao) return rejeitar('Informe a descrição do bloco.');
        if (tituloDuplicado(sistema, bloco, titulo)) return rejeitar('Já existe um bloco com esse título na ficha.');
        if (bloco.tipo === 'numerico' && tipo !== 'numerico' && blocoEmFormula(bloco)) {
            return rejeitar('Este bloco é usado em uma fórmula. Remova a referência antes de mudar seu tipo.');
        }
        const modificador = lerModificador();
        if (modificador && (!Number.isFinite(modificador.medio) || !Number.isInteger(modificador.cada) ||
            modificador.cada < 1 || !Number.isFinite(modificador.bonus) || modificador.bonus < 0)) {
            return rejeitar('Preencha o valor médio, o intervalo e o bônus do modificador.');
        }
        const automatizado = tipo === 'numerico' && opcoesBloco.temFormula.checked;
        const formula = automatizado && editorFormula.ler();
        if (automatizado && !formula) return rejeitar('Complete a fórmula com blocos numéricos distintos e sem referências circulares.');
        const atualizado = { ...bloco,
            tipo, modelo, titulo, descricao, tamanho: tamanhoSelecionado,
            alignBloco: dados.get('alignBloco') || undefined,
            alignTitulo: (tipo === 'textual' || tipo === 'numerico') && modelo !== 'padrao' ? dados.get('alignTitulo') : undefined,
            alignConteudo: tipo === 'textual' || tipo === 'numerico' ? dados.get('alignConteudo') : undefined,
            modificador: modificador || undefined,
            formula: formula || undefined,
            imagemAjustes
        };
        registrarConfiguracaoBloco(bloco, atualizado, valorAlterado, imagemUrl);
        return true;
    }

    function registrarConfiguracaoBloco(bloco, atualizado, valorAlterado, imagemUrl) {
        if (valorAlterado || JSON.stringify(bloco) !== JSON.stringify(atualizado)) {
            if (valorAlterado) valores[bloco.id] = imagemUrl;
            Object.assign(bloco, atualizado);
            camposEditados.add(ativo.id);
            configuracaoAlterada = true;
            agendarGravacaoBloco();
        }
    }

    formularioBloco.onsubmit = evento => {
        evento.preventDefault();
        if (!salvarConfiguracaoBloco(true)) return;
        const bloco = blocoConfigurado;
        fecharConfiguracaoBloco();
        renderizar();
        obterCartaoBloco(bloco)?.querySelector('.ficha-responsiva-configurar-bloco')?.focus();
    };
    function agendarGravacaoBloco() {
        if (!modelo && !jogando) return;
        clearTimeout(gravacaoBloco);
        gravacaoBloco = setTimeout(gravarConfiguracaoBloco, 250);
    }

    function gravarConfiguracaoBloco() {
        if (gravacaoBloco === undefined) return;
        clearTimeout(gravacaoBloco);
        gravacaoBloco = undefined;
        if (pagina.isConnected) void gravar(false, true);
    }

    async function gravar(concluir, silencioso = false) {
        if (salvando) return;
        if (!silencioso) {
            if (!nomeCampo.hidden) nomeCampo.blur();
            if (document.activeElement?.matches('.ficha-responsiva-titulo-bloco')) document.activeElement.blur();
        }
        salvando = true;
        salvar.disabled = finalizar.disabled = true;
        try {
            if (jogando) {
                const atual = lerLista(FICHAS).find(item => item.id === ficha.id);
                if (!atual) throw new Error('Personagem não encontrado.');
                salvarRegistro(FICHAS, montarRegistroPersonagem(atual));
            } else {
                const atual = modelo && lerLista(SISTEMAS).find(item => item.id === modelo.id);
                if (modelo && !atual) throw new Error('Modelo não encontrado.');
                const imagemCapa = atual?.imagemCapa ?? sistema.imagemCapa;
                const imagemAjustes = atual?.imagemAjustes ?? sistema.imagemAjustes;
                const registro = {
                    ...atual,
                    id: modelo?.id ?? 'sist_' + sistema.campos[0].id,
                    criadoEm: atual?.criadoEm ?? Date.now(),
                    nome: atual?.nome ?? sistema.nome,
                    descricao: atual?.descricao ?? sistema.descricao,
                    imagemCapa, imagemAjustes,
                    layout: { ...sistema, imagemCapa, imagemAjustes },
                    valoresPadrao: valores
                };
                if (!modelo) await validarNomeNaConta(SISTEMAS, registro);
                if ((!silencioso && window.location.hash !== rota) || !pagina.isConnected) return;
                salvarRegistro(SISTEMAS, registro);
                modelo = registro;
                if (concluir) {
                    window.location.hash = '#/ficha/personagens?' + new URLSearchParams({ id: modelo.id });
                    return;
                }
            }
            if (!silencioso) mostrarStatusTemporario(jogando ? 'Personagem salvo.' : 'Modelo salvo.');
        } catch (erro) {
            status.textContent = erro.message || 'Não foi possível salvar.';
        } finally {
            salvando = false;
            salvar.disabled = finalizar.disabled = false;
        }
    }
    function montarRegistroPersonagem(registro) {
        const ajustes = Object.fromEntries(sistema.campos
            .filter(campo => camposEditados.has(campo.id) && !camposCriados.has(campo.id))
            .map(({ id, nome, alinhamentoTitulo, linhasTitulo, linhas }) => [
                id, { nome, alinhamentoTitulo, linhasTitulo: linhasTitulo ?? 1, linhas }
            ]));
        return {
            ...registro, valores, titulosBlocos, camposEditados: ajustes,
            camposCriados: [...camposCriados.values()]
        };
    }

    salvar.onclick = () => alternarPainel(salvar, menuSalvar);
    obter('gravar').onclick = () => gravar(false);
    obter('exportar-json').onclick = () => {
        fecharMenuSalvar();
        salvar.focus();
        try {
            if (jogando) {
                const atual = lerLista(FICHAS).find(item => item.id === ficha.id) ?? ficha;
                baixarJson(atual.nomePersonagem, exportarFicha(montarRegistroPersonagem(atual), modelo));
            } else {
                const atual = lerLista(SISTEMAS).find(item => item.id === modelo.id) ?? modelo;
                baixarJson(atual.nome, exportarModelo({ ...atual, layout: sistema }));
            }
        } catch (erro) {
            void mostrarAviso(erro.message);
        }
    };
    obter('importar-json').onclick = () => {
        fecharMenuSalvar();
        salvar.focus();
        arquivoJson.click();
    };
    menuSalvar.onkeydown = evento => {
        if (evento.key !== 'Escape') return;
        evento.preventDefault();
        fecharMenuSalvar();
        salvar.focus();
    };
    arquivoJson.onchange = async () => {
        const arquivo = arquivoJson.files[0];
        arquivoJson.value = '';
        if (!arquivo) return;
        const continua = () => pagina.isConnected && window.location.hash === rota;
        try {
            const dados = await lerArquivoJson(arquivo);
            if (!continua()) return;
            if (jogando) {
                const fichaImportada = await adicionarFichaJson(dados, modelo, continua);
                if (!fichaImportada) return;
                if (fichaImportada.id === ficha.id) {
                    clearTimeout(gravacaoBloco);
                    gravacaoBloco = undefined;
                    window.location.reload();
                }
                else window.location.hash = '#/ficha/ficha-nova?' + new URLSearchParams({ id: fichaImportada.id });
            } else {
                const modeloImportado = adicionarModeloJson(dados);
                window.location.hash = '#/ficha/modelo?' + new URLSearchParams({ id: modeloImportado.id });
            }
        } catch (erro) {
            if (continua()) void mostrarAviso(erro.message);
        }
    };
    finalizar.onclick = () => gravar(true);
    fecharConfiguracaoBloco();
    renderizar();
    desmontarPagina();
    window.addEventListener('pagehide', gravarConfiguracaoBloco);
    encerrarGravacaoBloco = () => {
        window.removeEventListener('pagehide', gravarConfiguracaoBloco);
        gravarConfiguracaoBloco();
    };
    const largurasObservadas = new Map();
    observadorTitulo = new ResizeObserver(entradas => {
        for (const { target, contentRect: { width } } of entradas) {
            if (width === largurasObservadas.get(target)) continue;
            largurasObservadas.set(target, width);
            if (target === grade) ajustarNomesDoMapa();
            else {
                ajustarFonteTitulo(tituloCampo, tituloCampo.textContent);
                if (!nomeCampo.hidden) ajustarFonteTitulo(nomeCampo, nomeCampo.value);
            }
        }
    });
    observadorTitulo.observe(tituloCampo);
    observadorTitulo.observe(grade);
    document.fonts.ready.then(() => {
        if (!pagina.isConnected) return;
        ajustarFonteTitulo(tituloCampo, tituloCampo.textContent);
        if (!nomeCampo.hidden) ajustarFonteTitulo(nomeCampo, nomeCampo.value);
        ajustarNomesDoMapa();
    });
}
