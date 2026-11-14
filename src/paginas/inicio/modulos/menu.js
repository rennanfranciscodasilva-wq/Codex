/* ============================================================
   MÓDULO: Menu Orbital e Dado Central
   ============================================================ */

export function iniciarMenu(refs, callbacks) {
    const { centerDiceBtn, menuOrbit, titulo, userNameTag } = refs;
    const { aoClicarNoDado, aoVoltarAoMenu } = callbacks;

    // --- Clique no Dado Central ---
    centerDiceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        menuOrbit.classList.add('hidden');
        aoClicarNoDado(); // Avisa o script principal para abrir auth ou perfil
    });

    // --- Clique no Título (Voltar ao Menu) ---
    titulo.addEventListener('click', (e) => {
        if (window.location.hash === '#/inicio' || window.location.hash === '') {
            e.preventDefault();
            aoVoltarAoMenu();
        }
    });

    // --- Funções expostas para o script principal ---
    return {
        abrirMenu() {
            menuOrbit.classList.remove('hidden');
        },
        fecharMenu() {
            menuOrbit.classList.add('hidden');
        },
        atualizarNomeUsuario(nome) {
            if (nome) {
                userNameTag.textContent = nome;
                userNameTag.classList.remove('hidden');
            } else {
                userNameTag.textContent = '';
                userNameTag.classList.add('hidden');
            }
        }
    };
}