/* ============================================================
   MÓDULO: AUTOMAÇÃO (Editor de Fórmulas)
   ============================================================ */

import { estado, getPaginaAtiva } from './paginas.js';

let formulaAtual = []; 
let blocoAlvoId = null;
let painelAlvoId = null;
let callbackSalvar = null;

export function configurarEditorFormula(onSalvar) {
    callbackSalvar = onSalvar;
    const sheet = document.querySelector('#formula-settings-sheet');
    const builder = document.querySelector('#formula-builder');
    const btnClose = document.querySelector('#formula-sheet-close-btn');
    const btnSalvar = document.querySelector('#btn-salvar-formula');
    const listaCampos = document.querySelector('#formula-campos-list');
    const operadores = document.querySelectorAll('.op-btn');
    const dragHandle = document.querySelector('#formula-sheet-header-drag');

    if (!sheet || !builder) return;

    // Lógica de Arrastar a Janela (Livre pela tela)
    let isDraggingSheet = false, startX = 0, startY = 0, initialX = 0, initialY = 0;
    if (dragHandle) {
        dragHandle.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button')) return;
            isDraggingSheet = true; startX = e.clientX; startY = e.clientY;
            const rect = sheet.getBoundingClientRect();
            initialX = rect.left; initialY = rect.top;
            sheet.style.transition = 'none'; sheet.setPointerCapture(e.pointerId);
        });
        sheet.addEventListener('pointermove', (e) => {
            if (!isDraggingSheet) return;
            sheet.style.left = `${initialX + (e.clientX - startX)}px`;
            sheet.style.top = `${initialY + (e.clientY - startY)}px`;
            sheet.style.bottom = 'auto'; sheet.style.right = 'auto';
        });
        sheet.addEventListener('pointerup', (e) => {
            if (!isDraggingSheet) return;
            isDraggingSheet = false; sheet.style.transition = 'transform 0.3s, opacity 0.3s, visibility 0.3s';
            sheet.releasePointerCapture(e.pointerId);
        });
    }

    if (btnClose) btnClose.addEventListener('click', fechar);

    // Adicionar Operador
    operadores.forEach(btn => {
        btn.addEventListener('click', () => {
            formulaAtual.push({ tipo: 'operador', valor: btn.dataset.op, id: 'op_' + Date.now() });
            renderizarFormula();
        });
    });

    // Salvar Fórmula
    if (btnSalvar) {
        btnSalvar.addEventListener('click', () => {
            if (!validarFormula()) return;
            
            const pag = getPaginaAtiva();
            const painel = pag.paineis.find(p => p.id === painelAlvoId);
            const bloco = painel.blocos.find(b => b.id === blocoAlvoId);
            
            // Prevenção de ciclo direto (bloco depender de si mesmo)
            const usaEleMesmo = formulaAtual.some(item => item.tipo === 'campo' && item.blocoId === blocoAlvoId);
            if (usaEleMesmo) {
                alert("Erro: O bloco não pode depender de si mesmo.");
                return;
            }

            bloco.formula = [...formulaAtual];
            if (callbackSalvar) callbackSalvar();
            fechar();
        });
    }

    // Função para abrir a janela
    window.abrirEditorFormula = (painelId, blocoId, formulaExistente) => {
        painelAlvoId = painelId;
        blocoAlvoId = blocoId;

        if (formulaExistente && Array.isArray(formulaExistente)) {
            formulaAtual = JSON.parse(JSON.stringify(formulaExistente));
        } else {
            formulaAtual = [];
        }

        renderizarCamposDisponiveis();
        renderizarFormula();

        // Reseta o estilo de posicionamento caso a janela tenha sido arrastada antes
        if (!sheet.style.left) {
            sheet.style.left = '50%'; 
            sheet.style.transform = 'translateX(-50%)';
            sheet.style.top = 'auto';
            sheet.style.bottom = '2rem';
            sheet.style.right = 'auto';
        }
        
        sheet.classList.add('active');
    };

    function fechar() {
        sheet.classList.remove('active');
        formulaAtual = [];
    }

    function renderizarCamposDisponiveis() {
        if (!listaCampos) return;
        listaCampos.innerHTML = '';
        
        estado.paginas.forEach(pag => {
            const numericos = [];
            
            pag.paineis.forEach(painel => {
                painel.blocos.forEach(bloco => {
                    // Apenas numéricos e que não sejam ele mesmo
                    if (bloco.tipo === 'numerico' && bloco.id !== blocoAlvoId) {
                        numericos.push({ painelId: painel.id, blocoId: bloco.id, nome: bloco.tituloBloco || 'Sem Título' });
                    }
                });
            });

            if (numericos.length > 0) {
                const group = document.createElement('div');
                group.className = 'formula-group';
                group.innerHTML = `<div class="formula-group-title">Página: ${pag.nome}</div>`;
                
                numericos.forEach(b => {
                    const btn = document.createElement('button');
                    btn.className = 'formula-field-btn';
                    btn.textContent = b.nome;
                    btn.onclick = () => {
                        formulaAtual.push({ 
                            tipo: 'campo', 
                            id: 'c_' + Date.now(), 
                            blocoId: b.blocoId, 
                            painelId: b.painelId, 
                            nome: b.nome 
                        });
                        renderizarFormula();
                    };
                    group.appendChild(btn);
                });
                listaCampos.appendChild(group);
            }
        });
    }

    function renderizarFormula() {
        builder.innerHTML = '';
        
        if (formulaAtual.length === 0) {
            builder.innerHTML = '<span class="formula-placeholder">Selecione campos e operadores abaixo...</span>';
            return;
        }

        formulaAtual.forEach((item, index) => {
            const el = document.createElement('div');
            el.className = item.tipo === 'campo' ? 'formula-item campo' : 'formula-item operador';
            el.textContent = item.tipo === 'campo' ? item.nome : item.valor;
            
            // Remoção com botão direito (context menu)
            el.oncontextmenu = (e) => {
                e.preventDefault();
                if (confirm("Deseja realmente remover este elemento?")) {
                    formulaAtual.splice(index, 1);
                    renderizarFormula();
                }
            };

            builder.appendChild(el);
        });
    }

    function validarFormula() {
        if (formulaAtual.length < 3) {
            alert("A fórmula está incompleta. Adicione pelo menos dois campos e um operador.");
            return false;
        }
        if (formulaAtual[0].tipo !== 'campo' || formulaAtual[formulaAtual.length - 1].tipo !== 'campo') {
            alert("A fórmula deve começar e terminar com um campo.");
            return false;
        }
        for (let i = 0; i < formulaAtual.length - 1; i++) {
            if (formulaAtual[i].tipo === 'operador' && formulaAtual[i+1].tipo === 'operador') {
                alert("Não é permitido ter dois operadores seguidos.");
                return false;
            }
        }
        return true;
    }
}