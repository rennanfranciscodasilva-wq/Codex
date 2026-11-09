/* ============================================================
   MÓDULO: PÁGINAS (Ficha Nova)
   ============================================================ */

const MAX_PAGINAS = 10;

const ICONES_DISPONIVEIS = [
    'fa-book', 'fa-scroll', 'fa-fire', 'fa-hat-wizard', 
    'fa-dragon', 'fa-shield-alt', 'fa-gem', 'fa-feather-alt', 
    'fa-skull', 'fa-tree', 'fa-dice-d20', 'fa-wand-magic-sparkles',
    'fa-flask', 'fa-eye', 'fa-hand-fist', 'fa-heart', 
    'fa-compass', 'fa-map', 'fa-crown', 'fa-key', 
    'fa-sword', 'fa-moon'
];

let estado = {
    paginas: [],
    paginaAtivaId: null,
    animacaoAtiva: true
};

let refs = null;
let animando = false;
let timerPress = null;
let paginaSendoEditadaId = null;

export function iniciarPaginas(elementos) {
    refs = elementos; 

    if (estado.paginas.length === 0) {
        estado.paginas.push({ 
            id: Date.now().toString(), 
            nome: 'Página 1', 
            icone: 'fa-book', 
            descricao: '' 
        });
        estado.paginaAtivaId = estado.paginas[0].id;
    }

    refs.btnAdd.addEventListener('click', adicionarPagina);
    
    // Input do título na folha
    refs.inputTitulo.addEventListener('input', (e) => {
        const paginaContainer = document.querySelector('#pagina-ficha-nova');
        if (!paginaContainer.classList.contains('modo-edicao')) return;

        const pag = estado.paginas.find(p => p.id === estado.paginaAtivaId);
        if (pag) {
            pag.nome = e.target.value;
            atualizarTooltips(); // Atualiza o tooltip em tempo real sem recriar o DOM
        }
    });

    configurarBottomSheet();
    configurarBotaoAnimacao();
    configurarTooltipsDireita();

    renderizarMenu();
    carregarConteudoPaginaAtiva();
}

export function atualizarModoEdicao() {
    renderizarMenu();
}

/* ---------- Lógica Principal ---------- */

function adicionarPagina() {
    if (animando) return;
    
    const paginaContainer = document.querySelector('#pagina-ficha-nova');
    if (!paginaContainer.classList.contains('modo-edicao')) return;

    if (estado.paginas.length >= MAX_PAGINAS) {
        alert(`Você atingiu o limite de ${MAX_PAGINAS} páginas.`);
        return;
    }

    const numero = estado.paginas.length + 1;
    const iconeAleatorio = ICONES_DISPONIVEIS[Math.floor(Math.random() * ICONES_DISPONIVEIS.length)];
    
    const novaPagina = { 
        id: Date.now().toString(), 
        nome: `Página ${numero}`, 
        icone: iconeAleatorio,
        descricao: ''
    };
    estado.paginas.push(novaPagina);
    trocarPagina(novaPagina.id);
}

function trocarPagina(id) {
    if (estado.paginaAtivaId === id || animando) return;
    
    if (!estado.animacaoAtiva) {
        estado.paginaAtivaId = id;
        renderizarMenu();
        carregarConteudoPaginaAtiva();
        return;
    }

    animando = true;
    const folha = document.querySelector('#pagina-ficha-nova .folha');
    const inputTitulo = document.querySelector('#folha-titulo-pagina');
    
    if (inputTitulo) inputTitulo.style.visibility = 'hidden';

    folha.classList.add('virando-pagina');

    setTimeout(() => {
        estado.paginaAtivaId = id;
        renderizarMenu();
        carregarConteudoPaginaAtiva();
        
        folha.classList.remove('virando-pagina');
        
        if (inputTitulo) inputTitulo.style.visibility = 'visible';
        animando = false;
    }, 600); 
}

function excluirPagina(id) {
    if (estado.paginas.length <= 1) {
        alert("Você precisa ter pelo menos uma página.");
        return;
    }

    const index = estado.paginas.findIndex(p => p.id === id);
    estado.paginas.splice(index, 1);

    if (estado.paginaAtivaId === id) {
        estado.paginaAtivaId = estado.paginas[0].id;
        carregarConteudoPaginaAtiva();
    }

    fecharBottomSheet();
    renderizarMenu();
}

