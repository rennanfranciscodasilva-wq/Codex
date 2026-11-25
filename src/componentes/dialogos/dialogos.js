import './dialogos.css';
import { areaDasConfirmacoes, definirPausaDeConfirmacoes, fimDaPausa } from './confirmacoes.js';

export function abrirDialogo({ titulo, mensagem, conteudo, confirmar = 'Confirmar', cancelar = true,
    confirmarDisponivel = true, perigo = false, ler }) {
    if (document.querySelector('.codex-dialogo[open]')) return Promise.resolve(null);
    const dialogo = document.createElement('dialog');
    dialogo.className = 'codex-dialogo';
    if (perigo) dialogo.dataset.perigo = '';
    dialogo.setAttribute('aria-labelledby', 'codex-dialogo-titulo');
    dialogo.innerHTML = `
        <form novalidate>
            <header class="codex-dialogo-topo"><h2 id="codex-dialogo-titulo"></h2></header>
            <div class="codex-dialogo-corpo">
                <p id="codex-dialogo-mensagem" class="codex-dialogo-mensagem" hidden></p>
                <div class="codex-dialogo-conteudo"></div>
                <p class="codex-dialogo-erro codex-dialogo-falha" role="alert" hidden></p>
            </div>
            <div class="codex-dialogo-acoes">
                <button type="button" class="btn-secondary" data-cancelar>Cancelar</button>
                <button type="submit" class="btn-primary"></button>
            </div>
        </form>`;
    dialogo.querySelector('h2').textContent = titulo;
    const texto = dialogo.querySelector('.codex-dialogo-mensagem');
    if (mensagem) {
        dialogo.setAttribute('aria-describedby', texto.id);
        texto.hidden = false;
        texto.textContent = mensagem;
    }
    if (conteudo) dialogo.querySelector('.codex-dialogo-conteudo').append(conteudo);
    const botaoCancelar = dialogo.querySelector('[data-cancelar]');
    botaoCancelar.hidden = !cancelar;
    if (cancelar && (!conteudo || conteudo.classList.contains('codex-dialogo-pausar'))) botaoCancelar.autofocus = true;
    botaoCancelar.onclick = () => dialogo.close();
    const botaoConfirmar = dialogo.querySelector('[type="submit"]');
    botaoConfirmar.textContent = confirmar;
    botaoConfirmar.disabled = !confirmarDisponivel;
    const falha = dialogo.querySelector('.codex-dialogo-falha');
    const viewport = window.visualViewport;
    function ajustarViewport() {
        if (!viewport || viewport.scale !== 1) return;
        dialogo.style.setProperty('--altura-dialogo-visivel', viewport.height + 'px');
        dialogo.style.setProperty('--recuo-dialogo', Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) + 'px');
        dialogo.style.setProperty('--topo-dialogo', viewport.offsetTop + 'px');
    }

    return new Promise(resolve => {
        let resultado = null;
        let processando = false;
        dialogo.querySelector('form').onsubmit = async evento => {
            evento.preventDefault();
            if (botaoConfirmar.disabled) return;
            processando = true;
            falha.hidden = true;
            botaoCancelar.disabled = botaoConfirmar.disabled = true;
            try {
                resultado = ler ? await ler() : true;
                if (resultado !== null && dialogo.open) dialogo.close();
            } catch (erro) {
                console.error('[diálogo] falha ao confirmar:', erro);
                falha.textContent = 'Não foi possível concluir a ação. Tente novamente.';
                falha.hidden = false;
            } finally {
                processando = false;
                botaoCancelar.disabled = botaoConfirmar.disabled = false;
            }
        };
        dialogo.addEventListener('cancel', evento => {
            if (processando) evento.preventDefault();
        });
        const fechar = () => dialogo.close();
        window.addEventListener('hashchange', fechar);
        dialogo.addEventListener('close', () => {
            window.removeEventListener('hashchange', fechar);
            viewport?.removeEventListener('resize', ajustarViewport);
            viewport?.removeEventListener('scroll', ajustarViewport);
            dialogo.remove();
            resolve(resultado);
        }, { once: true });
        document.body.append(dialogo);
        ajustarViewport();
        viewport?.addEventListener('resize', ajustarViewport);
        viewport?.addEventListener('scroll', ajustarViewport);
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

export function confirmarAcao(mensagem, { pausavel = false, confirmar, perigo = false } = {}) {
    return abrirDialogoPausavel({ titulo: 'Confirmar ação', mensagem, confirmar, perigo }, pausavel);
}

export function mostrarAviso(mensagem, { pausavel = false } = {}) {
    return abrirDialogoPausavel({ titulo: 'Codex', mensagem, confirmar: 'Entendi', cancelar: false }, pausavel);
}
