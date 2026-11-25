import { confirmarAcao } from '../../componentes/dialogos/dialogos.js';
import { aplicarAjustes } from '../../componentes/imagem/ajustes.js';
import { armazenamentoBiblioteca, excluirModeloComFichas, prepararBiblioteca } from '../../servicos/armazenamento/biblioteca.js';

let refs = null;

export async function montarPagina(container) {
    const rota = window.location.hash;
    await prepararBiblioteca();
    if (window.location.hash !== rota || !container.isConnected) return;
    const pagina = container.querySelector('#pagina-ficha');
    if (!pagina) return;

    refs = {
        lista: pagina.querySelector('#ficha-cards-container'),
        modelo: pagina.querySelector('.ficha-modelo-template'),
        criar: pagina.querySelector('.ficha-criar-modelo')
    };
    renderizarSistemas();
}

export function desmontarPagina() {
    refs = null;
}

function renderizarSistemas() {
    const tela = refs;
    let sistemas;
    try {
        sistemas = JSON.parse(armazenamentoBiblioteca.getItem('codex_sistemas') || '[]');
        if (!Array.isArray(sistemas)) throw new TypeError('Lista de sistemas inválida');
    } catch (erro) {
        console.error('[ficha] falha ao ler os sistemas salvos:', erro);
        mostrarEstado(tela.lista, 'Não foi possível carregar os modelos salvos.');
        return;
    }

    const modelos = sistemas.filter(sistema => sistema && typeof sistema === 'object' && sistema.id != null);
    if (!modelos.length) {
        mostrarEstado(tela.lista, 'Você ainda não tem modelos salvos.');
        return;
    }

    const cards = modelos.map(sistema => {
        const card = tela.modelo.content.firstElementChild.cloneNode(true);
        const nome = String(sistema.nome ?? '').trim() || 'Modelo sem nome';
        const parametros = new URLSearchParams({ id: sistema.id });
        card.querySelector('.ficha-modelo-link').href = '#/ficha/personagens?' + parametros;
        card.querySelector('.ficha-card-title').textContent = nome;

        const descricao = card.querySelector('.ficha-card-desc');
        descricao.textContent = sistema.descricao || '';
        descricao.hidden = !descricao.textContent;

        const status = card.querySelector('.ficha-modelo-status');
        const armazenamento = sistema.naNuvem ? 'Salvo na nuvem' : 'Salvo neste navegador';
        status.classList.add('fas', sistema.naNuvem ? 'fa-cloud' : 'fa-mobile-alt');
        status.setAttribute('aria-label', armazenamento);
        status.title = armazenamento;

        if (sistema.imagemCapa) {
            const imagem = card.querySelector('img');
            const icone = card.querySelector('.ficha-card-icon i');
            aplicarAjustes(imagem, sistema.imagemAjustes ?? sistema.layout?.imagemAjustes);
            imagem.onload = () => {
                icone.hidden = true;
            };
            imagem.onerror = () => { imagem.hidden = true; };
            imagem.hidden = false;
            imagem.src = sistema.imagemCapa;
        }

        const editar = card.querySelector('.btn-editar-sistema');
        editar.href = '#/ficha/modelo?' + parametros;
        editar.setAttribute('aria-label', 'Editar modelo ' + nome);

        const excluir = card.querySelector('.btn-deletar-sistema');
        excluir.setAttribute('aria-label', 'Excluir modelo ' + nome);
        excluir.onclick = async () => {
            if (!(await confirmarAcao('Excluir o modelo "' + nome + '" e todos os personagens criados a partir dele?',
                { confirmar: 'Excluir', perigo: true }))) return;
            excluirModeloComFichas(sistema.id);
            if (refs !== tela) return;
            const indice = Array.from(tela.lista.children).indexOf(card);
            renderizarSistemas();
            const vizinho = tela.lista.children[Math.min(indice, tela.lista.children.length - 1)];
            (vizinho?.querySelector('.ficha-modelo-link') ?? tela.criar).focus();
        };
        return card;
    });
    tela.lista.replaceChildren(...cards);
}

function mostrarEstado(lista, mensagem) {
    const aviso = document.createElement('p');
    aviso.className = 'ficha-modelos-estado';
    aviso.setAttribute('role', 'status');
    aviso.textContent = mensagem;
    lista.replaceChildren(aviso);
}
