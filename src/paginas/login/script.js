/* ============================================================
   CODEX — Página: Login / Registro
   ============================================================ */

import { registrar, entrar } from '../../servicos/autenticacao/autenticacao.js';
import { mostrarNotificacao } from '../../componentes/notificacoes/notificacoes.js';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../servicos/firebase/config.js';

let refs = null;

export function montarPagina(container) {
    const pagina = container.querySelector('#pagina-login');
    if (!pagina) return;

    refs = {
        tabLogin: pagina.querySelector('#tab-login'),
        tabRegister: pagina.querySelector('#tab-register'),
        formLogin: pagina.querySelector('#form-login'),
        formRegister: pagina.querySelector('#form-register')
    };

    if (pagina.dataset.eventosAtivos !== 'true') {
        ativarEventos(pagina);
        pagina.dataset.eventosAtivos = 'true';
    }
}

export function desmontarPagina() {
    refs = null;
}

function ativarEventos(pagina) {
    function alternarAba(mostrarLogin) {
        if (mostrarLogin) {
            refs.tabLogin.classList.add('active');
            refs.tabRegister.classList.remove('active');
            refs.formLogin.classList.add('active');
            refs.formRegister.classList.remove('active');
        } else {
            refs.tabRegister.classList.add('active');
            refs.tabLogin.classList.remove('active');
            refs.formRegister.classList.add('active');
            refs.formLogin.classList.remove('active');
        }
    }

    refs.tabLogin.addEventListener('click', () => alternarAba(true));
    refs.tabRegister.addEventListener('click', () => alternarAba(false));

    // --- REGISTRO ---
    const btnSubmitRegistro = refs.formRegister.querySelector('button[type="submit"]');
    btnSubmitRegistro.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = pagina.querySelector('#reg-email').value.trim();
        const senha = pagina.querySelector('#reg-password').value;
        const nome = pagina.querySelector('#reg-name').value.trim();
        
        if (!emailValido(email)) {
            mostrarNotificacao('E-mail Inválido', 'Por favor, digite um e-mail válido (ex: nome@dominio.com).', 'erro');
            return;
        }
        if (senha.length < 6) {
            mostrarNotificacao('Senha Curta', 'A senha deve ter no mínimo 6 caracteres.', 'aviso');
            return;
        }

        try {
            // 1. Cria a conta no Firebase Auth
            const credencial = await registrar(email, senha);
            const user = credencial.user;

            // 2. Cria o documento no Firestore usando o UID gerado pelo Auth
            await setDoc(doc(db, 'usuarios', user.uid), {
                nome: nome || email.split('@')[0],
                email: email,
                fotoUrl: ""
            });

            refs.formRegister.reset();
            mostrarNotificacao('Conta Criada!', 'Sua conta foi criada com sucesso. Bem-vindo ao Codex!', 'sucesso');
            setTimeout(() => { window.location.hash = '#/perfil'; }, 1500);
        } catch (erro) {
            tratarErroFirebase(erro, 'registro');
        }
    });

    // --- LOGIN ---
    const btnSubmitLogin = refs.formLogin.querySelector('button[type="submit"]');
    btnSubmitLogin.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = pagina.querySelector('#login-email').value.trim();
        const senha = pagina.querySelector('#login-password').value;

        if (!emailValido(email)) {
            mostrarNotificacao('E-mail Inválido', 'Por favor, digite um e-mail válido.', 'erro');
            return;
        }

        try {
            await entrar(email, senha);
            refs.formLogin.reset();
            mostrarNotificacao('Bem-vindo!', 'Login realizado com sucesso.', 'sucesso');
            setTimeout(() => { window.location.hash = '#/perfil'; }, 1000);
        } catch (erro) {
            tratarErroFirebase(erro, 'login');
        }
    });
}

/* ============================================================
   FUNÇÕES AUXILIARES
   ============================================================ */
function emailValido(email) {
    // Regex básica para validar e-mail
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function tratarErroFirebase(erro, contexto) {
    console.error("Erro no " + contexto + ":", erro);
    
    // Dicionário de erros do Firebase traduzidos para o usuário
    const mensagens = {
        'auth/email-already-in-use': 'Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.',
        'auth/weak-password': 'A senha é muito fraca. Use pelo menos 6 caracteres, misturando letras e números.',
        'auth/invalid-email': 'O formato do e-mail está incorreto. Verifique se digitou corretamente.',
        'auth/invalid-credential': 'E-mail ou senha incorretos. Verifique os dados e tente novamente.',
        'auth/wrong-password': 'A senha está incorreta. Verifique e tente novamente.',
        'auth/user-not-found': 'Não encontramos uma conta com este e-mail. Que tal criar uma nova conta?',
        'auth/too-many-requests': 'Muitas tentativas sem sucesso. Aguarde alguns minutos antes de tentar novamente.',
        'auth/network-request-failed': 'Falha de conexão com a internet. Verifique sua rede e tente novamente.'
    };

    const msg = mensagens[erro.code] || 'Ocorreu um erro inesperado. Por favor, tente novamente mais tarde.';
    
    mostrarNotificacao('Ops, algo deu errado', msg, 'erro');
}