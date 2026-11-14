/* ============================================================
   MÓDULO: Perfil do Usuário
   ============================================================ */

import { sair } from '../../../servicos/autenticacao/autenticacao.js';

export function iniciarPerfil(refs, callbacks) {
    const { btnLogout, profileName, profileEmail } = refs;
    const { aoDeslogar } = callbacks;

    // --- Botão de Sair ---
    btnLogout.addEventListener('click', async () => {
        try {
            await sair();
            aoDeslogar();
        } catch (erro) {
            console.error("Erro ao sair:", erro);
            alert("Erro ao sair da conta.");
        }
    });

    return {
        atualizarDadosPerfil(nome, email) {
            profileName.textContent = nome || 'Aventureiro';
            if (profileEmail) profileEmail.textContent = email || '';
        }
    };
}