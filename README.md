# guru-sorteio-verificador

Verificador aberto dos sorteios do Guru dos Cupons. Com ele, qualquer pessoa
refaz a conta de um sorteio e chega **exatamente** na mesma ordem de
sorteados — sem precisar confiar em nós.

## Para quem não é programador: como o sorteio funciona

O medo de todo sorteio é "e se o organizador escolheu quem ele quis?". O
método abaixo tira essa possibilidade da nossa mão em três passos:

1. **Trava a lista.** Quando as inscrições encerram, a lista de participantes
   (número da sorte + nome parcial, tipo `04127;Ana ••••1234`) é publicada
   e vira uma "impressão digital" de 64 letras e números, chamada **H**.
   Qualquer mudança na lista, até de uma vírgula, muda H por completo.
2. **Escolhe uma rodada do futuro.** Junto com a lista, anunciamos o número de
   uma rodada do **drand**, uma loteria pública mantida por cerca de vinte
   organizações independentes (Cloudflare, Protocol Labs, universidades...).
   A rodada escolhida só acontece **depois** da publicação da lista (pelo
   menos 10 minutos depois). Quando acontece, o drand publica um número
   aleatório, assinado por todas elas: o **S**. Nem nós nem ninguém sabe qual
   será o S antes de ele sair.
3. **Faz a conta aberta.** Para cada participante calculamos uma "nota":
   `nota = sha256("S:H:número da sorte")`. É uma conta pública e sem
   segredo. Quem tem a **menor nota** é o 1º sorteado, depois vêm os
   suplentes em ordem crescente.

Por que não dá para roubar: a lista já estava travada quando o S nasceu, então
ninguém conseguiu inscrever alguém "de propósito" para ganhar; e depois que o S
existe, a conta não tem nenhuma escolha humana, só matemática. Se qualquer
pessoa refizer a conta com a mesma lista e o mesmo S, o resultado tem de ser
idêntico. É isto que este programa faz.

### Conferindo um sorteio

Precisa do [Node.js](https://nodejs.org) 22 ou mais novo.

```bash
git clone https://github.com/Andretuta/guru-sorteio-verificador.git
cd guru-sorteio-verificador
npm install -g pnpm   # se ainda não tiver
pnpm install
node dist/bin/verificar.js lista.txt 3000000
```

- `lista.txt` é a lista publicada na página do sorteio (uma linha
  `numero;exibicao` por participante).
- `3000000` é o número da rodada do drand anunciado na página do sorteio.

O programa baixa a rodada do drand, **confere a assinatura** e imprime H, S e a
ordem completa. Compare com o que a página do sorteio mostra: tem de ser igual.
Se o programa recusar a rodada (assinatura inválida), a conta não é feita.

## Seção técnica

### O método (versão exata)

- **Lista canônica:** uma linha `"<numero>;<exibicao>\n"` por participante,
  ordenada pelo `numero` em ordem crescente de unidades de código (não por
  localidade), em UTF-8. Sem e-mails nem telefones completos.
- **H** = `sha256(lista canônica)`, hex minúsculo.
- **Rodada alvo R** = primeira rodada da quicknet cujo horário é
  `>= T + 600 s`, onde T é o instante do travamento:
  `R = ceil((T + 600 - genesis) / periodo) + 1`.
- **S** = `randomness` da rodada R, só depois de a assinatura BLS ser conferida
  contra a chave pública fixada neste pacote.
- **Ordem:** `k = sha256_hex(UTF-8 "<S>:<H>:<numero>")` (S e H em hex
  minúsculo); ordena por `k` crescente. 1º = ganhador, os demais = suplentes.

### Rede do drand

Quicknet da League of Entropy (`bls-unchained-g1-rfc9380`, rodada a cada 3 s):

| | |
|---|---|
| chain hash | `52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971` |
| genesis | `1692803367` |
| período | `3` s |

O chain hash e a chave pública estão fixados no código (`QUICKNET`). A
verificação da assinatura usa **só** essa chave fixada, via o pacote oficial
[`drand-client`](https://github.com/drand/drand-client). O `/info` baixado do
servidor é apenas comparado com o valor fixado; se divergir, a rodada é recusada.

### API

```ts
import {
  listaCanonica, hashLista, rodadaAlvo, horarioDaRodada, ordenar,
  buscarRodadaVerificada, QUICKNET, RodadaIndisponivel, AssinaturaInvalida,
} from 'guru-sorteio-verificador'

const lista = listaCanonica([{ numero: '00007', exibicao: 'Ana ••••1234' }])
const H = await hashLista(lista)                      // hex minúsculo
const R = rodadaAlvo(new Date())                      // folga padrão: 600 s
const { randomness: S } = await buscarRodadaVerificada(R)
const ordem = await ordenar(S, H, ['00007'])          // números, do 1º ao último
```

- Funciona em Node 22 e em navegadores (só Web Crypto e `fetch`); por isso
  `hashLista` e `ordenar` são assíncronas.
- `buscarRodadaVerificada(rodada, { baseUrl?, fetch? })` lança
  `RodadaIndisponivel` (rodada ainda não saiu, 404, rede fora, timeout de 15 s:
  tentar de novo depois) ou `AssinaturaInvalida` (nunca aceitar). `baseUrl` é só
  o servidor (padrão `https://api.drand.sh`); a rede é sempre a fixada.
- `ordenar` **não** sabe se o `S` que recebe foi verificado. Use o `S` vindo de
  `buscarRodadaVerificada`.
- Versões: a tag git `v1.0.0` é imutável por convenção. Instalação a partir
  do git: `pnpm add git+https://github.com/Andretuta/guru-sorteio-verificador.git#v1.0.0`
  (o `dist/` compilado já vai no repositório, então a instalação não depende de rodar scripts; rode `pnpm build` e commite o `dist/` antes de cada tag).

### Desenvolvimento

```bash
pnpm install
pnpm vitest run   # offline: usa uma rodada real gravada em test/fixtures/
pnpm build
```

Licença: MIT.
