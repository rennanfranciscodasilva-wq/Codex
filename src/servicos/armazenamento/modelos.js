export function chaveNome(nome) {
    return (typeof nome === 'string' ? nome : '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
}

export function chaveNomeNaLista(chave, item) {
    if (chave === 'codex_sistemas') return chaveNome(item.nome);
    if (chave === 'codex_fichas_jogador') {
        const nome = chaveNome(item.nomePersonagem);
        return nome ? JSON.stringify([item.sistemaId ?? null, nome]) : '';
    }
    return '';
}

export function erroNomeOcupado(chave) {
    const mensagem = chave === 'codex_sistemas'
        ? 'Já existe um sistema com esse nome. Escolha outro nome.'
        : 'Já existe um personagem com esse nome neste sistema. Escolha outro nome.';
    return Object.assign(new Error(mensagem), { code: 'backup/nome-ocupado' });
}

export function validarNomeNaLista(chave, candidato, lista) {
    const nome = chaveNomeNaLista(chave, candidato);
    if (nome && lista.some(item => item.id !== candidato.id && chaveNomeNaLista(chave, item) === nome)) {
        throw erroNomeOcupado(chave);
    }
}

export function criadoEmDoModelo(modelo) {
    if (Number.isSafeInteger(modelo.criadoEm) && modelo.criadoEm > 0 &&
        modelo.criadoEm <= 253_402_300_799_999) return modelo.criadoEm;
    const data = /^sist_(\d{13})[a-z0-9]{1,4}$/i.exec(modelo.id)?.[1];
    return data ? Number(data) : null;
}
