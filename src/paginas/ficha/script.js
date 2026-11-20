/* ============================================================
   CODEX — Página: Ficha (seleção de sistema)
   ============================================================ */

let refs = null;

export async function montarPagina(container) {
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
            <h3 class="ficha-card-title">Nova Ficha</h3>
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
            localStorage.setItem('codex_abrir_wizard', 'true');
            window.location.hash = '#/ficha/nova';
        });
    }

    const sistemas = JSON.parse(localStorage.getItem('codex_sistemas') || '[]');

    sistemas.forEach(sist => {
        const card = document.createElement('a');
        card.href = '#';
        card.className = 'ficha-card';
        card.style.position = 'relative';
        card.setAttribute('data-rota', `/ficha/personagens?id=${sist.id}`);
        
        const iconeStatus = sist.naNuvem 
            ? '<i class="fas fa-cloud" style="color: #4CAF50; margin-left: 5px;" title="Salvo na Nuvem"></i>'
            : '<i class="fas fa-desktop" style="color: #888; margin-left: 5px;" title="Salvo no Computador"></i>';

        let conteudoIcone = `<i class="fas fa-book-sparkles"></i>`;
        if (sist.imagemCapa) {
            const zoom = sist.imagemAjustes ? sist.imagemAjustes.zoom : 0.5;
            const x = sist.imagemAjustes ? sist.imagemAjustes.posX : 0;
            const y = sist.imagemAjustes ? sist.imagemAjustes.posY : 0;
            
            const transform = `translate(-50%, -50%) translate(${x}%, ${y}%) scale(${zoom})`;
            
            conteudoIcone = `
                <div style="width: 100%; height: 100%; position: relative; overflow: hidden; border-radius: 50%;">
                    <img src="${sist.imagemCapa}" 
                         style="position: absolute; top: 50%; left: 50%; width: 100%; height: 100%; object-fit: contain; transform: ${transform}; transition: transform 0.3s ease;">
                </div>
            `;
        }

        card.innerHTML = `
            <button class="btn-deletar-sistema" data-id="${sist.id}" title="Excluir Sistema" style="position: absolute; top: 10px; right: 10px; background: transparent; border: none; color: #ff5252; font-size: 1.2rem; cursor: pointer; z-index: 10;">
                <i class="fas fa-times"></i>
            </button>
            <div class="ficha-card-icon" style="overflow: hidden; padding: 0;">
                ${conteudoIcone}
            </div>
            <h3 class="ficha-card-title" style="display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
                ${sist.nome} ${iconeStatus}
            </h3>
            <p class="ficha-card-desc">${sist.descricao || 'Sistema customizado.'}</p>
        `;

        const btnDel = card.querySelector('.btn-deletar-sistema');
        btnDel.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm(`Deseja realmente excluir o sistema "${sist.nome}"?`)) {
                const sistemasAtuais = JSON.parse(localStorage.getItem('codex_sistemas') || '[]');
                const novosSistemas = sistemasAtuais.filter(s => s.id !== sist.id);
                localStorage.setItem('codex_sistemas', JSON.stringify(novosSistemas));
                renderizarSistemas();
            }
        });

        refs.containerCards.appendChild(card);
    });
}