/* ============================================================
   CODEX — Ciclo de Vida das Páginas
   ============================================================ */

import { carregarModulo } from './cache.js';
import { criarCabecalho } from '../componentes/cabecalho/cabecalho.js';

const DURACAO_TRANSICAO = 450;

let paginaAtual = null;
let navegacaoEmAndamento = 0;
const cacheDom = new Map();

export async function montarPagina({ rota, carregarHtml, caminhoCss, carregarCss, caminhoJs, importarModulo, container }) {
    const idNavegacao = ++navegacaoEmAndamento;

    // ---- INJEÇÃO DO CABEÇALHO E CONTAINER PRINCIPAL ----
    // [CORREÇÃO DEFINITIVA] Cadeado global na janela para garantir que só exista UM cabeçalho no site inteiro
    if (!window._codexHeaderInjetado) {
        window._codexHeaderInjetado = true;

        // Garante que o container raiz seja um flex column de tela cheia
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.height = '100dvh';
        container.style.width = '100%';
        container.style.overflow = 'hidden';
        container.style.margin = '0';

        const header = criarCabecalho();
        header.classList.add('codex-global-header');
        container.appendChild(header);
        
        const mainContent = document.createElement('div');
        mainContent.id = 'codex-main-content';
        
        mainContent.style.flex = '1';
        mainContent.style.display = 'flex';
        mainContent.style.flexDirection = 'column';
        mainContent.style.position = 'relative';
        mainContent.style.minHeight = '0';
        
        container.appendChild(mainContent);
    }

    const mainContent = document.querySelector('#codex-main-content');

    // Se por algum motivo o mainContent não existir na tela, recria ele
    if (!mainContent) {
        window._codexHeaderInjetado = false;
        return montarPagina({ rota, carregarHtml, caminhoCss, carregarCss, caminhoJs, importarModulo, container });
    }

    await esconderPaginaAtual();

    if (idNavegacao !== navegacaoEmAndamento) return;

    const emCache = cacheDom.get(rota);
    const wrapper = emCache?.elemento ?? document.createElement('div');
    wrapper.classList.add('pagina-wrapper', 'pagina-entrando');
    wrapper.style.display = 'flex';
    wrapper.style.flex = '1';
    wrapper.style.flexDirection = 'column';
    wrapper.style.minHeight = '0';

    let modulo = emCache?.modulo;
    try {
        if (!emCache) {
            const [html, moduloPagina] = await Promise.all([
                carregarHtml(),
                carregarModulo(caminhoJs, importarModulo),
                injetarCss(caminhoCss, carregarCss)
            ]);
            wrapper.innerHTML = html;
            modulo = moduloPagina;
        }

        if (idNavegacao !== navegacaoEmAndamento) return false;
        mainContent.appendChild(wrapper);
        await modulo?.montarPagina?.(wrapper);
    } catch (erro) {
        wrapper.remove();
        if (idNavegacao !== navegacaoEmAndamento) return false;
        cacheDom.delete(rota);
        console.error('[ciclo-vida] falha ao abrir a página:', rota, erro);
        const aviso = document.createElement('section');
        aviso.className = 'screen';
        aviso.innerHTML = '<p role="alert">Não foi possível abrir esta página.</p><button type="button" class="btn-primary">Recarregar página</button>';
        aviso.querySelector('button').addEventListener('click', () => window.location.reload());
        mainContent.appendChild(aviso);
        paginaAtual = { elemento: aviso };
        return false;
    }

    if (idNavegacao !== navegacaoEmAndamento) {
        wrapper.remove();
        return false;
    }

    void wrapper.offsetHeight;
    wrapper.classList.remove('pagina-entrando');

    cacheDom.set(rota, { elemento: wrapper, modulo, caminhoCss });
    paginaAtual = { rota, modulo, container: mainContent, caminhoCss, elemento: wrapper };
    return true;
}

function esconderPaginaAtual() {
    return new Promise((resolve) => {
        if (!paginaAtual) return resolve();
        const { modulo, elemento } = paginaAtual;

        if (modulo && typeof modulo.desmontarPagina === 'function') {
            try { modulo.desmontarPagina(); } catch (e) { console.error(e); }
        }

        if (!elemento) {
            paginaAtual = null;
            return resolve();
        }

        elemento.classList.add('pagina-saindo');

        let finalizado = false;
        const finalizar = () => {
            if (finalizado) return;
            finalizado = true;
            elemento.remove();
            elemento.classList.remove('pagina-saindo');
            resolve();
        };

        elemento.addEventListener('transitionend', finalizar, { once: true });
        setTimeout(finalizar, DURACAO_TRANSICAO + 50);
        paginaAtual = null;
    });
}

export function destruirPagina(rota) {
    const entrada = cacheDom.get(rota);
    if (!entrada) return;
    entrada.elemento.remove();
    if (entrada.caminhoCss) removerCss(entrada.caminhoCss);
    cacheDom.delete(rota);
}

export function rotaAtual() { return paginaAtual ? paginaAtual.rota : null; }

async function injetarCss(caminho, carregarCss) {
    const id = `css-pagina-${caminho.replace(/\//g, '-')}`;
    if (document.getElementById(id)) return;

    const css = await carregarCss();
    if (document.getElementById(id)) return;

    const estilo = document.createElement('style');
    estilo.id = id;
    estilo.textContent = css;
    document.head.appendChild(estilo);
}

function removerCss(href) {
    const id = `css-pagina-${href.replace(/\//g, '-')}`;
    document.getElementById(id)?.remove();
}
