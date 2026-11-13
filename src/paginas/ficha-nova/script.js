/* ============================================================
   CODEX — Página: Ficha Nova (Maestro)
   ============================================================ */

import { iniciarZoom } from './modulos/zoom.js';
import {
    iniciarPaginas,
    atualizarModoEdicao,
    acionarAdicionarCampo,
    estado,
    salvarEstado,
    renderizarPaineis,
    renderizarMenu
} from './modulos/paginas.js';

let _handlerModoEdicao = null;
let _handlerAddCampo = null;

export function montarPagina(container) {
    const pagina = container.querySelector('#pagina-ficha-nova');
    if (!pagina) return;

    // --- INJEÇÃO DO CABEÇALHO ---
    const homeBtnContainer = pagina.querySelector('#home-btn-container');
    if (homeBtnContainer) {
        homeBtnContainer.innerHTML = `
            <div id="btn-voltar-home" style="display: flex; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; cursor: pointer;">
                <h1 style="font-family: 'Cinzel', serif; font-size: 4rem; color: #d4af37; text-shadow: 0 0 20px rgba(240, 196, 74, 0.8); margin: 0; line-height: 1; font-weight: 900; pointer-events: none;">CODEX</h1>
                <span style="font-family: 'Cinzel', serif; font-size: 1.2rem; color: #f0c44a; letter-spacing: 8px; margin-top: 10px; pointer-events: none;">⚔ RPG ⚔</span>
            </div>
        `;

        const btnVoltar = homeBtnContainer.querySelector('#btn-voltar-home');
        if (btnVoltar) {
            btnVoltar.addEventListener('click', () => {
                window.location.hash = '#/inicio';
            });
        }
    }

    if (pagina.dataset.eventosAtivos === 'true') return;
    pagina.dataset.eventosAtivos = 'true';

    // 1. Zoom
    const wrapper = pagina.querySelector('#folha-wrapper');
    if (!wrapper) return;
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
    if (!btnModoEdicao || !menuDireito) return;

    const aplicarModoEdicao = (ativo) => {
        pagina.classList.toggle('modo-edicao', ativo);
        menuDireito.classList.toggle('editando', ativo);
        atualizarModoEdicao();
    };

    aplicarModoEdicao(false);

    _handlerModoEdicao = () => {
        aplicarModoEdicao(!pagina.classList.contains('modo-edicao'));
    };
    btnModoEdicao.addEventListener('click', _handlerModoEdicao);

    // 4. Ferramentas (Adicionar Campo)
    const btnAddCampo = pagina.querySelector('#btn-add-campo');
    if (btnAddCampo) {
        _handlerAddCampo = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!pagina.classList.contains('modo-edicao')) {
                alert("Ative o Modo Edição primeiro!");
                return;
            }
            acionarAdicionarCampo();
        };
        btnAddCampo.addEventListener('click', _handlerAddCampo);
    }

    // 5. Arrastar Câmera (Pan)
    configurarArrastarCamera(pagina);
}

/* --- FUNÇÃO: ARRASTAR CÂMERA (PAN) --- */
function configurarArrastarCamera(pagina) {
    const area = pagina.querySelector('.ficha-nova-area');
    const folha = pagina.querySelector('#folha-elemento');
    if (!area || !folha) return;

    let isDown = false;
    let startX, startY;
    let scrollLeft, scrollTop;

    folha.addEventListener('contextmenu', (e) => e.preventDefault());

    area.addEventListener('pointerdown', (e) => {
        const isRightClick = e.button === 2;
        const isTouch = e.pointerType === 'touch';
        if (!isRightClick && !isTouch) return;
        if (e.target.closest('.painel, .bloco, button, input, textarea, .folha-menu-lateral, .ficha-header-fixo')) return;

        isDown = true;
        area.style.cursor = 'grabbing';
        startX = e.pageX - area.offsetLeft;
        startY = e.pageY - area.offsetTop;
        scrollLeft = area.scrollLeft;
        scrollTop = area.scrollTop;
        e.preventDefault(); 
    });

    area.addEventListener('pointermove', (e) => {
        if (!isDown) return;
        const x = e.pageX - area.offsetLeft;
        const y = e.pageY - area.offsetTop;
        area.scrollLeft = scrollLeft - (x - startX) * 1.5;
        area.scrollTop = scrollTop - (y - startY) * 1.5;
    });

    const pararArrasto = () => { isDown = false; area.style.cursor = 'default'; };
    area.addEventListener('pointerup', pararArrasto);
    area.addEventListener('pointerleave', pararArrasto);
}

export function desmontarPagina() {
    const pagina = document.querySelector('#pagina-ficha-nova');
    if (!pagina) return;

    if (_handlerModoEdicao) {
        const btn = pagina.querySelector('#btn-modo-edicao');
        if (btn) btn.removeEventListener('click', _handlerModoEdicao);
        _handlerModoEdicao = null;
    }
    if (_handlerAddCampo) {
        const btn = pagina.querySelector('#btn-add-campo');
        if (btn) btn.removeEventListener('click', _handlerAddCampo);
        _handlerAddCampo = null;
    }

    pagina.classList.remove('modo-edicao');
    const menuDireito = pagina.querySelector('.folha-menu-lateral.direito');
    if (menuDireito) menuDireito.classList.remove('editando');

    pagina.dataset.eventosAtivos = 'false';
}