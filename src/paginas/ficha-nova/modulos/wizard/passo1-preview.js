import { aplicarAjustes, configurarPreviaImagem, criarAjustesImagem } from '../../../../componentes/imagem/ajustes.js';

export function configurarPreviewImagem(refs, sistemaEmCriacao) {
    const painel = criarAjustesImagem(refs.controls, ajustes => {
        sistemaEmCriacao.imagemAjustes = ajustes;
        aplicarAjustes(refs.previewImg, ajustes);
    }, 0.5);

    const atualizar = configurarPreviaImagem(
        refs.inputImagem, refs.previewWrapper, refs.previewImg, refs.controls, refs.previewStatus
    );

    function alterarEndereco() {
        const anterior = sistemaEmCriacao.imagemCapa;
        sistemaEmCriacao.imagemCapa = atualizar();
        if (anterior !== sistemaEmCriacao.imagemCapa) {
            sistemaEmCriacao.imagemAjustes = painel.definir();
            aplicarAjustes(refs.previewImg, sistemaEmCriacao.imagemAjustes);
        }
    }
    refs.inputImagem.addEventListener('input', alterarEndereco);
    refs.inputImagem.addEventListener('change', alterarEndereco);

    return () => {
        refs.inputImagem.value = sistemaEmCriacao.imagemCapa;
        atualizar();
        aplicarAjustes(refs.previewImg, painel.definir(sistemaEmCriacao.imagemAjustes));
    };
}
