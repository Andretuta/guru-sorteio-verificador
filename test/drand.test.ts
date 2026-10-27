import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { AssinaturaInvalida, buscarRodadaVerificada, QUICKNET, RodadaIndisponivel } from '../src/index.js'

const lerFixture = (nome: string) => readFileSync(new URL(`./fixtures/${nome}`, import.meta.url), 'utf8')
const rodadaReal = JSON.parse(lerFixture('quicknet-3000000.json'))
const infoReal = JSON.parse(lerFixture('quicknet-info.json'))

// dublê de fetch: serve /info e /public/<n> sem tocar na rede
function fetchDuble(opts: { beacon?: unknown; info?: unknown; status?: number } = {}): typeof fetch {
  return (async (url: string | URL) => {
    const u = String(url)
    const resp = (status: number, corpo: unknown) =>
      new Response(JSON.stringify(corpo), { status, headers: { 'content-type': 'application/json' } })
    if (u.endsWith('/info')) return resp(200, opts.info ?? infoReal)
    if (u.includes('/public/')) return resp(opts.status ?? 200, opts.beacon ?? rodadaReal)
    return resp(404, {})
  }) as typeof fetch
}

describe('buscarRodadaVerificada', () => {
  test('devolve a randomness de uma rodada real com assinatura válida', async () => {
    const r = await buscarRodadaVerificada(3000000, { fetch: fetchDuble() })
    expect(r).toEqual({ rodada: 3000000, randomness: rodadaReal.randomness, assinatura: rodadaReal.signature })
  })

  test('a chave pública fixada no pacote é a da rede oficial', () => {
    expect(QUICKNET.chainHash).toBe(infoReal.hash)
    expect(QUICKNET.publicKey).toBe(infoReal.public_key)
    expect(QUICKNET.genesis).toBe(infoReal.genesis_time)
    expect(QUICKNET.periodoS).toBe(infoReal.period)
  })

  test('um byte da assinatura trocado → AssinaturaInvalida', async () => {
    const s: string = rodadaReal.signature
    const adulterada = { ...rodadaReal, signature: (s[0] === '8' ? '9' : '8') + s.slice(1) }
    await expect(buscarRodadaVerificada(3000000, { fetch: fetchDuble({ beacon: adulterada }) }))
      .rejects.toBeInstanceOf(AssinaturaInvalida)
  })

  test('randomness que não bate com a assinatura → AssinaturaInvalida', async () => {
    const r: string = rodadaReal.randomness
    const adulterada = { ...rodadaReal, randomness: (r[0] === '2' ? '3' : '2') + r.slice(1) }
    await expect(buscarRodadaVerificada(3000000, { fetch: fetchDuble({ beacon: adulterada }) }))
      .rejects.toBeInstanceOf(AssinaturaInvalida)
  })

  test('servidor devolvendo outra rodada → AssinaturaInvalida', async () => {
    await expect(buscarRodadaVerificada(3000001, { fetch: fetchDuble() }))
      .rejects.toBeInstanceOf(AssinaturaInvalida)
  })

  test('404 → RodadaIndisponivel', async () => {
    await expect(buscarRodadaVerificada(3000000, { fetch: fetchDuble({ status: 404 }) }))
      .rejects.toBeInstanceOf(RodadaIndisponivel)
  })

  test('rede fora → RodadaIndisponivel', async () => {
    const fora = (async () => { throw new TypeError('fetch failed') }) as unknown as typeof fetch
    await expect(buscarRodadaVerificada(3000000, { fetch: fora })).rejects.toBeInstanceOf(RodadaIndisponivel)
  })

  test('/info com hash ou chave diferente da fixada → AssinaturaInvalida (nunca confiar no info baixado)', async () => {
    await expect(buscarRodadaVerificada(3000000, { fetch: fetchDuble({ info: { ...infoReal, hash: 'ab'.repeat(32) } }) }))
      .rejects.toBeInstanceOf(AssinaturaInvalida)
    await expect(buscarRodadaVerificada(3000000, { fetch: fetchDuble({ info: { ...infoReal, public_key: 'cd'.repeat(48) } }) }))
      .rejects.toBeInstanceOf(AssinaturaInvalida)
  })

  test('rodada inválida (não inteira / < 1) é recusada antes de ir à rede', async () => {
    await expect(buscarRodadaVerificada(0, { fetch: fetchDuble() })).rejects.toThrow()
    await expect(buscarRodadaVerificada(1.5, { fetch: fetchDuble() })).rejects.toThrow()
  })
})
