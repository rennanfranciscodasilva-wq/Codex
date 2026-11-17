/* ============================================================
   MÓDULO: Menu Orbital e Dado Central
   ============================================================ */

export function iniciarMenu(refs, callbacks) {
    const { centerDiceBtn, menuOrbit, titulo } = refs;
    const { aoClicarNoDado, aoVoltarAoMenu } = callbacks;

    if (!centerDiceBtn || !menuOrbit) {
        console.warn("[menu.js] Elementos do menu não encontrados na tela.");
        return {
            abrirMenu() {}, fecharMenu() {}
        };
    }

    centerDiceBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        menuOrbit.classList.add('hidden');
        aoClicarNoDado();
    });

    if (titulo) {
        titulo.addEventListener('click', (e) => {
            if (window.location.hash === '#/inicio' || window.location.hash === '') {
                e.preventDefault();
                aoVoltarAoMenu();
            }
        });
    }

    return {
        abrirMenu() { menuOrbit.classList.remove('hidden'); },
        fecharMenu() { menuOrbit.classList.add('hidden'); }
    };
}