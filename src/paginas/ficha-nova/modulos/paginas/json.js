/* ============================================================
   MÓDULO: IMPORTAR / EXPORTAR JSON (Ficha Nova)
   ============================================================ */

import { mostrarAviso } from '../../../../componentes/dialogos/dialogos.js';
import { armazenamentoBiblioteca, prepararBiblioteca } from '../../../../servicos/armazenamento/biblioteca.js';
import { estado } from './estado.js';
import { importarModelo } from './modelo-importado.js';

export function configurarCarregamentoModelo(botao) {
    if (!botao) return;

    const entrada = document.createElement('input');
    entrada.type = 'file';
    entrada.accept = '.json,application/json';
    entrada.hidden = true;
    botao.after(entrada);
    botao.addEventListener('click', () => entrada.click());
    entrada.addEventListener('change', async () => {
        const arquivo = entrada.files[0];
        if (!arquivo) return;
        botao.disabled = true;
        try {
            const texto = await arquivo.text();
            await prepararBiblioteca({ atualizar: true });
            if (!botao.isConnected) return;
            const ficha = importarModelo(JSON.parse(texto), armazenamentoBiblioteca);
            window.location.hash = `#/ficha/ficha-nova?id=${ficha.id}`;
        } catch (erro) {
            mostrarAviso(erro instanceof SyntaxError ? 'O arquivo não contém uma ficha válida do Codex.' : erro.message);
        } finally {
            entrada.value = '';
            botao.disabled = false;
        }
    });
}

export function configurarJSON() {
    configurarCarregamentoModelo(document.querySelector('#btn-importar-ficha'));

    const btnExportar = document.querySelector('#btn-exportar-ficha');

    if (!btnExportar) return;

    // Remove listeners antigos
    const novoExport = btnExportar.cloneNode(true);
    btnExportar.parentNode.replaceChild(novoExport, btnExportar);

    novoExport.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Pega os metadados do sistema do LocalStorage, se existir
        let metadadosSistema = {};
        let layout = estado;
        if (estado.idSistemaAtual) {
            const sistemas = JSON.parse(armazenamentoBiblioteca.getItem('codex_sistemas') || '[]');
            const sist = sistemas.find(s => s.id === estado.idSistemaAtual);
            if (sist) {
                if (estado.editandoModelo) layout = sist.layout;
                metadadosSistema = {
                    nomeSistema: sist.nome,
                    descricaoSistema: sist.descricao,
                    imagemCapa: sist.imagemCapa,
                    imagemAjustes: sist.imagemAjustes
                };
            }
        }

        const dados = {
            app: 'CODEX', 
            versao: '1.0', 
            data: new Date().toISOString(),
            nomeSistema: estado.nomeSistema,
            nomePersonagem: estado.idFichaAtual
                ? JSON.parse(armazenamentoBiblioteca.getItem('codex_fichas_jogador') || '[]')
                    .find(ficha => ficha.id === estado.idFichaAtual)?.nomePersonagem
                : undefined,
            idSistemaAtual: estado.idSistemaAtual,
            paginas: layout.paginas,
            paginaAtivaId: layout.paginaAtivaId,
            animacaoAtiva: layout.animacaoAtiva,
            modoLayout: layout.modoLayout,
            ...metadadosSistema // Adiciona nome, desc, foto do sistema
        };
        
        const jsonString = JSON.stringify(dados, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const nomeArquivo = (estado.nomeSistema || 'Ficha_Codificador').replace(/[\\/:*?"<>|]/g, "").trim();
        const a = document.createElement('a');
        a.href = url;
        a.download = `${nomeArquivo}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}
