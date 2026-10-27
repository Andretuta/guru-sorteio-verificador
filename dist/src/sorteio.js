// A conta aberta do sorteio: lista travada + semente pública (drand) → ordem.
// Usa só Web Crypto, para rodar igual no Node e no navegador do visitante.
import { QUICKNET } from './drand.js';
const utf8 = new TextEncoder();
async function sha256Hex(texto) {
    const buf = await globalThis.crypto.subtle.digest('SHA-256', utf8.encode(texto));
    return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
}
/** Uma linha `numero;exibicao` por participante, ordenada por número, com `\n` no fim. */
export function listaCanonica(entradas) {
    for (const e of entradas) {
        // Quebra de linha ou ';' no lugar errado mudaria o que o hash cobre.
        if (/[\n\r;]/.test(e.numero) || /[\n\r]/.test(e.exibicao)) {
            throw new Error(`entrada inválida na lista: ${JSON.stringify(e.numero)}`);
        }
    }
    // Comparação por unidade de código, não por localidade: tem de ser idêntica em qualquer máquina.
    return [...entradas]
        .sort((a, b) => (a.numero < b.numero ? -1 : a.numero > b.numero ? 1 : 0))
        .map((e) => `${e.numero};${e.exibicao}\n`)
        .join('');
}
/** H = sha256 (hex minúsculo) da lista canônica em UTF-8. */
export function hashLista(lista) {
    return sha256Hex(lista);
}
/** Horário (ms desde 1970) da rodada `rodada` da quicknet. */
export function horarioDaRodada(rodada) {
    return new Date((QUICKNET.genesis + (rodada - 1) * QUICKNET.periodoS) * 1000);
}
/** Primeira rodada cujo horário é >= travadoEm + folga (padrão 600 s). */
export function rodadaAlvo(travadoEm, folgaS = 600) {
    if (!Number.isFinite(travadoEm.getTime()))
        throw new RangeError('data de travamento inválida');
    const msDesdeGenesis = travadoEm.getTime() + folgaS * 1000 - QUICKNET.genesis * 1000;
    return Math.ceil(msDesdeGenesis / (QUICKNET.periodoS * 1000)) + 1;
}
/** Ordem final: k = sha256("<S>:<H>:<numero>") crescente. 1º = ganhador, depois os suplentes. */
export async function ordenar(randomnessHex, hHex, numeros) {
    const comChave = await Promise.all(numeros.map(async (numero) => ({ numero, k: await sha256Hex(`${randomnessHex}:${hHex}:${numero}`) })));
    // `k` tem sempre 64 hex minúsculos, então comparar texto = comparar número. Desempate por
    // número só para a saída ser determinística mesmo com entrada duplicada.
    comChave.sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : a.numero < b.numero ? -1 : a.numero > b.numero ? 1 : 0));
    return comChave.map((c) => c.numero);
}
