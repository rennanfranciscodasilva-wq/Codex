import { confirmarAcao } from '../../componentes/dialogos/dialogos.js';
import { armazenamentoBiblioteca } from '../../servicos/armazenamento/biblioteca.js';
import { chaveNome } from '../../servicos/armazenamento/modelos.js';
import { importarFicha, importarModelo } from './portabilidade.js';

const SISTEMAS = 'codex_sistemas';
const FICHAS = 'codex_fichas_jogador';
const lerLista = chave => JSON.parse(armazenamentoBiblioteca.getItem(chave) || '[]');
const gravarLista = (chave, lista) => armazenamentoBiblioteca.setItem(chave, JSON.stringify(lista));

export function adicionarModeloJson(dados) {
    const modelo = importarModelo(dados);
    const sistemas = lerLista(SISTEMAS);
    const nomes = new Set(sistemas.map(item => chaveNome(item.nome)));
    const nomeOriginal = modelo.nome;
    for (let indice = 2; nomes.has(chaveNome(modelo.nome)); indice++) {
        const sufixo = ' (' + indice + ')';
        modelo.nome = nomeOriginal.slice(0, 120 - sufixo.length).trimEnd() + sufixo;
    }
    modelo.layout.nome = modelo.nome;
    modelo.id = 'sist_' + crypto.randomUUID();
    modelo.criadoEm = Date.now();
    modelo.valoresPadrao = {};
    gravarLista(SISTEMAS, [...sistemas, modelo]);
    return modelo;
}

export async function adicionarFichaJson(dados, modelo, continua) {
    if (modelo?.layout?.schemaVersion !== 2) throw new Error('Abra um modelo compatível para importar o personagem.');
    const ficha = importarFicha(dados, modelo);
    const nome = chaveNome(ficha.nomePersonagem);
    const duplicado = lerLista(FICHAS).find(item => item.sistemaId === modelo.id && chaveNome(item.nomePersonagem) === nome);
    if (duplicado && !(await confirmarAcao('Substituir o personagem "' + ficha.nomePersonagem + '" pelos dados do arquivo?',
        { confirmar: 'Substituir', perigo: true }))) return null;
    if (!continua()) return null;
    const fichas = lerLista(FICHAS);
    const atual = duplicado && fichas.find(item => item.id === duplicado.id);
    const registro = {
        ...ficha,
        id: atual?.id ?? 'ficha_' + crypto.randomUUID(),
        criadoEm: atual?.criadoEm ?? Date.now(),
        sistemaId: modelo.id
    };
    if (atual) fichas[fichas.indexOf(atual)] = registro;
    else fichas.push(registro);
    gravarLista(FICHAS, fichas);
    return registro;
}
