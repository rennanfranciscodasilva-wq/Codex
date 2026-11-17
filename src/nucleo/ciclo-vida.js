/* ============================================================
   CODEX — Ciclo de Vida das Páginas
   ============================================================ */

import { carregarModulo } from './cache.js';
import { criarCabecalho } from '../componentes/cabecalho/cabecalho.js';

const DURACAO_TRANSICAO = 450;

let paginaAtual = null;
let navegacaoEmAndamento = 0;
const cacheDom = new Map();

export async function montarPagina({ rota, caminhoHtml, caminhoCss, caminhoJs, container }) {
    const idNavegacao = ++navegacaoEmAndamento;

    // ---- INJEÇÃO DO CABEÇALHO E CONTAINER PRINCIPAL ----
    // [CORREÇÃO DEFINITIVA] Cadeado global na janela para garantir que só exista UM cabeçalho no site inteiro
    if (!window._codexHeaderInjetado) {
        window._codexHeaderInjetado = true;

        // Garante que o container raiz seja um flex column de tela cheia
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.height = '100vh';
        container.style.width = '100vw';
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
        return montarPagina({ rota, caminhoHtml, caminhoCss, caminhoJs, container });
    }

    await esconderPaginaAtual();

    if (idNavegacao !== navegacaoEmAndamento) return;

    // ---------- CACHE HIT ----------
    const emCache = cacheDom.get(rota);
    if (emCache) {
        const el = emCache.elemento;
        el.style.visibility = 'hidden';
        el.style.display = ''; 
        el.classList.add('pagina-entrando');
        mainContent.appendChild(el);

        if (emCache.modulo && typeof emCache.modulo.montarPagina === 'function') {
            await emCache.modulo.montarPagina(el);
        }

        void el.offsetHeight;
        el.style.visibility = '';
        el.classList.remove('pagina-entrando');

        paginaAtual = { rota, modulo: emCache.modulo, container: mainContent, caminhoCss, elemento: el };
        return;
    }

    // ---------- PRIMEIRA MONTAGEM ----------
    let html;
    try {
        const resposta = await fetch(caminhoHtml);
        if (!resposta.ok) throw new Error(`HTTP ${resposta.status} em ${caminhoHtml}`);
        html = await resposta.text();
    } catch (erro) {
        console.error('[ciclo-vida] falha ao carregar página:', erro);
        return;
    }

    if (idNavegacao !== navegacaoEmAndamento) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'pagina-wrapper pagina-entrando';
    wrapper.dataset.rota = rota;
    wrapper.style.visibility = 'hidden';
    wrapper.innerHTML = html;
    
    wrapper.style.flex = '1';
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.minHeight = '0';

    mainContent.appendChild(wrapper);

    if (caminhoCss) await injetarCssEAguardar(caminhoCss);

    let modulo = null;
    if (caminhoJs) modulo = await carregarModulo(caminhoJs);

    if (idNavegacao !== navegacaoEmAndamento) {
        wrapper.remove();
        return;
    }

    if (modulo && typeof modulo.montarPagina === 'function') {
        await modulo.montarPagina(wrapper);
    }

    void wrapper.offsetHeight;
    wrapper.style.visibility = '';
    wrapper.classList.remove('pagina-entrando');

    cacheDom.set(rota, { elemento: wrapper, modulo, caminhoCss });
    paginaAtual = { rota, modulo, container: mainContent, caminhoCss, elemento: wrapper };
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
            elemento.style.display = 'none';
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

function injetarCssEAguardar(href) {
    const id = `css-pagina-${href.replace(/\//g, '-')}`;
    if (document.getElementById(id)) return Promise.resolve();

    return new Promise((resolve) => {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = href;
        link.addEventListener('load', resolve, { once: true });
        link.addEventListener('error', resolve, { once: true });
        document.head.appendChild(link);
    });
}

function removerCss(href) {
    const id = `css-pagina-${href.replace(/\//g, '-')}`;
    document.getElementById(id)?.remove();
}