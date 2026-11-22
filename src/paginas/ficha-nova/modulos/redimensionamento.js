export function redimensionar(origem, lado, dx, dy, {
    minLargura, minAltura, limiteX = Infinity, limiteY = Infinity, grade = 0, passoAltura = 0,
    proporcional = false
}) {
    const horizontal = lado === 'esq' || lado === 'dir';
    const antes = lado === 'esq' || lado === 'topo';
    const posicao = horizontal ? 'x' : 'y';
    const dimensao = horizontal ? 'largura' : 'altura';
    const delta = horizontal ? dx : dy;
    if (!delta) return { ...origem };

    const inicio = origem[posicao];
    const fim = inicio + origem[dimensao];
    const minimo = horizontal ? minLargura : minAltura;
    const limite = horizontal ? limiteX : limiteY;
    const candidato = (antes ? inicio : fim) + delta;
    const arredondado = grade ? Math.round(candidato / grade) * grade : Math.round(candidato);
    const inferior = Math.min(10, inicio, fim - minimo);
    const superior = Math.max(limite - 10, fim, inicio + minimo);

    if (proporcional) {
        const tamanhoDesejado = antes ? fim - arredondado : arredondado - inicio;
        const escala = tamanhoDesejado / origem[dimensao];
        const larguraMaxima = horizontal && antes ? fim - inferior
            : Math.max(origem.largura, limiteX - 10 - origem.x);
        const alturaMaxima = !horizontal && antes ? fim - inferior
            : Math.max(origem.altura, limiteY - 10 - origem.y);
        const proporcao = origem.largura / origem.altura;
        const alturaMinima = Math.max(minAltura, minLargura / proporcao);
        const alturaLimite = Math.min(alturaMaxima, larguraMaxima / proporcao);
        let altura = origem.altura * escala;

        if (passoAltura) {
            const passoMinimo = Math.ceil((alturaMinima - minAltura) / passoAltura);
            const passoMaximo = Math.floor((alturaLimite - minAltura) / passoAltura);
            if (passoMinimo > passoMaximo) return { ...origem };
            const passo = Math.round((altura - minAltura) / passoAltura);
            altura = minAltura + Math.min(passoMaximo, Math.max(passoMinimo, passo)) * passoAltura;
        } else {
            if (alturaMinima > alturaLimite) return { ...origem };
            altura = Math.min(alturaLimite, Math.max(alturaMinima, altura));
        }

        const largura = altura * proporcao;
        return {
            x: lado === 'esq' ? fim - largura : origem.x,
            y: lado === 'topo' ? fim - altura : origem.y,
            largura,
            altura
        };
    }

    if (!horizontal && passoAltura) {
        const alturaDesejada = origem.altura + (antes ? -delta : delta);
        const alturaMaxima = antes ? fim - inferior : superior - inicio;
        const passosDisponiveis = Math.floor((alturaMaxima - minimo) / passoAltura);
        const passosDesejados = Math.round((alturaDesejada - minimo) / passoAltura);
        const altura = minimo + Math.max(0, Math.min(passosDisponiveis, passosDesejados)) * passoAltura;
        return { ...origem, y: antes ? fim - altura : inicio, altura };
    }

    const borda = antes
        ? Math.min(fim - minimo, Math.max(inferior, arredondado))
        : Math.max(inicio + minimo, Math.min(superior, arredondado));

    return {
        ...origem,
        [posicao]: antes ? borda : inicio,
        [dimensao]: antes ? fim - borda : borda - inicio
    };
}
export function ajustarTituloAoRedimensionar(bloco, elemento, dimensoes) {
    if (!bloco.larguraTitulo) return;
    if (bloco.largura === dimensoes.largura && bloco.altura === dimensoes.altura) return;

    delete bloco.larguraTitulo;
    elemento?.querySelector('.bloco-titulo-wrapper')?.style.removeProperty('width');
}

