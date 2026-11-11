/* ============================================================
   MÓDULO: COMPARTILHAR (Importar / Exportar JSON)
   ============================================================ */

import { estado, salvarEstado, renderizarPaineis, renderizarMenu, estaEmModoEdicao } from './paginas.js';

export function configurarCompartilhar(carregarConteudoCallback) {
    const btnExportar = document.querySelector('#btn-exportar-ficha');
    const btnImportar = document.querySelector('#btn-importar-ficha');
    const inputFile = document.querySelector('#input-importar-json');

    if (!btnExportar || !btnImportar || !inputFile) return;

    // --- EXPORTAR ---
    btnExportar.addEventListener('click', () => {
        if (!estaEmModoEdicao()) return;
        
        // Empacota os dados
        const dadosExportacao = {
            app: 'CODEX',
            versao: '1.0',
            data: new Date().toISOString(),
            paginas: estado.paginas,
            paginaAtivaId: estado.paginaAtivaId
        };

        const stringJson = JSON.stringify(dadosExportacao, null, 2);
        const blob = new Blob([stringJson], { type: 'application/json' });
        
        // Cria link temporário para download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ficha-codex-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // --- IMPORTAR ---
    btnImportar.addEventListener('click', () => {
        if (!estaEmModoEdicao()) return;
        inputFile.click();
    });

    inputFile.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const dados = JSON.parse(ev.target.result);
                
                // Validação básica
                if (!dados.paginas || !Array.isArray(dados.paginas)) {
                    return alert("Arquivo JSON inválido: estrutura de páginas não encontrada.");
                }

                if (confirm("Atenção: Importar este arquivo apagará a ficha atual. Deseja continuar?")) {
                    // Substitui o estado
                    estado.paginas = dados.paginas;
                    estado.paginaAtivaId = dados.paginaAtivaId || dados.paginas[0].id;
                    
                    salvarEstado();
                    renderizarMenu();
                    if (carregarConteudoCallback) carregarConteudoCallback();
                    alert("Ficha importada com sucesso!");
                }
            } catch (err) {
                alert("Erro ao ler o arquivo JSON: " + err.message);
            }
            inputFile.value = ''; // Limpa o input para permitir importar de novo
        };
        reader.readAsText(file);
    });
}