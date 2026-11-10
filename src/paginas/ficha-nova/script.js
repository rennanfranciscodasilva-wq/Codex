/* ============================================================
   CODEX — Página: Ficha Nova (Maestro)
   ============================================================ */

import { criarCabecalho } from '../../componentes/cabecalho/cabecalho.js';
import { iniciarZoom } from './modulos/zoom.js';
import {
    iniciarPaginas,
    atualizarModoEdicao,
    acionarAdicionarCampo
} from './modulos/paginas.js';
import { iniciarDecoracao } from './modulos/decoracao.js';

export function montarPagina(container) {
    const pagina = container.querySelector('#pagina-ficha-nova');
    if (!pagina) return;

    if (!pagina.querySelector('#home-btn')) {
        const titulo = criarCabecalho({ rotaHome: '/inicio' });
        pagina.insertBefore(titulo, pagina.firstChild);
    }

    if (pagina.dataset.eventosAtivos === 'true') return;
    pagina.dataset.eventosAtivos = 'true';

    // 1. Zoom
    const wrapper = pagina.querySelector('#folha-wrapper');
    wrapper.style.zoom = 0.5;
    iniciarZoom(pagina, wrapper);

    // 2. Sistema de páginas
    iniciarPaginas({
        menu: pagina.querySelector('#folha-paginas-menu'),
        btnAdd: pagina.querySelector('#folha-pagina-add'),
        inputTitulo: pagina.querySelector('#folha-titulo-pagina'),
        conteudo: pagina.querySelector('#folha-conteudo')
    });

    // 3. Modo Edição
    const btnModoEdicao = pagina.querySelector('#btn-modo-edicao');
    const menuDireito = pagina.querySelector('.folha-menu-lateral.direito');

    const aplicarModoEdicao = (ativo) => {
        pagina.classList.toggle('modo-edicao', ativo);
        menuDireito.classList.toggle('editando', ativo);
        
        if (!ativo && pagina.classList.contains('modo-colorir')) {
            desativarModoColorir();
        }
        
        atualizarModoEdicao();
    };

    aplicarModoEdicao(false);

    if (btnModoEdicao) {
        btnModoEdicao.addEventListener('click', () => {
            aplicarModoEdicao(!pagina.classList.contains('modo-edicao'));
        });
    }

    // 4. Ferramentas
    const btnAddCampo = pagina.querySelector('#btn-add-campo');
    const btnModoColorir = pagina.querySelector('#btn-modo-colorir');
    const btnAbrirPopUpColorir = pagina.querySelector('#btn-abrir-popup-colorir');
    
    iniciarDecoracao(); 

    function ativarModoColorir() {
        pagina.classList.add('modo-colorir');
        btnModoColorir.classList.add('ativo');
        btnAbrirPopUpColorir.style.display = 'flex';
    }

    function desativarModoColorir() {
        pagina.classList.remove('modo-colorir');
        btnModoColorir.classList.remove('ativo');
        btnAbrirPopUpColorir.style.display = 'none';
        const sheet = document.querySelector('#decoracao-sheet');
        if (sheet) sheet.classList.remove('active');
    }

    if (btnModoColorir) {
        btnModoColorir.addEventListener('click', () => {
            if (!pagina.classList.contains('modo-edicao')) {
                alert("Ative o Modo Edição primeiro!");
                return;
            }
            if (pagina.classList.contains('modo-colorir')) {
                desativarModoColorir();
            } else {
                ativarModoColorir();
            }
        });
    }

    if (btnAbrirPopUpColorir) {
        btnAbrirPopUpColorir.addEventListener('click', () => {
            const sheet = document.querySelector('#decoracao-sheet');
            if (!sheet.style.left) {
                sheet.style.right = '2rem'; sheet.style.bottom = '2rem'; sheet.style.top = 'auto'; sheet.style.left = 'auto';
            }
            sheet.classList.toggle('active');
        });
    }

    if (btnAddCampo) {
        btnAddCampo.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!pagina.classList.contains('modo-edicao')) {
                alert("Ative o Modo Edição primeiro!");
                return;
            }
            if (pagina.classList.contains('modo-colorir')) {
                alert("Desative o Modo Colorir para adicionar campos!");
                return;
            }
            
            // Chama a função do módulo paginas.js para criar o painel
            acionarAdicionarCampo();
        });
    }

    // 5. Bloco protetor
    const blocoProtecao = pagina.querySelector('#bloco-protecao-titulo');
    if (blocoProtecao) {
        blocoProtecao.addEventListener('click', () => {
            window.location.hash = '#/inicio';
        });
    }
}

export function desmontarPagina() {}