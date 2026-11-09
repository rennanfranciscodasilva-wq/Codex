/* ============================================================
   CODEX — Página: Ficha Nova (Maestro)
   ============================================================ */

import { criarCabecalho } from '../../componentes/cabecalho/cabecalho.js';
import { iniciarZoom } from './modulos/zoom.js';
import { iniciarPaginas, atualizarModoEdicao } from './modulos/paginas.js';

export function montarPagina(container) {
    const pagina = container.querySelector('#pagina-ficha-nova');
    if (!pagina) return;

    if (!pagina.querySelector('#home-btn')) {
        const titulo = criarCabecalho({ rotaHome: '/inicio' });
        pagina.insertBefore(titulo, pagina.firstChild);
    }

    if (pagina.dataset.eventosAtivos === 'true') return;
    pagina.dataset.eventosAtivos = 'true';

    // 1. Inicializa o Zoom
    const wrapper = pagina.querySelector('#folha-wrapper');
    wrapper.style.zoom = 0.5; // Zoom base em 50%
    iniciarZoom(pagina, wrapper);

    // 2. Inicializa o Sistema de Páginas
    iniciarPaginas({
        menu: pagina.querySelector('#folha-paginas-menu'),
        btnAdd: pagina.querySelector('#folha-pagina-add'),
        inputTitulo: pagina.querySelector('#folha-titulo-pagina'),
        conteudo: pagina.querySelector('#folha-conteudo')
    });

    // 3. Lógica do Modo Edição
    const btnModoEdicao = pagina.querySelector('#btn-modo-edicao');
    const menuDireito = pagina.querySelector('.folha-menu-lateral.direito');

    const aplicarModoEdicao = (ativo) => {
        if (ativo) {
            pagina.classList.add('modo-edicao');
            menuDireito.classList.add('editando');
        } else {
            pagina.classList.remove('modo-edicao');
            menuDireito.classList.remove('editando');
        }
        atualizarModoEdicao(); 
    };

    aplicarModoEdicao(false);

    if (btnModoEdicao) {
        btnModoEdicao.addEventListener('click', () => {
            const estaAtivo = pagina.classList.contains('modo-edicao');
            aplicarModoEdicao(!estaAtivo);
        });
    }

    // 4. Ferramentas Extras
    const btnAddCampo = pagina.querySelector('#btn-add-campo');
    const btnColorir = pagina.querySelector('#btn-colorir');

    if (btnAddCampo) {
        btnAddCampo.addEventListener('click', () => {
            alert("A ferramenta de adicionar campo será implementada em breve!");
        });
    }

    if (btnColorir) {
        btnColorir.addEventListener('click', () => {
            alert("O seletor de cores será implementado em breve!");
        });
    }

    // 5. O BLOCO PROTETOR: Clicar no espaço vazio volta para a Home
    const blocoProtecao = pagina.querySelector('#bloco-protecao-titulo');
    if (blocoProtecao) {
        blocoProtecao.addEventListener('click', () => {
            window.location.hash = '#/inicio';
        });
    }
}

export function desmontarPagina() {
    // Nada para limpar
}