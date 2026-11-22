import { observarAutenticacao, consultarEmailConfirmado, enviarVerificacao, segundosParaReenviar } from '../../servicos/autenticacao/autenticacao.js';

let limparPagina;

export function montarPagina(container) {
    const pagina = container.querySelector('#pagina-confirmar-email');
    const endereco = pagina.querySelector('.confirmacao-endereco');
    const status = pagina.querySelector('.confirmacao-status');
    const acoes = pagina.querySelector('.confirmacao-acoes');
    const reenviar = pagina.querySelector('.confirmacao-reenviar');
    const consultar = pagina.querySelector('.confirmacao-consultar');
    const continuar = pagina.querySelector('.confirmacao-continuar');
    const eventos = new AbortController();
    let usuario;
    let ocupado = false;

    function atualizarBotoes() {
        acoes.hidden = !usuario?.email || usuario.emailVerified;
        const segundos = usuario ? segundosParaReenviar(usuario.uid) : 0;
        reenviar.disabled = ocupado || segundos > 0;
        consultar.disabled = ocupado;
        reenviar.textContent = segundos ? `Reenviar em ${segundos} s` : 'Reenviar e-mail';
    }

    async function verificar({ enviar = false, avisarPendente = true } = {}) {
        if (ocupado || !usuario?.email || usuario.emailVerified) return;
        const atual = usuario;
        const ativo = () => !eventos.signal.aborted && usuario === atual;
        ocupado = true;
        atualizarBotoes();
        if (enviar) status.textContent = 'Preparando o e-mail de confirmação…';
        try {
            const confirmado = await consultarEmailConfirmado(atual);
            if (!ativo()) return;
            if (confirmado) {
                status.textContent = 'E-mail confirmado com sucesso.';
            } else if (enviar) {
                const enviado = await enviarVerificacao(atual);
                if (ativo()) {
                    status.textContent = enviado
                        ? 'Enviamos um e-mail de verificação. Abra a mensagem e clique no link para confirmar sua conta.'
                        : 'Já enviamos um e-mail recentemente. Confira sua caixa de entrada e a pasta de spam.';
                }
            } else if (avisarPendente) {
                status.textContent = 'A confirmação ainda está pendente. Abra o link no e-mail e tente novamente.';
            }
        } catch (erro) {
            if (ativo()) {
                status.textContent = erro.code === 'auth/too-many-requests'
                    ? 'O Firebase pediu um intervalo maior. Aguarde antes de tentar novamente.'
                    : 'Não foi possível concluir a solicitação. Tente novamente.';
            }
        } finally {
            if (ativo()) {
                ocupado = false;
                atualizarBotoes();
            }
        }
    }

    const opcoes = { signal: eventos.signal };
    reenviar.addEventListener('click', () => verificar({ enviar: true }), opcoes);
    consultar.addEventListener('click', () => verificar(), opcoes);
    window.addEventListener('focus', () => verificar({ avisarPendente: false }), opcoes);

    const cancelarObservacao = observarAutenticacao(user => {
        usuario = user;
        ocupado = false;
        endereco.textContent = user?.email || '';
        continuar.href = user ? '#/perfil' : '#/login';
        continuar.textContent = user ? 'Continuar para o perfil' : 'Entrar';
        atualizarBotoes();
        if (!user?.email) {
            status.textContent = 'Entre na sua conta para confirmar o e-mail.';
        } else if (user.emailVerified) {
            status.textContent = 'Seu e-mail já está confirmado.';
        } else {
            verificar({ enviar: true });
        }
    });
    const relogio = setInterval(atualizarBotoes, 1000);
    limparPagina = () => {
        eventos.abort();
        cancelarObservacao();
        clearInterval(relogio);
    };
}

export function desmontarPagina() {
    limparPagina?.();
    limparPagina = undefined;
}
