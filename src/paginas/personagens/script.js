import { abrirDialogo, confirmarAcao, mostrarAviso } from '../../componentes/dialogos/dialogos.js';
import { aplicarAjustes, criarEditorImagem, urlDeImagem } from '../../componentes/imagem/ajustes.js';
import { armazenamentoBiblioteca, prepararBiblioteca, validarNomeNaConta } from '../../servicos/armazenamento/biblioteca.js';
import { adicionarFichaJson, adicionarModeloJson } from '../ficha-responsiva/biblioteca-json.js';
import { baixarJson, exportarModelo, lerArquivoJson } from '../ficha-responsiva/portabilidade.js';

const chaveSistemas = 'codex_sistemas';
const chaveFichas = 'codex_fichas_jogador';

function lerLista(chave) {
    return JSON.parse(armazenamentoBiblioteca.getItem(chave) || '[]');
}

function salvarLista(chave, lista) {
    armazenamentoBiblioteca.setItem(chave, JSON.stringify(lista));
}

export async function montarPagina(container) {
    const rota = window.location.hash;
    await prepararBiblioteca();
    if (window.location.hash !== rota || !container.isConnected) return;
    const idSistema = new URLSearchParams(rota.split('?')[1]).get('id');
    const sistema = lerLista(chaveSistemas).find(item => item.id === idSistema);
    if (!sistema) {
        await mostrarAviso(idSistema ? 'Sistema não encontrado.' : 'Nenhum sistema selecionado.');
        if (window.location.hash === rota) window.location.hash = '#/ficha';
        return;
    }

    const pagina = container.querySelector('#pagina-personagens');
    configurarDetalhe(pagina, idSistema, 'nome', '#titulo-sistema-personagens', '#btn-editar-titulo-sistema');
    configurarDetalhe(pagina, idSistema, 'descricao', '#descricao-sistema-personagens', '#btn-editar-descricao-sistema');
    configurarCapa(pagina, sistema);
    configurarArquivos(pagina, idSistema, rota);
    renderizarListaPersonagens(pagina, idSistema);

    pagina.querySelector('#btn-voltar-sistemas').onclick = () => { window.location.hash = '#/ficha'; };
    pagina.querySelector('#btn-novo-personagem').onclick = async () => {
        const dados = await editarPersonagem();
        if (!dados || window.location.hash !== rota) return;
        if (!(await conferirNome(chaveFichas, { ...dados, sistemaId: idSistema })) ||
            window.location.hash !== rota) return;
        const modelo = lerLista(chaveSistemas).find(item => item.id === idSistema);
        if (modelo?.layout?.schemaVersion !== 2) return mostrarAviso('Crie um modelo no novo editor para adicionar personagens.');
        const novaFicha = {
            id: 'ficha_' + Date.now() + Math.random().toString(36).slice(2, 6),
            sistemaId: idSistema,
            criadoEm: Date.now(),
            valores: {},
            ...dados
        };
        salvarLista(chaveFichas, [...lerLista(chaveFichas), novaFicha]);
        abrirFicha(novaFicha.id);
    };
}

function configurarArquivos(pagina, idSistema, rota) {
    const input = pagina.querySelector('.sistema-arquivo-json');
    const sistemaAtual = () => lerLista(chaveSistemas).find(item => item.id === idSistema);
    const continua = () => pagina.isConnected && window.location.hash === rota;
    pagina.querySelector('.sistema-exportar').onclick = () => {
        try {
            const sistema = sistemaAtual();
            baixarJson(sistema.nome, exportarModelo(sistema));
        } catch (erro) {
            void mostrarAviso(erro.message);
        }
    };
    pagina.querySelector('.sistema-importar').onclick = () => input.click();
    input.onchange = async () => {
        const arquivo = input.files[0];
        input.value = '';
        if (!arquivo) return;
        try {
            const dados = await lerArquivoJson(arquivo);
            if (!continua()) return;
            if (dados?.formato === 'codex-personagem') {
                const ficha = await adicionarFichaJson(dados, sistemaAtual(), continua);
                if (ficha) abrirFicha(ficha.id);
            } else {
                const modelo = adicionarModeloJson(dados);
                window.location.hash = '#/ficha/personagens?' + new URLSearchParams({ id: modelo.id });
            }
        } catch (erro) {
            if (continua()) void mostrarAviso(erro.message);
        }
    };
}

