import { createHash } from 'node:crypto'
import { expect, test } from 'vitest'
import { horarioDaRodada, hashLista, listaCanonica, ordenar, rodadaAlvo } from '../src/index.js'

test('lista canônica ordena por número e termina em \\n', () => {
  expect(listaCanonica([{ numero: '40000', exibicao: 'Bia ••••0001' }, { numero: '00007', exibicao: 'Ana ••••1234' }]))
    .toBe('00007;Ana ••••1234\n40000;Bia ••••0001\n')
})

test('hash da lista é sha256 hex', async () => {
  expect(await hashLista('00007;Ana ••••1234\n')).toMatch(/^[0-9a-f]{64}$/)
  expect(await hashLista('a')).toBe('ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb')
})

test('hash da lista usa UTF-8 (os bullets contam)', async () => {
  const l = '00007;Ana ••••1234\n'
  expect(await hashLista(l)).toBe(createHash('sha256').update(Buffer.from(l, 'utf8')).digest('hex'))
})

test('rodada alvo é a primeira com horário >= travamento + 600 s', () => {
  const t = new Date((1692803367 + 3 * 1000) * 1000) // horário exato da rodada 1001
  expect(rodadaAlvo(t)).toBe(1001 + 200)
  expect(horarioDaRodada(rodadaAlvo(t)).getTime()).toBeGreaterThanOrEqual(t.getTime() + 600_000)
  // um milissegundo depois do limite já empurra para a rodada seguinte
  const t2 = new Date(t.getTime() + 1)
  expect(rodadaAlvo(t2)).toBe(1001 + 201)
})

test('ordenar é determinístico e usa S:H:numero', async () => {
  const nums = Array.from({ length: 20 }, (_, i) => String(i).padStart(5, '0'))
  const a = await ordenar('aa', 'bb', nums)
  expect(a).toEqual(await ordenar('aa', 'bb', [...nums].reverse())) // não depende da ordem de entrada
  expect([...a].sort()).toEqual(nums) // mesma gente, sem perder ninguém
  expect(a).not.toEqual(await ordenar('ab', 'bb', nums)) // S diferente → ordem diferente (20! permutações)
  expect(a).not.toEqual(await ordenar('aa', 'bc', nums)) // H diferente → ordem diferente
  // vetor de referência: a ordem inteira é a de sha256("aa:bb:<numero>") crescente
  const k = (n: string) => createHash('sha256').update(`aa:bb:${n}`).digest('hex')
  expect(a).toEqual([...nums].sort((x, y) => (k(x) < k(y) ? -1 : 1)))
})

test('lista vazia ordena para vazio; um só fica sozinho', async () => {
  expect(await ordenar('aa', 'bb', [])).toEqual([])
  expect(await ordenar('aa', 'bb', ['12345'])).toEqual(['12345'])
})

test('data inválida e linha com quebra de linha são recusadas', () => {
  expect(() => rodadaAlvo(new Date('lixo'))).toThrow()
  expect(() => listaCanonica([{ numero: '00001', exibicao: 'Ana\n99999;Fraude' }])).toThrow()
})