/* ---------- Menu e Bottom Sheet ---------- */

function renderizarMenu() {
    const btnAdd = refs.btnAdd;
    refs.menu.innerHTML = '';

    estado.paginas.forEach((pag, index) => {
        const isAtiva = pag.id === estado.paginaAtivaId;
        
        const btn = document.createElement('button');
        btn.className = `folha-pagina-btn ${isAtiva ? 'ativa' : ''}`;
        btn.dataset.pageId = pag.id; // Identificador para atualizar o tooltip
        
        if (pag.icone) {
            btn.innerHTML = `<i class="fas ${pag.icone}"></i>`;
        } else {
            btn.textContent = index + 1;
        }

        const numeroBadge = document.createElement('span');
        numeroBadge.className = 'folha-pagina-numero';
        numeroBadge.textContent = index + 1;
        btn.appendChild(numeroBadge);

        const tooltip = document.createElement('span');
        tooltip.className = 'folha-pagina-tooltip';
        tooltip.textContent = pag.nome;
        btn.appendChild(tooltip);

        btn.addEventListener('click', () => trocarPagina(pag.id));
        
        btn.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const paginaContainer = document.querySelector('#pagina-ficha-nova');
            if (paginaContainer.classList.contains('modo-edicao')) {
                abrirBottomSheet(pag.id);
            }
        });

        btn.addEventListener('pointerdown', (e) => {
            if (e.button === 2) return; 
            const paginaContainer = document.querySelector('#pagina-ficha-nova');
            if (paginaContainer.classList.contains('modo-edicao')) {
                timerPress = setTimeout(() => {
                    abrirBottomSheet(pag.id);
                }, 600); 
            }
        });

        btn.addEventListener('pointerup', () => clearTimeout(timerPress));
        btn.addEventListener('pointerleave', () => clearTimeout(timerPress));
        btn.addEventListener('pointermove', () => clearTimeout(timerPress));

        refs.menu.appendChild(btn);
    });

    refs.menu.appendChild(btnAdd);
    
    if (estado.paginas.length >= MAX_PAGINAS) {
        btnAdd.style.display = 'none';
    } else {
        btnAdd.style.display = 'flex';
    }
}

// --- NOVA FUNÇÃO: Atualiza apenas o texto dos tooltips sem recriar o menu ---
function atualizarTooltips() {
    const botoes = refs.menu.querySelectorAll('.folha-pagina-btn');
    botoes.forEach(btn => {
        const pageId = btn.dataset.pageId;
        const pag = estado.paginas.find(p => p.id === pageId);
        if (pag) {
            const tooltip = btn.querySelector('.folha-pagina-tooltip');
            if (tooltip) {
                tooltip.textContent = pag.nome;
            }
        }
    });
}

function configurarTooltipsDireita() {
    const botoes = document.querySelectorAll('.folha-menu-lateral.direito .folha-btn-ferramenta');
    botoes.forEach(btn => {
        const texto = btn.getAttribute('data-tooltip');
        if (!texto) return;

        const tooltip = document.createElement('span');
        tooltip.className = 'folha-btn-tooltip';
        tooltip.textContent = texto;
        btn.appendChild(tooltip);
    });
}

