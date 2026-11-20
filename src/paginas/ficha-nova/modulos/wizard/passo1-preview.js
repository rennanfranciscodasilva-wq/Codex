/* ============================================================
   CODEX — Wizard: Passo 1 (Preview da Imagem)
   ============================================================ */

export function configurarPreviewImagem(refs, sistemaEmCriacao) {
    // Inicializa os valores padrão
    sistemaEmCriacao.imagemAjustes = { zoom: 0.5, posX: 0, posY: 0 };

    const atualizarPreview = () => {
        if (refs.previewImg.src) {
            // Aplica o zoom e a movimentação
            refs.previewImg.style.transform = `translate(-50%, -50%) translate(${sistemaEmCriacao.imagemAjustes.posX}%, ${sistemaEmCriacao.imagemAjustes.posY}%) scale(${sistemaEmCriacao.imagemAjustes.zoom})`;
        }
    };

    refs.inputImagem.addEventListener('input', (e) => {
        const url = e.target.value.trim();
        sistemaEmCriacao.imagemCapa = url;
        
        if (url) {
            refs.previewWrapper.style.display = 'block';
            refs.controls.style.display = 'flex';
            refs.previewImg.src = url;
            
            // Reseta o zoom e a posição quando uma nova imagem é adicionada
            sistemaEmCriacao.imagemAjustes = { zoom: 0.5, posX: 0, posY: 0 };
            if (refs.sliderZoom) refs.sliderZoom.value = 0.5;
            if (refs.sliderX) refs.sliderX.value = 0;
            if (refs.sliderY) refs.sliderY.value = 0;

            atualizarPreview();
        } else {
            refs.previewWrapper.style.display = 'none';
            refs.controls.style.display = 'none';
            refs.previewImg.src = '';
        }
    });

    refs.sliderZoom.addEventListener('input', (e) => {
        sistemaEmCriacao.imagemAjustes.zoom = parseFloat(e.target.value);
        atualizarPreview();
    });
    
    refs.sliderX.addEventListener('input', (e) => {
        sistemaEmCriacao.imagemAjustes.posX = parseFloat(e.target.value);
        atualizarPreview();
    });
    
    refs.sliderY.addEventListener('input', (e) => {
        sistemaEmCriacao.imagemAjustes.posY = parseFloat(e.target.value);
        atualizarPreview();
    });
}