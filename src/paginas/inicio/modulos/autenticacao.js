/* ============================================================
   MÓDULO: Autenticação (Login e Registro)
   ============================================================ */

import { registrar, entrar } from '../../../servicos/autenticacao/autenticacao.js';

export function iniciarAutenticacao(refs, callbacks) {
    const { tabLogin, tabRegister, formLogin, formRegister, pagina } = refs;
    const { aoLogarComSucesso } = callbacks;

    function alternarAba(mostrarLogin) {
        if (mostrarLogin) {
            tabLogin.classList.add('active');
            tabRegister.classList.remove('active');
            formLogin.classList.add('active');
            formRegister.classList.remove('active');
        } else {
            tabRegister.classList.add('active');
            tabLogin.classList.remove('active');
            formRegister.classList.add('active');
            formLogin.classList.remove('active');
        }
    }

    tabLogin.addEventListener('click', () => alternarAba(true));
    tabRegister.addEventListener('click', () => alternarAba(false));

    // --- Registro ---
    const btnSubmitRegistro = formRegister.querySelector('button[type="submit"]');
    btnSubmitRegistro.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = pagina.querySelector('#reg-email').value;
        const senha = pagina.querySelector('#reg-password').value;
        const nome = pagina.querySelector('#reg-name').value;

        try {
            await registrar(email, senha);
            formRegister.reset();
            aoLogarComSucesso(nome || email.split('@')[0]); 
        } catch (erro) {
            console.error("Erro no registro:", erro);
            if (erro.code === 'auth/email-already-in-use') alert("Este e-mail já está cadastrado.");
            else if (erro.code === 'auth/weak-password') alert("A senha deve ter no mínimo 6 caracteres.");
            else if (erro.code === 'auth/invalid-email') alert("Formato de e-mail inválido.");
            else alert("Erro ao criar conta: " + erro.message);
        }
    });

    // --- Login ---
    const btnSubmitLogin = formLogin.querySelector('button[type="submit"]');
    btnSubmitLogin.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const email = pagina.querySelector('#login-email').value;
        const senha = pagina.querySelector('#login-password').value;

        try {
            await entrar(email, senha);
            formLogin.reset();
            aoLogarComSucesso(email.split('@')[0]);
        } catch (erro) {
            console.error("Erro no login:", erro);
            if (erro.code === 'auth/invalid-credential' || erro.code === 'auth/wrong-password' || erro.code === 'auth/user-not-found') {
                alert("E-mail ou senha incorretos.");
            } else {
                alert("Erro ao entrar: " + erro.message);
            }
        }
    });

    return {
        resetarFormularios() {
            formLogin.reset();
            formRegister.reset();
            alternarAba(true);
        }
    };
}