function configurarBottomSheet() {
    const sheet = document.querySelector('#page-settings-sheet');
    const dragHandle = document.querySelector('#sheet-header-drag');
    const inputNome = document.querySelector('#sheet-page-name');
    const inputDesc = document.querySelector('#sheet-page-desc');
    const gridIcones = document.querySelector('#sheet-icons-grid');
    const btnExcluir = document.querySelector('#btn-excluir-pagina');
    const btnClose = document.querySelector('#sheet-close-btn'); 
    
    // --- LÓGICA DE ARRASTAR LIVRE (X e Y) ---
    let isDragging = false;
    let startX = 0, startY = 0;
    let initialX = 0, initialY = 0;

    const onPointerDown = (e) => {
        if (e.target.closest('input, button, textarea, .sheet-close-btn')) return;
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = sheet.getBoundingClientRect();
        initialX = rect.left;
        initialY = rect.top;
        sheet.style.transition = 'none'; 
        sheet.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        sheet.style.left = `${initialX + deltaX}px`;
        sheet.style.top = `${initialY + deltaY}px`;
        sheet.style.bottom = 'auto'; 
        sheet.style.right = 'auto';  
    };

    const onPointerUp = (e) => {
        if (!isDragging) return;
        isDragging = false;
        sheet.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease';
        sheet.releasePointerCapture(e.pointerId);
    };

    if (dragHandle) {
        dragHandle.addEventListener('pointerdown', onPointerDown);
        sheet.addEventListener('pointermove', onPointerMove);
        sheet.addEventListener('pointerup', onPointerUp);
    }

    if (btnClose) {
        btnClose.addEventListener('click', fecharBottomSheet);
    }

    // --- ÍCONES ---
    ICONES_DISPONIVEIS.forEach(icone => {
        const btnIcone = document.createElement('button');
        btnIcone.className = 'sheet-icon-btn';
        btnIcone.innerHTML = `<i class="fas ${icone}"></i>`;
        btnIcone.dataset.icone = icone;
        
        btnIcone.addEventListener('click', () => {
            const pag = estado.paginas.find(p => p.id === paginaSendoEditadaId);
            if (pag) {
                pag.icone = icone;
                renderizarMenu();
                atualizarIconeSelecionado(icone);
            }
        });
        gridIcones.appendChild(btnIcone);
    });

    // --- INPUTS EM TEMPO REAL ---
    inputNome.addEventListener('input', (e) => {
        const pag = estado.paginas.find(p => p.id === paginaSendoEditadaId);
        if (pag) {
            pag.nome = e.target.value;
            refs.inputTitulo.value = pag.nome;
            atualizarTooltips(); // Atualiza o tooltip em tempo real
        }
    });

    inputDesc.addEventListener('input', (e) => {
        const pag = estado.paginas.find(p => p.id === paginaSendoEditadaId);
        if (pag) {
            pag.descricao = e.target.value;
            carregarConteudoPaginaAtiva();
        }
    });

    btnExcluir.addEventListener('click', () => {
        if (paginaSendoEditadaId) excluirPagina(paginaSendoEditadaId);
    });
}

function abrirBottomSheet(id) {
    const pag = estado.paginas.find(p => p.id === id);
    if (!pag) return;

    paginaSendoEditadaId = id;
    
    document.querySelector('#sheet-page-name').value = pag.nome;
    document.querySelector('#sheet-page-desc').value = pag.descricao || '';
    atualizarIconeSelecionado(pag.icone);

    const sheet = document.querySelector('#page-settings-sheet');
    
    sheet.style.left = 'auto';
    sheet.style.top = 'auto';
    sheet.style.right = '2rem';
    sheet.style.bottom = '2rem';
    
    sheet.classList.add('active');
}

function fecharBottomSheet() {
    const sheet = document.querySelector('#page-settings-sheet');
    sheet.classList.remove('active');
    paginaSendoEditadaId = null;
}

function atualizarIconeSelecionado(iconeAtual) {
    const botoes = document.querySelectorAll('.sheet-icon-btn');
    botoes.forEach(btn => {
        if (btn.dataset.icone === iconeAtual) {
            btn.classList.add('ativo');
        } else {
            btn.classList.remove('ativo');
        }
    });
}

function configurarBotaoAnimacao() {
    const btnToggleAnimacao = document.querySelector('#btn-toggle-animacao');
    if (!btnToggleAnimacao) return;

    if (estado.animacaoAtiva) btnToggleAnimacao.classList.add('ativo');
    
    btnToggleAnimacao.addEventListener('click', () => {
        estado.animacaoAtiva = !estado.animacaoAtiva;
        btnToggleAnimacao.classList.toggle('ativo');
    });
}

function carregarConteudoPaginaAtiva() {
    if (!refs.conteudo) return;
    
    const pag = estado.paginas.find(p => p.id === estado.paginaAtivaId);
    if (!pag) return;

    refs.inputTitulo.value = pag.nome;
    
    const descEl = document.querySelector('#folha-descricao-pagina');
    if (descEl) {
        descEl.textContent = pag.descricao || '';
        descEl.style.display = pag.descricao ? 'block' : 'none';
    }

    refs.conteudo.innerHTML = '';
    const placeholder = document.createElement('div');
    placeholder.style.cssText = 'display: flex; align-items: center; justify-content: center; height: 100%; color: rgba(107,79,29,0.3); font-family: var(--fonte-titulo); font-style: italic; font-size: 1.2rem;';
    placeholder.textContent = `Conteúdo da ${pag.nome}`;
    refs.conteudo.appendChild(placeholder);
}