function configurarCapa(pagina, sistema) {
    const botao = pagina.querySelector('.sistema-capa');
    const imagem = botao.querySelector('img');
    const icone = botao.querySelector('i');
    function mostrarCapa(registro) {
        const endereco = urlDeImagem(registro.imagemCapa);
        aplicarAjustes(imagem, registro.imagemAjustes ?? registro.layout?.imagemAjustes);
        if (endereco && imagem.getAttribute('src') === endereco) return;
        imagem.hidden = true;
        icone.hidden = false;
        if (endereco) {
            imagem.onload = () => {
                if (imagem.getAttribute('src') !== endereco) return;
                imagem.hidden = false;
                icone.hidden = true;
            };
            imagem.onerror = () => {
                imagem.hidden = true;
                icone.hidden = false;
            };
            imagem.src = endereco;
        } else imagem.removeAttribute('src');
    }
    mostrarCapa(sistema);
    botao.onclick = async () => {
        const rota = window.location.hash;
        const registro = lerLista(chaveSistemas).find(item => item.id === sistema.id);
        if (!registro) return;
        const editor = criarEditorImagem({
            rotulo: 'URL da imagem de capa',
            descricaoPrevia: 'Prévia da capa do sistema',
            endereco: registro.imagemCapa,
            enquadramento: registro.imagemAjustes ?? registro.layout?.imagemAjustes
        });
        editor.elemento.classList.add('codex-dialogo-campos');
        const alteracoes = await abrirDialogo({
            titulo: 'Imagem de capa', conteudo: editor.elemento, confirmar: 'Salvar',
            ler: () => {
                const imagemCapa = lerEnderecoImagem(editor.input);
                return imagemCapa === null ? null : { imagemCapa, imagemAjustes: editor.obterAjustes() };
            }
        });
        if (!alteracoes || window.location.hash !== rota) return;
        const sistemas = lerLista(chaveSistemas);
        const atual = sistemas.find(item => item.id === sistema.id);
        if (!atual) return;
        Object.assign(atual, alteracoes);
        if (atual.layout?.schemaVersion === 2) Object.assign(atual.layout, alteracoes);
        salvarLista(chaveSistemas, sistemas);
        mostrarCapa(atual);
    };
}

function configurarDetalhe(pagina, idSistema, campo, seletorTexto, seletorBotao) {
    const alvo = pagina.querySelector(seletorTexto);
    const descricao = campo === 'descricao';
    const obterValor = () => lerLista(chaveSistemas).find(item => item.id === idSistema)?.[campo] || '';
    alvo.textContent = obterValor() || (descricao ? 'Sem descrição' : '');
    pagina.querySelector(seletorBotao).onclick = async () => {
        const rota = window.location.hash;
        const conteudo = document.createElement('div');
        conteudo.className = 'codex-dialogo-campos';
        const label = document.createElement('label');
        label.textContent = descricao ? 'Descrição do sistema' : 'Título do sistema';
        const input = document.createElement(descricao ? 'textarea' : 'input');
        input.value = obterValor();
        input.required = !descricao;
        input.autofocus = true;
        input.maxLength = descricao ? 500 : 120;
        label.append(input);
        conteudo.append(label);

        const valor = await abrirDialogo({
            titulo: descricao ? 'Editar descrição' : 'Editar título',
            conteudo, confirmar: 'Salvar',
            ler: () => {
                const texto = lerCampo(input);
                if (descricao && texto?.length > 500 && texto !== obterValor()) {
                    sinalizarErro(input, 'Use até 500 caracteres na descrição.');
                    return null;
                }
                return texto;
            }
        });
        if (valor === null || window.location.hash !== rota) return;
        if (!descricao && (!(await conferirNome(chaveSistemas, { id: idSistema, nome: valor })) ||
            window.location.hash !== rota)) return;
        const sistemas = lerLista(chaveSistemas);
        const atual = sistemas.find(item => item.id === idSistema);
        if (!atual) return;
        atual[campo] = valor;
        salvarLista(chaveSistemas, sistemas);
        alvo.textContent = obterValor() || 'Sem descrição';
    };
}

async function conferirNome(chave, registro) {
    try {
        await validarNomeNaConta(chave, registro);
        return true;
    } catch (erro) {
        await mostrarAviso(erro.code === 'backup/nome-ocupado' ? erro.message : 'Não foi possível conferir o nome.');
        return false;
    }
}

function lerCampo(input) {
    const valor = input.value.trim();
    if (input.required && !valor) {
        sinalizarErro(input, 'Preencha este campo.');
        return null;
    }
    return valor;
}

function sinalizarErro(input, mensagem) {
    input.parentElement.querySelector('.codex-dialogo-erro')?.remove();
    const erro = document.createElement('span');
    erro.className = 'codex-dialogo-erro';
    erro.setAttribute('role', 'alert');
    erro.textContent = mensagem;
    input.setAttribute('aria-invalid', 'true');
    input.after(erro);
    input.focus();
    input.addEventListener('input', () => {
        erro.remove();
        input.removeAttribute('aria-invalid');
    }, { once: true });
}

function abrirFicha(id) {
    window.location.hash = '#/ficha/ficha-nova?' + new URLSearchParams({ id });
}

