export type Entrada = {
    numero: string;
    exibicao: string;
};
/** Uma linha `numero;exibicao` por participante, ordenada por número, com `\n` no fim. */
export declare function listaCanonica(entradas: Entrada[]): string;
/** H = sha256 (hex minúsculo) da lista canônica em UTF-8. */
export declare function hashLista(lista: string): Promise<string>;
/** Horário (ms desde 1970) da rodada `rodada` da quicknet. */
export declare function horarioDaRodada(rodada: number): Date;
/** Primeira rodada cujo horário é >= travadoEm + folga (padrão 600 s). */
export declare function rodadaAlvo(travadoEm: Date, folgaS?: number): number;
/** Ordem final: k = sha256("<S>:<H>:<numero>") crescente. 1º = ganhador, depois os suplentes. */
export declare function ordenar(randomnessHex: string, hHex: string, numeros: string[]): Promise<string[]>;
