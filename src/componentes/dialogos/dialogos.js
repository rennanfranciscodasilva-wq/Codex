import './dialogos.css';
import { areaDasConfirmacoes, definirPausaDeConfirmacoes, fimDaPausa } from './confirmacoes.js';

export function abrirDialogo({ titulo, mensagem, conteudo, confirmar = 'Confirmar', cancelar = true, ler }) {
    if (document.querySelector('.codex-dialogo[open]')) return Promise.resolve(null);
    const dialogo = document.createElement('dialog');
    dialogo.className = 'codex-dialogo';
    dialogo.setAttribute('aria-labelledby', 'codex-dialogo-titulo');
    dialogo.innerHTML = `
        <form novalidate>
            <h2 id="codex-dialogo-titulo"></h2>
            <p class="codex-dialogo-mensagem" hidden></p>
            <div class="codex-dialogo-conteudo"></div>
            <div class="codex-dialogo-acoes">
                <button type="button" class="btn-secondary" data-cancelar>Cancelar</button>
                <button type="submit" class="btn-primary"></button>
            </div>
        </form>`;
    dialogo.querySelector('h2').textContent = titulo;
    const texto = dialogo.querySelector('.codex-dialogo-mensagem');
    if (mensagem) {
        texto.hidden = false;
        texto.textContent = mensagem;
    }
    if (conteudo) dialogo.querySelector('.codex-dialogo-conteudo').append(conteudo);
    const botaoCancelar = dialogo.querySelector('[data-cancelar]');
    botaoCancelar.hidden = !cancelar;
    if (cancelar && (!conteudo || conteudo.classList.contains('codex-dialogo-pausar'))) botaoCancelar.autofocus = true;
    botaoCancelar.onclick = () => dialogo.close();
    dialogo.querySelector('[type="submit"]').textContent = confirmar;

    return new Promise(resolve => {
        let resultado = null;
        dialogo.querySelector('form').onsubmit = evento => {
            evento.preventDefault();
            resultado = ler ? ler() : true;
            if (resultado !== null) dialogo.close();
        };
        const fechar = () => dialogo.close();
        window.addEventListener('hashchange', fechar);
        dialogo.addEventListener('close', () => {
            window.removeEventListener('hashchange', fechar);
            dialogo.remove();
            resolve(resultado);
        }, { once: true });
        document.body.append(dialogo);
        dialogo.showModal();
    });
}

async function abrirDialogoPausavel(opcoes, pausavel) {
    if (!pausavel) return abrirDialogo(opcoes);
    const area = areaDasConfirmacoes();
    if (fimDaPausa(area)) return true;

    const rotulo = document.createElement('label');
    rotulo.className = 'codex-dialogo-pausar';
    const caixa = document.createElement('input');
    caixa.type = 'checkbox';
    rotulo.append(caixa, ' Pausar avisos e confirmações desta área até meia-noite');
    const resultado = await abrirDialogo({ ...opcoes, conteudo: rotulo });
    if (resultado && caixa.checked) definirPausaDeConfirmacoes(area, true);
    return resultado;
}

export function confirmarAcao(mensagem, { pausavel = false } = {}) {
    return abrirDialogoPausavel({ titulo: 'Confirmar ação', mensagem }, pausavel);
}

export function mostrarAviso(mensagem, { pausavel = false } = {}) {
    return abrirDialogoPausavel({ titulo: 'Codex', mensagem, confirmar: 'Entendi', cancelar: false }, pausavel);
}