function renderizarListaPersonagens(pagina, idSistema) {
    const lista = pagina.querySelector('#lista-personagens-container');
    const fichas = lerLista(chaveFichas).filter(item => item.sistemaId === idSistema);
    lista.replaceChildren();
    if (!fichas.length) {
        lista.innerHTML = '<div class="msg-sem-personagens">Nenhum personagem criado para este sistema ainda.</div>';
        return;
    }

    for (const ficha of fichas) {
        const card = document.createElement('article');
        card.className = 'card-personagem';
        card.innerHTML = `
            <a class="personagem-link">
                <div class="avatar-personagem"><i class="fas fa-user" aria-hidden="true"></i><img alt="" hidden></div>
                <div class="personagem-texto">
                    <h2 class="nome-personagem"></h2>
                    <p class="info-personagem" hidden></p>
                </div>
            </a>
            <div class="personagem-acoes">
                <button type="button" class="btn-editar-personagem btn-editar-detalhe" title="Editar personagem" aria-label="Editar personagem"><i class="fas fa-pen" aria-hidden="true"></i></button>
                <button type="button" class="btn-excluir-personagem" title="Excluir personagem" aria-label="Excluir personagem"><i class="fas fa-trash" aria-hidden="true"></i></button>
            </div>`;
        card.querySelector('.personagem-link').href = '#/ficha/ficha-nova?' + new URLSearchParams({ id: ficha.id });
        card.querySelector('.nome-personagem').textContent = ficha.nomePersonagem || 'Sem Nome';
        const data = ficha.criadoEm ? new Date(ficha.criadoEm) : null;
        if (data && Number.isFinite(data.getTime())) {
            const info = card.querySelector('.info-personagem');
            info.textContent = 'Criado em: ' + data.toLocaleDateString('pt-BR');
            info.hidden = false;
        }
        const img = card.querySelector('img');
        const icone = card.querySelector('.avatar-personagem i');
        const foto = urlDeImagem(ficha.imagemUrl || '');
        if (foto) {
            img.hidden = false;
            icone.hidden = true;
            aplicarAjustes(img, ficha.imagemAjustes);
            img.onerror = () => { img.hidden = true; icone.hidden = false; };
            img.src = foto;
        }
        card.querySelector('.btn-editar-personagem').onclick = async () => {
            const rota = window.location.hash;
            const dados = await editarPersonagem(ficha);
            if (!dados || window.location.hash !== rota) return;
            if (!(await conferirNome(chaveFichas, { ...ficha, ...dados })) || window.location.hash !== rota) return;
            const atuais = lerLista(chaveFichas);
            const atual = atuais.find(item => item.id === ficha.id);
            if (!atual) return;
            Object.assign(atual, dados);
            salvarLista(chaveFichas, atuais);
            renderizarListaPersonagens(pagina, idSistema);
        };
        card.querySelector('.btn-excluir-personagem').onclick = async () => {
            const rota = window.location.hash;
            if (!(await confirmarAcao('Excluir o personagem "' + (ficha.nomePersonagem || 'Sem Nome') + '"?',
                { confirmar: 'Excluir', perigo: true })) ||
                window.location.hash !== rota) return;
            salvarLista(chaveFichas, lerLista(chaveFichas).filter(item => item.id !== ficha.id));
            renderizarListaPersonagens(pagina, idSistema);
        };
        lista.append(card);
    }
}

function editarPersonagem(ficha) {
    const conteudo = document.createElement('div');
    conteudo.className = 'codex-dialogo-campos';
    conteudo.innerHTML = '<label>Nome do personagem<input name="nome" required autofocus maxlength="120"></label>';
    const nome = conteudo.querySelector('[name="nome"]');
    const editor = criarEditorImagem({
        rotulo: 'URL da imagem (opcional)',
        descricaoPrevia: 'Prévia do personagem',
        endereco: ficha?.imagemUrl,
        enquadramento: ficha?.imagemAjustes
    });
    nome.value = ficha?.nomePersonagem || '';
    conteudo.append(editor.elemento);
    return abrirDialogo({
        titulo: ficha ? 'Editar personagem' : 'Criar personagem',
        conteudo, confirmar: ficha ? 'Salvar' : 'Criar personagem',
        ler: () => {
            const nomePersonagem = lerCampo(nome);
            if (nomePersonagem === null) return null;
            const imagemUrl = lerEnderecoImagem(editor.input);
            return imagemUrl === null ? null : { nomePersonagem, imagemUrl, imagemAjustes: editor.obterAjustes() };
        }
    });
}

function lerEnderecoImagem(input) {
    const endereco = urlDeImagem(input.value);
    if (!input.value.trim() || endereco) return endereco;
    sinalizarErro(input, 'Use um endereço de imagem com http ou https.');
    return null;
}
