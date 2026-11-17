/* ============================================================
   CODEX — Página: Login / Registro
   ============================================================ */

import { registrar, entrar } from '../../servicos/autenticacao/autenticacao.js';

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

    // --- Registro ---
    const btnSubmitRegistro = refs.formRegister.querySelector('button[type="submit"]');
    btnSubmitRegistro.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = pagina.querySelector('#reg-email').value;
        const senha = pagina.querySelector('#reg-password').value;
        
        try {
            await registrar(email, senha);
            refs.formRegister.reset();
            window.location.hash = '#/perfil'; // Vai direto pro perfil
        } catch (erro) {
            console.error("Erro no registro:", erro);
            if (erro.code === 'auth/email-already-in-use') alert("Este e-mail já está cadastrado.");
            else if (erro.code === 'auth/weak-password') alert("A senha deve ter no mínimo 6 caracteres.");
            else if (erro.code === 'auth/invalid-email') alert("Formato de e-mail inválido.");
            else alert("Erro ao criar conta: " + erro.message);
        }
    });

    // --- Login ---
    const btnSubmitLogin = refs.formLogin.querySelector('button[type="submit"]');
    btnSubmitLogin.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = pagina.querySelector('#login-email').value;
        const senha = pagina.querySelector('#login-password').value;

        try {
            await entrar(email, senha);
            refs.formLogin.reset();
            window.location.hash = '#/perfil'; // Vai direto pro perfil
        } catch (erro) {
            console.error("Erro no login:", erro);
            if (erro.code === 'auth/invalid-credential' || erro.code === 'auth/wrong-password' || erro.code === 'auth/user-not-found') {
                alert("E-mail ou senha incorretos.");
            } else {
                alert("Erro ao entrar: " + erro.message);
            }
        }
    });
}