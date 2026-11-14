/* ============================================================
   MÓDULO: ESTADO GLOBAL (Ficha Nova)
   ============================================================ */

export const MAX_PAGINAS = 10;
export const GRID = 20;
export const PAD_X = 40;
export const PAD_Y = 30;

export let estado = {
    paginas: [],
    paginaAtivaId: null,
    animacaoAtiva: true,
    modoLayout: 'livre'
};

export const areaTransferenciaCodex = { tipo: null, dados: null };

export function gerarId(prefixo) {
    return prefixo + Date.now().toString() + Math.random().toString(36).substring(2, 6);
}

export function salvarEstado() {
    const dados = { 
        paginas: estado.paginas, 
        paginaAtivaId: estado.paginaAtivaId,
        animacaoAtiva: estado.animacaoAtiva,
        modoLayout: estado.modoLayout
    };
    localStorage.setItem('codex_ficha_dados', JSON.stringify(dados));
}

export function getPaginaAtiva() {
    return estado.paginas.find(p => p.id === estado.paginaAtivaId);
}

export function estaEmModoEdicao() {
    const el = document.querySelector('#pagina-ficha-nova');
    return el && el.classList.contains('modo-edicao');
}

export function gerarNomeUnico(nomeBase, lista) {
    if (!lista || lista.length === 0) return nomeBase;
    let nome = nomeBase;
    let count = 1;
    while (lista.some(item => item.titulo === nome || item.nome === nome)) {
        nome = `${nomeBase} ${count}`;
        count++;
    }
    return nome;
}