/* ============================================================
   CODEX — Wizard: Passo 2 (Gerenciamento de Páginas)
   ============================================================ */

import { mostrarAviso, confirmarAcao } from '../../../../componentes/dialogos/dialogos.js';
import { estado, salvarEstado, gerarId } from '../paginas/estado.js';

export function configurarSeletorDestinoWizard(refs) {
    const menuPaginas = refs.pagina.querySelector('#folha-paginas-menu');
    if (!menuPaginas) return;

    // --- 1. LIMPA O MENU INTEIRO (INCLUSIVE O BOTÃO "+" ANTIGO) ---
    menuPaginas.innerHTML = '';

    // --- 2. CRIA AS BOLINHAS DE PÁGINA ---
    estado.paginas.forEach((pag, index) => {
        const isAtiva = pag.id === estado.paginaAtivaId;
        const btn = document.createElement('button');
        btn.className = `folha-pagina-btn ${isAtiva ? 'ativa' : ''}`;
        btn.dataset.pageId = pag.id;
        
        btn.innerHTML = `<span style="font-weight: bold; font-size: 1.1rem;">${index + 1}</span>`;

        // Adiciona o "X" na ativa
        if (isAtiva && estado.paginas.length > 1) {
            const btnX = document.createElement('div');
            btnX.className = 'btn-excluir-pagina-orbita';
            btnX.innerHTML = '<i class="fas fa-times"></i>';
            btnX.title = 'Excluir esta página';
            
            // Evento para excluir página
            btnX.onclick = async (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                ev.stopImmediatePropagation();
                
                if (estado.paginas.length <= 1) {
                    mostrarAviso("Você precisa ter pelo menos uma página no sistema.");
                    return;
                }

                const paginaParaExcluir = estado.paginas.find(p => p.id === pag.id);
                let mensagem = "Tem certeza que deseja excluir esta página?";
                if (paginaParaExcluir && paginaParaExcluir.paineis && paginaParaExcluir.paineis.length > 0) {
                    const nomesCampos = paginaParaExcluir.paineis.map(p => p.titulo || '(sem título)').filter(Boolean).join(", ");
                    if (nomesCampos) mensagem = `Tem certeza que deseja excluir esta página? Ela contém: ${nomesCampos}`;
                }

                if ((await confirmarAcao(mensagem))) {
                    estado.paginas = estado.paginas.filter(p => p.id !== pag.id);
                    if (estado.paginaAtivaId === pag.id) {
                        estado.paginaAtivaId = estado.paginas[0].id;
                    }
                    salvarEstado();
                    configurarSeletorDestinoWizard(refs);
                }
            };
            btn.appendChild(btnX);
        }

        // Evento para trocar o destino
        btn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            if (pag.id === estado.paginaAtivaId) return;

            estado.paginaAtivaId = pag.id;
            salvarEstado();

            // Apenas atualiza o visual, sem mexer no conteúdo
            configurarSeletorDestinoWizard(refs);
        };

        menuPaginas.appendChild(btn);
    });

    // --- 3. CRIA O BOTÃO "+" DO ZERO ---
    const btnAdd = document.createElement('button');
    btnAdd.className = 'folha-pagina-btn add';
    btnAdd.id = 'folha-pagina-add';
    btnAdd.title = 'Nova Página';
    btnAdd.innerHTML = '<i class="fas fa-plus"></i>';
    btnAdd.style.display = estado.paginas.length >= 10 ? 'none' : 'flex';
    
    // Evento para adicionar página
    btnAdd.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (estado.paginas.length >= 10) {
            mostrarAviso("Limite de 10 páginas.");
            return;
        }

        const novaPagina = {
            id: gerarId('pag_'),
            nome: `Página ${estado.paginas.length + 1}`,
            icone: null,
            descricao: '',
            paineis: []
        };
        estado.paginas.push(novaPagina);
        estado.paginaAtivaId = novaPagina.id;
        salvarEstado();

        // Redesenha tudo (o botão "+" será recriado do zero)
        configurarSeletorDestinoWizard(refs);
    };

    menuPaginas.appendChild(btnAdd);
}