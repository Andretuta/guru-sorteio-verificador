export declare const QUICKNET: {
    readonly chainHash: "52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971";
    readonly publicKey: "83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a";
    readonly genesis: 1692803367;
    readonly periodoS: 3;
};
/** A rodada ainda não saiu, ou a rede do drand não respondeu. Tentar de novo mais tarde resolve. */
export declare class RodadaIndisponivel extends Error {
    name: string;
}
/** A rodada veio, mas não bate com a chave pública da rede. Nunca aceitar. */
export declare class AssinaturaInvalida extends Error {
    name: string;
}
export type RodadaVerificada = {
    rodada: number;
    randomness: string;
    assinatura: string;
};
export declare function buscarRodadaVerificada(rodada: number, opts?: {
    baseUrl?: string;
    fetch?: typeof fetch;
}): Promise<RodadaVerificada>;
