/* ============================================================
   CODEX — Wizard: Finalizar
   ============================================================ */

import { estado, gerarId, salvarEstado } from '../paginas/estado.js';

export function capturarCampoAtual(sistemaEmCriacao) {
    const campo = sistemaEmCriacao.campoAtual;
    if (!campo) return;
    if (!campo.blocos || campo.blocos.length === 0) return;

    sistemaEmCriacao.campos.push({
        ...JSON.parse(JSON.stringify(campo)),
        paginaDestino: estado.paginaAtivaId
    });

    sistemaEmCriacao.campoAtual = null;
}

export function executarFinalizar(sistemaEmCriacao, refs) {
    capturarCampoAtual(sistemaEmCriacao);
    
    if (sistemaEmCriacao.campos.length === 0) {
        return alert('Adicione pelo menos um campo com blocos antes de finalizar.');
    }

    const paginasUsadas = new Set();
    sistemaEmCriacao.campos.forEach(campo => {
        if (campo.paginaDestino) paginasUsadas.add(campo.paginaDestino);
    });

    let maiorPagina = 1;
    paginasUsadas.forEach(id => {
        const index = estado.paginas.findIndex(p => p.id === id);
        if (index >= 0 && (index + 1) > maiorPagina) maiorPagina = index + 1;
    });

    let alertaVazias = false;
    for (let i = 1; i < maiorPagina; i++) {
        const pagId = estado.paginas[i] ? estado.paginas[i].id : null;
        if (!pagId || !paginasUsadas.has(pagId)) {
            alertaVazias = true;
            break;
        }
    }

    if (alertaVazias) {
        if (!confirm("Você está salvando conteúdo em páginas avançadas, mas algumas páginas anteriores estão vazias. Deseja continuar?")) {
            return;
        }
    }

    const paginasFinais = [];
    const maxPaginas = Math.max(1, maiorPagina);

    for (let i = 0; i < maxPaginas; i++) {
        const pagOriginal = estado.paginas[i];
        paginasFinais.push({
            id: gerarId('pag_'),
            nome: pagOriginal ? (pagOriginal.nome || `Página ${i + 1}`) : `Página ${i + 1}`,
            icone: pagOriginal ? (pagOriginal.icone || 'fa-book') : 'fa-book',
            descricao: pagOriginal ? (pagOriginal.descricao || '') : '',
            paineis: []
        });
    }

    sistemaEmCriacao.campos.forEach(campo => {
        const index = estado.paginas.findIndex(p => p.id === campo.paginaDestino);
        const pageIndex = index >= 0 ? index : 0;
        if (paginasFinais[pageIndex]) {
            const { paginaDestino, ...campoLimpo } = campo;
            paginasFinais[pageIndex].paineis.push(campoLimpo);
        }
    });

    const estruturaLayout = {
        paginas: paginasFinais,
        paginaAtivaId: paginasFinais[0].id,
        animacaoAtiva: estado.animacaoAtiva,
        modoLayout: estado.modoLayout
    };

    const sistemasSalvos = JSON.parse(localStorage.getItem('codex_sistemas') || '[]');
    sistemasSalvos.push({
        id: gerarId('sist_'),
        nome: sistemaEmCriacao.nome,
        descricao: sistemaEmCriacao.descricao,
        imagemCapa: sistemaEmCriacao.imagemCapa,
        imagemAjustes: sistemaEmCriacao.imagemAjustes,
        layout: estruturaLayout,
        naNuvem: false
    });
    localStorage.setItem('codex_sistemas', JSON.stringify(sistemasSalvos));

    // --- SALVA O NOME DO SISTEMA NO ESTADO DA FICHA (para aparecer no topo) ---
    estado.nomeSistema = sistemaEmCriacao.nome;
    estado.paginas = paginasFinais;
    estado.paginaAtivaId = paginasFinais[0].id;
    salvarEstado();
    
    localStorage.removeItem('codex_wizard_novo_sistema'); // Limpa a flag
    localStorage.removeItem('codex_abrir_wizard');
    
    refs.overlay.classList.add('hidden');
    refs.overlay.classList.remove('wizard-modo-editor');
    refs.pagina.classList.remove('wizard-ativo', 'modo-edicao');

    const btnAnimacao = refs.pagina.querySelector('#btn-toggle-animacao');
    const btnModoEdicao = refs.pagina.querySelector('#btn-modo-edicao');
    if (btnAnimacao) btnAnimacao.style.display = '';
    if (btnModoEdicao) btnModoEdicao.style.display = '';
    
    window.location.hash = '#/ficha';
}