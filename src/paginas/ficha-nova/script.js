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
} from './modulos/paginas/index.js';

let _handlerModoEdicao = null;
let _handlerAddCampo = null;

export function montarPagina(container) {
    // Delay de segurança para o Vite terminar de injetar o HTML antes de buscar os elementos
    setTimeout(() => {
        iniciarFichaNova(container);
    }, 50);
}

function iniciarFichaNova(container) {
    const pagina = container.querySelector('#pagina-ficha-nova');
    if (!pagina) {
        console.warn("Ficha Nova: Aguardando DOM...");
        return;
    }

    // --- EVENTO DO CABEÇALHO (O HTML já está injetado no index.html) ---
    const btnVoltar = pagina.querySelector('#btn-voltar-home');
    if (btnVoltar) {
        // Clona o botão para remover qualquer listener antigo e evitar duplicação
        const novoBtn = btnVoltar.cloneNode(true);
        btnVoltar.parentNode.replaceChild(novoBtn, btnVoltar);
        novoBtn.addEventListener('click', () => {
            window.location.hash = '#/inicio';
        });
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
    if (!area) return;

    let isDown = false;
    let startX, startY;
    let scrollLeft, scrollTop;

    area.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    area.addEventListener('pointerdown', (e) => {
        const isRightClick = e.button === 2;
        const isTouch = e.pointerType === 'touch';
        
        if (!isRightClick && !isTouch) return;

        if (e.target.closest('.bloco-imagem')) {
            return;
        }

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
        
        const walkX = (x - startX) * 1.5; 
        const walkY = (y - startY) * 1.5;
        
        area.scrollLeft = scrollLeft - walkX;
        area.scrollTop = scrollTop - walkY;
    });

    const pararArrasto = () => {
        if (!isDown) return;
        isDown = false;
        area.style.cursor = 'default';
    };

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