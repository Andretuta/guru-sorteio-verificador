#!/usr/bin/env node
// Uso: verificar <lista.txt> <rodada>
// Refaz a conta do sorteio: confere a assinatura da rodada do drand e imprime H, S e a ordem.
import { readFileSync } from 'node:fs';
import { buscarRodadaVerificada, hashLista, listaCanonica, ordenar, RodadaIndisponivel } from '../src/index.js';
async function main() {
    const [arquivo, rodadaTxt] = process.argv.slice(2);
    const rodada = Number(rodadaTxt);
    if (!arquivo || !Number.isInteger(rodada) || rodada < 1) {
        console.error('uso: verificar <lista.txt> <rodada>');
        return 2;
    }
    // Arquivos baixados no Windows vêm com \r\n; a lista canônica usa só \n.
    const lista = readFileSync(arquivo, 'utf8').replace(/\r\n/g, '\n');
    const entradas = lista
        .split('\n')
        .filter((l) => l !== '')
        .map((l) => {
        const i = l.indexOf(';');
        return { numero: l.slice(0, i), exibicao: l.slice(i + 1) };
    });
    if (entradas.some((e) => e.numero === '' || e.exibicao === '') || listaCanonica(entradas) !== lista) {
        console.error('a lista não está no formato canônico: "numero;exibicao" por linha, em ordem de número, com \\n no fim');
        return 2;
    }
    const H = await hashLista(lista);
    let r;
    try {
        r = await buscarRodadaVerificada(rodada);
    }
    catch (e) {
        console.error(`${e.name}: ${e.message}`);
        return e instanceof RodadaIndisponivel ? 3 : 4;
    }
    const ordem = await ordenar(r.randomness, H, entradas.map((e) => e.numero));
    const porNumero = new Map(entradas.map((e) => [e.numero, e.exibicao]));
    console.log(`H (hash da lista):   ${H}`);
    console.log(`R (rodada drand):    ${r.rodada}`);
    console.log(`S (randomness):      ${r.randomness}   [assinatura conferida]`);
    console.log(`Participantes:       ${entradas.length}`);
    console.log('');
    ordem.forEach((n, i) => console.log(`${String(i + 1).padStart(4)}. ${n}  ${porNumero.get(n)}${i === 0 ? '   <- 1º sorteado' : ''}`));
    return 0;
}
process.exitCode = await main();
