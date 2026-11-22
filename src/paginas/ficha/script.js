/* ============================================================
   CODEX — Página: Ficha (seleção de sistema)
   ============================================================ */
import {
    armazenamentoBiblioteca, copiarBibliotecaLocal, excluirModeloComFichas, prepararBiblioteca,
    temBibliotecaLocalParaCopiar
} from '../../servicos/armazenamento/biblioteca.js';

let refs = null;

export async function montarPagina(container) {
    const rota = window.location.hash;
    await prepararBiblioteca();
    if (window.location.hash !== rota || !container.isConnected) return;
    const pagina = container.querySelector('#pagina-ficha');
    if (!pagina) return;

    refs = {
        pagina,
        containerCards: pagina.querySelector('#ficha-cards-container')
    };

    renderizarSistemas();
}

export function desmontarPagina() {
    refs = null;
}

function renderizarSistemas() {
    refs.containerCards.innerHTML = `
        <a href="#" class="ficha-card" id="card-nova-ficha">
            <div class="ficha-card-icon" style="border-style: dashed;">
                <i class="fas fa-plus"></i>
            </div>
            <h3 class="ficha-card-title">Criar modelo</h3>
            <p class="ficha-card-desc">
                Crie um sistema do zero, personalizando cada atributo.
            </p>
        </a>
    `;

    const cardNova = refs.containerCards.querySelector('#card-nova-ficha');
    if (cardNova) {
        cardNova.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.hash = '#/ficha/nova';
        });
    }

    if (temBibliotecaLocalParaCopiar()) {
        const copiar = document.createElement('button');
        copiar.type = 'button';
        copiar.className = 'btn-secondary';
        copiar.textContent = 'Copiar fichas e modelos deste navegador para minha conta';
        copiar.onclick = () => {
            if (!window.confirm('Copiar os dados locais para a conta conectada?')) return;
            copiarBibliotecaLocal();
            renderizarSistemas();
        };
        refs.containerCards.appendChild(copiar);
    }

    let sistemas;
    try {
        sistemas = JSON.parse(armazenamentoBiblioteca.getItem('codex_sistemas') || '[]');
        if (!Array.isArray(sistemas)) throw new TypeError('Lista de sistemas inválida');
    } catch (erro) {
        console.error('[ficha] falha ao ler os sistemas salvos:', erro);
        const aviso = document.createElement('p');
        aviso.setAttribute('role', 'status');
        aviso.textContent = 'Não foi possível carregar os sistemas salvos neste navegador.';
        refs.containerCards.prepend(aviso);
        return;
    }

    sistemas.filter(sist => sist && typeof sist === 'object' && sist.id != null).forEach(sist => {
        const card = document.createElement('a');
        card.href = '#'; // O href evita que o navegador recarregue, mas o clique será tratado abaixo
        card.className = 'ficha-card';
        card.style.position = 'relative';
        
        const iconeStatus = sist.naNuvem 
            ? '<i class="fas fa-cloud" style="color: #4CAF50; margin-left: 5px;" title="Salvo na Nuvem"></i>'
            : '<i class="fas fa-desktop" style="color: #888; margin-left: 5px;" title="Salvo no Computador"></i>';

        card.innerHTML = `
            <button class="btn-deletar-sistema" title="Excluir Sistema" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: #ff5252; font-size: 1.2rem; cursor: pointer; z-index: 10;">
                <i class="fas fa-times"></i>
            </button>
            <div class="ficha-card-icon" style="overflow: hidden; padding: 0;">
                <i class="fas fa-book-sparkles"></i>
            </div>
            <h3 class="ficha-card-title" style="display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                ${iconeStatus}
            </h3>
            <p class="ficha-card-desc"></p>
        `;
        card.querySelector('.ficha-card-title').prepend(document.createTextNode(sist.nome));
        card.querySelector('.ficha-card-desc').textContent = sist.descricao || 'Sistema customizado.';
        if (sist.imagemCapa) {
            const icone = card.querySelector('.ficha-card-icon');
            const img = document.createElement('img');
            const { zoom = 0.5, posX = 0, posY = 0 } = sist.imagemAjustes || {};
            icone.style.position = 'relative';
            img.src = sist.imagemCapa;
            img.alt = '';
            img.style.cssText = 'position:absolute;top:50%;left:50%;width:100%;height:100%;object-fit:contain;transition:transform 0.3s ease';
            img.style.transform = `translate(-50%, -50%) translate(${posX}%, ${posY}%) scale(${zoom})`;
            icone.replaceChildren(img);
        }

        // --- A CORREÇÃO ESTÁ AQUI: Redirecionamento manual com o ID ---
        card.addEventListener('click', (e) => {
            // Se o clique foi no botão de excluir, não redireciona
            if (e.target.closest('.btn-deletar-sistema')) return;
            
            e.preventDefault();
            e.stopPropagation();
            
            // Redireciona para a tela de personagens passando o ID do sistema
            window.location.hash = `#/ficha/personagens?id=${sist.id}`;
        });

        const btnDel = card.querySelector('.btn-deletar-sistema');
        btnDel.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm(`Excluir o modelo "${sist.nome}" e todos os personagens criados a partir dele?`)) {
                excluirModeloComFichas(sist.id);
                renderizarSistemas();
            }
        });

        refs.containerCards.appendChild(card);
    });
}
