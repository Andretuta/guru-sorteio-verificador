// Busca uma rodada do drand (quicknet) e confere a assinatura BLS contra a chave pública FIXADA
// aqui no código. Nada que a rede devolva é aceito sem essa conferência.
import { fetchBeacon } from 'drand-client';
export const QUICKNET = {
    chainHash: '52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971',
    publicKey: '83cf0f2896adee7eb8b5f01fcad3912212c437e0073e911fb90022d3e760183c8c4b450b6a0a6c3ac6a5776a2d1064510d1fec758c921cc22b0e17e63aaf4bcb5ed66304de9cf809bd274ca73bab4af5a6e9c76a4bc09e76eae8991ef5ece45a',
    genesis: 1692803367,
    periodoS: 3,
};
const INFO_FIXA = {
    public_key: QUICKNET.publicKey,
    period: QUICKNET.periodoS,
    genesis_time: QUICKNET.genesis,
    hash: QUICKNET.chainHash,
    groupHash: 'f477d5c89f21a17c863a7f937c6a6d15859414d2be09cd448d4279af331c5d3e',
    schemeID: 'bls-unchained-g1-rfc9380',
    metadata: { beaconID: 'quicknet' },
};
/** A rodada ainda não saiu, ou a rede do drand não respondeu. Tentar de novo mais tarde resolve. */
export class RodadaIndisponivel extends Error {
    name = 'RodadaIndisponivel';
}
/** A rodada veio, mas não bate com a chave pública da rede. Nunca aceitar. */
export class AssinaturaInvalida extends Error {
    name = 'AssinaturaInvalida';
}
export async function buscarRodadaVerificada(rodada, opts = {}) {
    if (!Number.isInteger(rodada) || rodada < 1)
        throw new RangeError(`rodada inválida: ${rodada}`);
    const baseUrl = (opts.baseUrl ?? 'https://api.drand.sh').replace(/\/+$/, '');
    const f = opts.fetch ?? globalThis.fetch.bind(globalThis);
    // A rede é sempre a fixada: o servidor escolhido só fornece o transporte.
    const url = `${baseUrl}/${QUICKNET.chainHash}`;
    async function json(caminho) {
        let resp;
        try {
            resp = await f(url + caminho, { signal: AbortSignal.timeout(15_000) });
        }
        catch (e) {
            throw new RodadaIndisponivel(`sem resposta do drand em ${caminho}: ${e.message}`);
        }
        if (!resp.ok)
            throw new RodadaIndisponivel(`drand respondeu ${resp.status} em ${caminho}`);
        try {
            return await resp.json();
        }
        catch {
            throw new RodadaIndisponivel(`resposta do drand em ${caminho} não é JSON`);
        }
    }
    // Confere que o servidor fala da rede certa; a verificação em si usa só a chave fixada.
    const info = await json('/info');
    if (info?.hash !== QUICKNET.chainHash || info?.public_key !== QUICKNET.publicKey) {
        throw new AssinaturaInvalida('o /info devolvido não é o da quicknet fixada');
    }
    const chain = { baseUrl: url, info: async () => INFO_FIXA };
    const client = {
        options: { disableBeaconVerification: false, noCache: false },
        chain: () => chain,
        get: (n) => json(`/public/${n}`),
        latest: () => json('/public/latest'),
    };
    try {
        const b = await fetchBeacon(client, rodada);
        return { rodada: b.round, randomness: b.randomness, assinatura: b.signature };
    }
    catch (e) {
        if (e instanceof RodadaIndisponivel)
            throw e;
        throw new AssinaturaInvalida(`rodada ${rodada} não passou na verificação: ${e.message}`);
    }
}
