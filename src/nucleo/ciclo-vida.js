/* ============================================================
   CODEX — Ciclo de Vida das Páginas
   Mantém página + CSS vivos no DOM (escondidos) para evitar FOUC.
   Adiciona animação de transição entre páginas.
   ============================================================ */

import { carregarModulo } from './cache.js';

const DURACAO_TRANSICAO = 450; // ms — deve casar com o CSS

let paginaAtual = null;
let navegacaoEmAndamento = 0;

const cacheDom = new Map();

/**
 * Monta uma página no container principal.
 */
export async function montarPagina({ rota, caminhoHtml, caminhoCss, caminhoJs, container }) {
    const idNavegacao = ++navegacaoEmAndamento;

    // Esconde (com animação) a página atual
    await esconderPaginaAtual();

    if (idNavegacao !== navegacaoEmAndamento) return;

    // ---------- CACHE HIT ----------
    const emCache = cacheDom.get(rota);
    if (emCache) {
        const el = emCache.elemento;

        // Prepara: invisível + escala inicial
        el.style.visibility = 'hidden';
        el.style.display = '';
        el.classList.add('pagina-entrando');
        container.appendChild(el);

        // Reativa eventos (injeta título/rodapé se necessário)
        if (emCache.modulo && typeof emCache.modulo.montarPagina === 'function') {
            await emCache.modulo.montarPagina(el);
        }

        // Força reflow para aplicar o estado inicial
        void el.offsetHeight;

        // Torna visível e remove estado inicial (dispara transição)
        el.style.visibility = '';
        el.classList.remove('pagina-entrando');

        paginaAtual = {
            rota,
            modulo: emCache.modulo,
            container,
            caminhoCss,
            elemento: el
        };
        return;
    }

    // ---------- PRIMEIRA MONTAGEM ----------
    let html;
    try {
        const resposta = await fetch(caminhoHtml);
        if (!resposta.ok) {
            throw new Error(`HTTP ${resposta.status} em ${caminhoHtml}`);
        }
        html = await resposta.text();
    } catch (erro) {
        console.error('[ciclo-vida] falha ao carregar página:', erro);
        if (container) {
            container.innerHTML = `
                <div class="erro-pagina">
                    <i class="fas fa-triangle-exclamation"></i>
                    <h2>Página não encontrada</h2>
                    <p>Não foi possível carregar <code>${caminhoHtml}</code>.</p>
                    <a href="#/inicio" class="btn-primary">Voltar ao Codex</a>
                </div>
            `;
        }
        return;
    }

    if (idNavegacao !== navegacaoEmAndamento) return;

    // Cria wrapper já com estado "entrando"
    const wrapper = document.createElement('div');
    wrapper.className = 'pagina-wrapper pagina-entrando';
    wrapper.dataset.rota = rota;
    wrapper.style.visibility = 'hidden';
    wrapper.innerHTML = html;
    container.appendChild(wrapper);

    // CSS
    if (caminhoCss) {
        await injetarCssEAguardar(caminhoCss);
    }

    // JS
    let modulo = null;
    if (caminhoJs) {
        modulo = await carregarModulo(caminhoJs);
    }

    if (idNavegacao !== navegacaoEmAndamento) {
        wrapper.remove();
        return;
    }

    if (modulo && typeof modulo.montarPagina === 'function') {
        await modulo.montarPagina(wrapper);
    }

    // Força reflow e dispara transição
    void wrapper.offsetHeight;
    wrapper.style.visibility = '';
    wrapper.classList.remove('pagina-entrando');

    cacheDom.set(rota, { elemento: wrapper, modulo, caminhoCss });
    paginaAtual = { rota, modulo, container, caminhoCss, elemento: wrapper };
}

/**
 * Esconde a página atual COM animação (espera terminar).
 */
function esconderPaginaAtual() {
    return new Promise((resolve) => {
        if (!paginaAtual) return resolve();

        const { modulo, elemento } = paginaAtual;

        if (modulo && typeof modulo.desmontarPagina === 'function') {
            try {
                modulo.desmontarPagina();
            } catch (e) {
                console.error('[ciclo-vida] erro em desmontarPagina:', e);
            }
        }

        if (!elemento) {
            paginaAtual = null;
            return resolve();
        }

        // Dispara animação de saída
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
        setTimeout(finalizar, DURACAO_TRANSICAO + 50); // fallback

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

export function rotaAtual() {
    return paginaAtual ? paginaAtual.rota : null;
}

/* ---------- Helpers ---------- */

function injetarCssEAguardar(href) {
    const id = `css-pagina-${href.replace(/\//g, '-')}`;
    const existente = document.getElementById(id);
    if (existente) {
        if (existente.sheet) return Promise.resolve();
        return new Promise((resolve) => {
            existente.addEventListener('load', resolve, { once: true });
            existente.addEventListener('error', resolve, { once: true });
        });
    }

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