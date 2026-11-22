/* ============================================================
   CODEX — Wizard: Finalizar - SINGLE SLOT
   ============================================================ */

import { abrirDialogo, mostrarAviso } from '../../../../componentes/dialogos/dialogos.js';
import { armazenamentoBiblioteca, validarNomeNaConta } from '../../../../servicos/armazenamento/biblioteca.js';
import { estado, gerarId } from '../paginas/estado.js';
import { excluirRascunho, salvarRascunho } from './rascunho.js';

export function capturarCampoAtual(sistemaEmCriacao) {
    const campo = sistemaEmCriacao.campoAtual;
    if (!campo) return;
    if (!campo.blocos || campo.blocos.length === 0) return;

    const jaCapturado = sistemaEmCriacao.campos.some(c => c.id === campo.id);
    if (jaCapturado) return;

    sistemaEmCriacao.campos.push({
        ...JSON.parse(JSON.stringify(campo)),
        paginaDestino: estado.paginaAtivaId
    });
}

export async function executarFinalizar(sistemaEmCriacao, refs) {
    const rota = window.location.hash;
    if (refs.finalizando) return;
    if (!sistemaEmCriacao.campos.length && !sistemaEmCriacao.campoAtual?.blocos?.length) {
        return mostrarAviso('Adicione pelo menos um campo com blocos antes de finalizar o modelo.');
    }
    refs.finalizando = true;
    try {
        await validarNomeNaConta('codex_sistemas', { nome: sistemaEmCriacao.nome });
    } catch (erro) {
        if (erro.code !== 'backup/nome-ocupado') return mostrarAviso('Não foi possível conferir o nome do sistema.');
        const label = document.createElement('label');
        label.className = 'codex-dialogo-campos';
        label.textContent = 'Novo nome do sistema';
        const input = document.createElement('input');
        input.value = sistemaEmCriacao.nome;
        input.autofocus = true;
        label.append(input);
        const nome = await abrirDialogo({ titulo: 'Nome já utilizado', mensagem: erro.message,
            conteudo: label, confirmar: 'Usar este nome', ler: () => input.value.trim() || null });
        if (nome && window.location.hash === rota) {
            sistemaEmCriacao.nome = nome;
            refs.inputNome.value = nome;
            salvarRascunho();
        }
        return;
    } finally {
        refs.finalizando = false;
    }
    if (window.location.hash !== rota || !refs.pagina.isConnected) return;
    capturarCampoAtual(sistemaEmCriacao);
    
    if (sistemaEmCriacao.campos.length === 0) {
        return mostrarAviso('Adicione pelo menos um campo com blocos antes de finalizar.');
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

    const idSistema = gerarId('sist_');

    // 1. Salva o MOLDE do sistema
    const sistemasSalvos = JSON.parse(armazenamentoBiblioteca.getItem('codex_sistemas') || '[]');
    sistemasSalvos.push({
        id: idSistema,
        criadoEm: Date.now(),
        nome: sistemaEmCriacao.nome,
        descricao: sistemaEmCriacao.descricao,
        imagemCapa: sistemaEmCriacao.imagemCapa,
        imagemAjustes: sistemaEmCriacao.imagemAjustes,
        layout: estruturaLayout,
        naNuvem: false
    });
    armazenamentoBiblioteca.setItem('codex_sistemas', JSON.stringify(sistemasSalvos));
    excluirRascunho();

    localStorage.removeItem('codex_wizard_novo_sistema');
    localStorage.removeItem('codex_abrir_wizard');
    
    refs.overlay.classList.add('hidden');
    refs.overlay.classList.remove('wizard-modo-editor');
    refs.pagina.classList.remove('wizard-ativo', 'modo-edicao');

    const btnAnimacao = refs.pagina.querySelector('#btn-toggle-animacao');
    const btnModoEdicao = refs.pagina.querySelector('#btn-modo-edicao');
    if (btnAnimacao) btnAnimacao.style.display = '';
    if (btnModoEdicao) btnModoEdicao.style.display = '';
    
    window.location.hash = '#/ficha/personagens?' + new URLSearchParams({ id: idSistema });
}
