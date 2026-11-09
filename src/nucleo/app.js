/* ============================================================
   CODEX — Ponto de Entrada do Núcleo
   Importa o sistema visual, inicializa roteador e navegação.
   ============================================================ */

// 1. Sistema visual (CSS global)
import '../sistema-visual/index.css';

// 2. Núcleo
import { iniciarRoteador } from './roteador.js';
import { iniciarNavegacao } from './navegacao.js';
import { observarEstado } from './estado.js';

/**
 * Inicializa o Codex.
 */
function iniciarCodex() {
    const container = document.getElementById('app');
    if (!container) {
        console.error('[app] #app não encontrado no index.html');
        return;
    }

    // Ativa navegação global (cliques em [data-rota])
    iniciarNavegacao();

    // Ativa roteador (monta a página inicial)
    iniciarRoteador(container);

    // Log de mudanças de rota (útil em desenvolvimento)
    observarEstado((estado) => {
        if (import.meta.env.DEV) {
            console.log('[codex] rota:', estado.rotaAtual, '| usuário:', estado.usuario?.nome || '—');
        }
    });

    console.log('%cCodex iniciado ⚔', 'color:#d4af37;font-weight:bold;font-size:14px;');
}

// Executa quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarCodex);
} else {
    iniciarCodex();
}