/* ============================================================
   MÓDULO: COPIAR E COLAR (Ficha Nova)
   ============================================================ */

import { 
    estado, 
    salvarEstado, 
    gerarId, 
    getPaginaAtiva, 
    estaEmModoEdicao,
    gerarNomeUnico,
    areaTransferenciaCodex,
    MAX_PAGINAS
} from './estado.js';

let refsRenderizar = null;
let refsTrocarPagina = null;
let refsEncontrarSlot = null;
let campoSelecionadoId = null;

export function configurarCopiarColar(callbacks) {
    refsRenderizar = callbacks.renderizarPaineis;
    refsTrocarPagina = callbacks.trocarPagina;
    refsEncontrarSlot = callbacks.encontrarPrimeiroSlotLivre;

    if (window._atalhosCodexConfigurados === true) return;
    window._atalhosCodexConfigurados = true;

    // Seleciona o campo ao clicar
    document.addEventListener('pointerdown', (e) => {
        const painelEl = e.target.closest('.painel');
        if (painelEl) {
            document.querySelectorAll('.painel.selecionado').forEach(p => p.classList.remove('selecionado'));
            painelEl.classList.add('selecionado');
            campoSelecionadoId = painelEl.dataset.painelId;
        } else if (!e.target.closest('.folha-menu-lateral')) {
            document.querySelectorAll('.painel.selecionado').forEach(p => p.classList.remove('selecionado'));
            campoSelecionadoId = null;
        }
    });

    // Atalho de teclado (Desktop)
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
            if (!estaEmModoEdicao() || !areaTransferenciaCodex.tipo) return;
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            e.preventDefault();
            colarElemento(campoSelecionadoId);
        }
    });
}

export function copiarPagina(id) {
    const pag = estado.paginas.find(p => p.id === id);
    if (!pag) return;
    areaTransferenciaCodex.tipo = 'pagina';
    areaTransferenciaCodex.dados = JSON.parse(JSON.stringify(pag));
    alert("Página copiada! Aperte Ctrl+V na folha para colar.");
}

export function copiarElemento(tipo, dados) {
    areaTransferenciaCodex.tipo = tipo;
    areaTransferenciaCodex.dados = JSON.parse(JSON.stringify(dados));
    mostrarToastColar();
}

/* ============================================================
   TOAST FLUTUANTE PARA O CELULAR
   ============================================================ */
function mostrarToastColar() {
    // Remove toast antigo se houver
    document.querySelector('#codex-toast-colar')?.remove();

    const toast = document.createElement('div');
    toast.id = 'codex-toast-colar';
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #1a140b;
        border: 1px solid #d4af37;
        color: #f0c44a;
        padding: 12px 20px;
        border-radius: 30px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        z-index: 100000;
        display: flex;
        align-items: center;
        gap: 15px;
        font-family: var(--fonte-titulo, inherit);
        font-size: 0.9rem;
        animation: slideUp 0.3s ease-out;
    `;

    toast.innerHTML = `
        <span>Bloco copiado!</span>
        <button id="btn-toast-colar" style="background: #d4af37; color: #1a140b; border: none; padding: 6px 12px; border-radius: 20px; font-weight: bold; cursor: pointer;">
            <i class="fas fa-paste"></i> Colar
        </button>
        <button id="btn-toast-fechar" style="background: transparent; color: #ff8a8a; border: none; cursor: pointer; font-size: 1.2rem;">
            <i class="fas fa-times"></i>
        </button>
    `;

    document.body.appendChild(toast);

    document.querySelector('#btn-toast-colar').onclick = () => {
        colarElemento(campoSelecionadoId);
        toast.remove();
    };

    document.querySelector('#btn-toast-fechar').onclick = () => {
        toast.remove();
    };
}

/* ============================================================
   LÓGICA DE COLAR
   ============================================================ */
export function colarElemento(campoIdForcado = null) {
    const item = areaTransferenciaCodex;
    if (!item || !item.tipo) return;

    const campoIdParaUsar = campoIdForcado || campoSelecionadoId;

    // --- VERIFICA SE ESTÁ NO WIZARD ---
    const isWizard = typeof window._codexWizardObterCampoAtual === 'function' && 
                     document.querySelector('#pagina-ficha-nova')?.classList.contains('wizard-ativo');

    if (isWizard) {
        const campoAtual = window._codexWizardObterCampoAtual();
        if (!campoAtual) return;

        if (item.tipo === 'bloco') {
            const novoBloco = JSON.parse(JSON.stringify(item.dados));
            novoBloco.id = gerarId('b_');
            novoBloco.x = (novoBloco.x || 0) + 20; 
            novoBloco.y = (novoBloco.y || 0) + 20;

            if (!Array.isArray(campoAtual.blocos)) campoAtual.blocos = [];
            campoAtual.blocos.push(novoBloco);
            
            if (typeof window._codexWizardAtualizarCampo === 'function') {
                window._codexWizardAtualizarCampo();
            }
            return;
        }
        return;
    }

    // --- FICHA NORMAL ---
    if (item.tipo === 'bloco') {
        if (!campoIdParaUsar) {
            alert("Selecione o campo onde deseja colar o bloco primeiro.");
            return;
        }
        const pag = getPaginaAtiva();
        const painel = pag.paineis.find(p => p.id === campoIdParaUsar);
        if (!painel) return;

        const novoBloco = JSON.parse(JSON.stringify(item.dados));
        novoBloco.id = gerarId('b_');
        novoBloco.x += 10; novoBloco.y += 10;

        painel.blocos.push(novoBloco);
        salvarEstado();
        if (refsRenderizar) refsRenderizar();
    }
}