/* ============================================================
   CODEX — Componente: Notificação (Toast)
   ============================================================ */

export function mostrarNotificacao(titulo, mensagem, tipo = 'erro') {
    // Verifica se já existe um container de notificações, se não, cria
    let container = document.getElementById('codex-notificacoes');
    if (!container) {
        container = document.createElement('div');
        container.id = 'codex-notificacoes';
        document.body.appendChild(container);
    }

    // Cria o elemento da notificação
    const toast = document.createElement('div');
    toast.className = `codex-toast toast-${tipo}`;

    // Define o ícone baseado no tipo
    let icone = 'fa-circle-exclamation';
    if (tipo === 'sucesso') icone = 'fa-circle-check';
    if (tipo === 'aviso') icone = 'fa-triangle-exclamation';

    toast.innerHTML = `
        <div class="toast-icon"><i class="fas ${icone}"></i></div>
        <div class="toast-content">
            <h4 class="toast-title"></h4>
            <p class="toast-msg"></p>
        </div>
        <button class="toast-close"><i class="fas fa-times"></i></button>
    `;
    toast.querySelector('.toast-title').textContent = titulo;
    toast.querySelector('.toast-msg').textContent = mensagem;

    container.appendChild(toast);

    // Animação de entrada
    setTimeout(() => toast.classList.add('show'), 10);

    // Função para fechar
    const fechar = () => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300); // Espera a animação terminar
    };

    // Fecha ao clicar no X
    toast.querySelector('.toast-close').addEventListener('click', fechar);

    // Fecha automaticamente após 6 segundos (erros precisam de tempo para ler)
    setTimeout(fechar, 6000);
}
