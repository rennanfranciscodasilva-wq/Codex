/* ============================================================
   CODEX — Página: Personagens (Lista por Sistema)
   ============================================================ */

export function montarPagina(container) {
    console.log("🐛 [PERSONAGENS] montarPagina chamada");
    
    // LÊ O ID DIRETAMENTE DA URL
    const hashCompleto = window.location.hash.replace(/^#/, '');
    const queryString = hashCompleto.split('?')[1] || '';
    const params = new URLSearchParams(queryString);
    const idSistema = params.get('id'); 

    console.log("🐛 [PERSONAGENS] idSistema recebido da URL:", idSistema);

    if (!idSistema) {
        console.warn("🐛 [PERSONAGENS] Nenhum idSistema encontrado na URL.");
        alert("Nenhum sistema selecionado.");
        window.location.hash = '#/ficha'; 
        return;
    }

    const sistemas = JSON.parse(localStorage.getItem('codex_sistemas') || '[]');
    const sistema = sistemas.find(s => s.id === idSistema);

    if (!sistema) {
        console.warn("🐛 [PERSONAGENS] Sistema não encontrado no localStorage:", idSistema);
        alert("Sistema não encontrado no armazenamento local.");
        window.location.hash = '#/ficha';
        return;
    }

    console.log("🐛 [PERSONAGENS] Sistema encontrado:", sistema.nome);

    const paginaEl = container.querySelector('#pagina-personagens') || container;

    const tituloEl = paginaEl.querySelector('#titulo-sistema-personagens');
    const descEl = paginaEl.querySelector('#descricao-sistema-personagens');
    if (tituloEl) tituloEl.textContent = `Personagens: ${sistema.nome}`;
    if (descEl) descEl.textContent = sistema.descricao || '';

    renderizarListaPersonagens(paginaEl, idSistema, sistema);

    // Botão Voltar (Recarrega a página para limpar o cache)
    const btnVoltar = paginaEl.querySelector('#btn-voltar-sistemas');
    if (btnVoltar) {
        btnVoltar.onclick = () => {
            window.location.href = `${window.location.origin}${window.location.pathname}#/ficha`;
            window.location.reload();
        };
    }

    // Botão Novo Personagem
    const btnNovo = paginaEl.querySelector('#btn-novo-personagem');
    if (btnNovo) {
        btnNovo.onclick = () => {
            criarNovoPersonagem(idSistema, sistema);
        };
    }
}

function renderizarListaPersonagens(paginaEl, idSistema, sistema) {
    const listaContainer = paginaEl.querySelector('#lista-personagens-container');
    if (!listaContainer) {
        console.error("🐛 [PERSONAGENS] ERRO: #lista-personagens-container não encontrado no HTML!");
        return;
    }

    const todasFichas = JSON.parse(localStorage.getItem('codex_fichas_jogador') || '[]');
    const fichasDoSistema = todasFichas.filter(f => f.sistemaId === idSistema);

    console.log(`🐛 [PERSONAGENS] Encontradas ${fichasDoSistema.length} fichas para este sistema.`);

    listaContainer.innerHTML = '';

    if (fichasDoSistema.length === 0) {
        listaContainer.innerHTML = `
            <div class="msg-sem-personagens">
                Nenhum personagem criado para este sistema ainda.<br>
                Clique em "Criar Novo Personagem" para começar.
            </div>
        `;
        return;
    }

    fichasDoSistema.forEach(ficha => {
        const card = document.createElement('div');
        card.className = 'card-personagem';
        card.innerHTML = `
            <div class="avatar-personagem"><i class="fas fa-user"></i></div>
            <h2 class="nome-personagem"></h2>
            <div class="info-personagem">Criado em: ${new Date(ficha.criadoEm || Date.now()).toLocaleDateString()}</div>
            <button class="btn-excluir-personagem" title="Excluir Personagem"><i class="fas fa-trash"></i></button>
        `;
        card.querySelector('.nome-personagem').textContent = ficha.nomePersonagem || 'Sem Nome';

        card.onclick = (e) => {
            if (e.target.closest('.btn-excluir-personagem')) return; 
            window.location.hash = `#/ficha/ficha-nova?id=${ficha.id}`;
        };

        const btnExcluir = card.querySelector('.btn-excluir-personagem');
        btnExcluir.onclick = (e) => {
            e.stopPropagation();
            if (confirm(`Tem certeza que deseja excluir o personagem "${ficha.nomePersonagem}"?`)) {
                const fichasAtualizadas = todasFichas.filter(f => f.id !== ficha.id);
                localStorage.setItem('codex_fichas_jogador', JSON.stringify(fichasAtualizadas));
                
                const cache = JSON.parse(localStorage.getItem('codex_ficha_dados') || '{}');
                if (cache.idFichaAtual === ficha.id) {
                    localStorage.removeItem('codex_ficha_dados');
                }
                
                renderizarListaPersonagens(paginaEl, idSistema, sistema);
            }
        };

        listaContainer.appendChild(card);
    });
}

function criarNovoPersonagem(idSistema, sistema) {
    const nome = prompt("Digite o nome do novo personagem:");
    if (!nome || !nome.trim()) return;

    const novaFicha = {
        id: 'ficha_' + Date.now().toString() + Math.random().toString(36).substring(2, 6),
        sistemaId: idSistema,
        nomePersonagem: nome.trim(),
        criadoEm: Date.now(),
        dados: JSON.parse(JSON.stringify(sistema.layout)) 
    };

    const fichas = JSON.parse(localStorage.getItem('codex_fichas_jogador') || '[]');
    fichas.push(novaFicha);
    localStorage.setItem('codex_fichas_jogador', JSON.stringify(fichas));

    window.location.hash = `#/ficha/ficha-nova?id=${novaFicha.id}`;
}
