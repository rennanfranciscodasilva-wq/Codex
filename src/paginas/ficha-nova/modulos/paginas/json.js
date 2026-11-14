/* ============================================================
   MÓDULO: IMPORTAR / EXPORTAR JSON (Ficha Nova)
   ============================================================ */

import { 
    estado, 
    salvarEstado, 
    getPaginaAtiva,
    estaEmModoEdicao
} from './estado.js';

let carregarConteudoCallback = null;
let renderizarMenuCallback = null;

export function configurarJSON(carregarConteudo, renderizarMenu) {
    carregarConteudoCallback = carregarConteudo;
    renderizarMenuCallback = renderizarMenu;

    const btnExportar = document.querySelector('#btn-exportar-ficha');
    const btnImportar = document.querySelector('#btn-importar-ficha');

    if (!btnExportar || !btnImportar) return;

    // Remove listeners antigos (clone)
    const novoExport = btnExportar.cloneNode(true);
    btnExportar.parentNode.replaceChild(novoExport, btnExportar);
    
    const novoImport = btnImportar.cloneNode(true);
    btnImportar.parentNode.replaceChild(novoImport, btnImportar);

    novoExport.addEventListener('click', (e) => {
        e.preventDefault();
        const pagAtiva = getPaginaAtiva();
        let nomeArquivo = "Ficha de Personagem";
        if (pagAtiva && pagAtiva.nome) {
            nomeArquivo = pagAtiva.nome.replace(/[\\/:*?"<>|]/g, "").trim();
        }

        const dados = {
            app: 'CODEX', versao: '1.0', data: new Date().toISOString(),
            paginas: estado.paginas, paginaAtivaId: estado.paginaAtivaId
        };
        const jsonString = JSON.stringify(dados, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nomeArquivo}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    novoImport.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation(); 
        const inputFile = document.createElement('input');
        inputFile.type = 'file';
        inputFile.accept = '.json';
        
        inputFile.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const dados = JSON.parse(ev.target.result);
                    if (!dados.paginas || !Array.isArray(dados.paginas)) {
                        return alert("Arquivo JSON inválido.");
                    }
                    if (confirm("Deseja substituir a ficha atual por este arquivo?")) {
                        estado.paginas = dados.paginas;
                        estado.paginaAtivaId = dados.paginaAtivaId || dados.paginas[0].id;
                        salvarEstado();
                        if (renderizarMenuCallback) renderizarMenuCallback();
                        if (carregarConteudoCallback) carregarConteudoCallback();
                        alert("Ficha importada com sucesso!");
                    }
                } catch (err) {
                    alert("Erro ao ler o JSON: " + err.message);
                }
            };
            reader.readAsText(file);
        });
        inputFile.click();
    });
}