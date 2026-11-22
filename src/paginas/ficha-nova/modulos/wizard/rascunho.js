import { armazenamentoBiblioteca } from '../../../../servicos/armazenamento/biblioteca.js';

const chave = 'codex_rascunhos';
let capturar;

export function lerRascunho() {
    return JSON.parse(armazenamentoBiblioteca.getItem(chave) || '[]')[0];
}

export function observarRascunho(obter) {
    capturar = obter;
}

export function salvarRascunho() {
    if (!capturar) return false;
    armazenamentoBiblioteca.setItem(chave, JSON.stringify([{ id: 'modelo', ...capturar() }]));
    return true;
}

export function excluirRascunho() {
    capturar = null;
    armazenamentoBiblioteca.removeItem(chave);
}
