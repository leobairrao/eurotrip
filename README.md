# Eurotrip 2026

O app de planejamento da viagem do Leo e da Lu — 10/12/2026 a 12/01/2027, 34 dias,
8 bases, 7 países. Reconstrução do artefato `referencia/artefato-v28.html` como site,
com um motivo só: **duas pessoas mexendo no mesmo dado, ao mesmo tempo, sem perder nada.**

A especificação completa está em [`ESPECIFICACAO.md`](ESPECIFICACAO.md). Onde este README
e a especificação divergirem, a especificação manda.

**Vai mexer no código?** Leia [`COMO-MEXER.md`](COMO-MEXER.md) primeiro — como a coisa
funciona por dentro, o que não se pode quebrar, as decisões que foram tomadas e por quê,
e as pedras em que já se tropeçou.

---

## No ar

**https://eurotrip-bice.vercel.app** — só os dois e-mails entram.

| | |
|---|---|
| repositório | `github.com/leobairrao/eurotrip` (deploy automático a cada push em `main`) |
| Vercel | projeto `eurotrip`, com **só** as duas variáveis `NEXT_PUBLIC_` |
| Supabase Auth | Site URL e Redirect URLs apontando para produção e para `localhost:3000` |

---

## O projeto no Supabase

| | |
|---|---|
| projeto | `eurotrip` |
| região | `sa-east-1` — South America (São Paulo) |
| URL | `https://qwwmjibqlgysjembhbxs.supabase.co` |
| chaves | formato novo: `sb_publishable_…` (navegador) e `sb_secret_…` (só local) |

A senha do Postgres foi gerada na criação do projeto. O app não usa ela — só as
chaves acima. Se precisar de acesso direto com `psql`, dá para redefinir em
**Settings › Database › Reset database password**.

---

## O que é o que

```
ESPECIFICACAO.md         a especificação, 16 seções
COMO-MEXER.md            como o app funciona por dentro, e como alterá-lo
dados/                   o conteúdo e o estado real do Leo (13 JSONs)
referencia/              o app de hoje, funcionando, e o CSS dele
supabase/                o SQL: esquema, RLS, Realtime, e as migracoes
scripts/                 semeadura, importação, allowlist e os números de aceite
src/content/             os JSONs que viram constante no código (seção 6.3)
src/lib/                 formulas (seção 11), store em tempo real, tipos
src/screens/             as nove telas
tests/                   62 testes sobre as formulas e as regras
```

---

## Rodar na sua máquina

```bash
npm install
cp .env.local.example .env.local     # e preencha
npm run dev                          # http://localhost:3000
```

**Sem `.env.local` o app ainda abre**, em *modo demonstração*: as nove telas com os
dados reais do Leo, lidos direto de `dados/estado-atual-do-leo.json`. Serve para conferir
o visual lado a lado com o artefato. Nada salva nesse modo.

### As variáveis

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> ⚠️ **A chave de service role fica só na sua máquina.** Ela não vai para a Vercel e não
> vai para o navegador, em hipótese alguma. É usada apenas pelos scripts de
> `scripts/`, que rodam localmente. As duas variáveis `NEXT_PUBLIC_` são as únicas
> que o site precisa.

---

## Preparar o banco, na ordem

```bash
# 1. no SQL Editor do Supabase, cole e rode:
#      supabase/00-tudo.sql        (esquema + politicas, numa colada so)
#    ou, se preferir separado:
#      supabase/01-schema.sql  depois  supabase/02-politicas.sql
#
#    O Supabase avisa "destructive operations": e o bloco de limpeza do fim,
#    que derruba a versao privada da Caixa com `drop ... if exists`. Num banco
#    novo esses objetos nao existem, entao sao no-ops.
#
# 1b. SO se o seu banco e anterior a 04/09/2026, quando a Caixa deixou de ser
#     mes a mes: rode tambem, DEPOIS do passo 1:
#       supabase/03-caixa-aportes.sql
#     Ele converte os aportes de mes em aportes com dia, e o "ja guardado hoje"
#     no primeiro aporte de cada um — nada e apagado sem antes ser convertido.
#     Rodar duas vezes nao faz mal: ele percebe que ja migrou.
#     Num banco novo nao precisa: o 01 ja cria o formato novo.
#
#     O passo 1 num banco velho nao quebra: os indices de `contribution` so
#     sao criados se a coluna `on_date` ja existir. Sem esse cuidado a colada
#     inteira abortaria em "column on_date does not exist" e voce nunca
#     chegaria aqui no 1b — que era justamente o conserto.

# 2. o conteúdo (34 dias, 104 atrações, 12 trechos, 7 bases…)
npm run seed

# 3. o que o Leo já preencheu — dado real, não pode ser perdido
npm run import

# 4. os números de aceite. Se algum não bater, pare aqui.
npm run check

# 5. a allowlist: cria as duas contas e as duas linhas de app_user
npm run usuarios
```

`npm run check` tem que imprimir:

```
ok   atrações escolhidas                8
ok     ... todas de Lisboa             lisboa
ok   total já pago                     R$ 5.337
ok   câmbio                            6,2
```

Depois, no painel do Supabase:

- **Authentication › Sign In / Providers** → desligue *Allow new users to sign up*.
- **Authentication › URL Configuration** → ponha a URL de produção da Vercel em
  *Site URL* e em *Redirect URLs* (com `/auth/callback`). Sem isso o link mágico
  chega quebrado.

---

## Publicar na Vercel

1. Suba o repositório e importe o projeto na Vercel.
2. Variáveis de ambiente: **só** `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Ponha a URL de produção no Supabase Auth (acima).
4. Teste o link mágico **nos dois e-mails** antes de mandar o link para a Lu.

Para testar a entrada sem depender de e-mail (só na sua máquina, precisa da chave
secreta):

```bash
node scripts/link.mjs leobairrao05@gmail.com                    # local
BASE=https://eurotrip-bice.vercel.app node scripts/link.mjs leobairrao05@gmail.com
```

> A variável **Preview** não foi configurada na Vercel — só **Production**. Se algum dia
> você abrir um branch e quiser que o deploy de preview funcione, duplique as duas
> variáveis para o ambiente Preview.

---

## Acrescentar conteúdo novo sem quebrar nada

O conteúdo semeado é identificado por um `seed_id` **posicional**:

```
atração dele     m:<cidade>:<índice no array daquela cidade>     m:lisboa:0
atração minha    s:<cidade>:<índice>                             s:roma:4
trecho           t:<índice>                                      t:3
comida           f:<país>:<índice>
reserva          b:<índice>
```

> ### ⚠️ O índice é a identidade.
> **Nunca reordene nem remova item do meio dos arrays nos JSONs.** Tirar um item do meio
> desloca todos os seguintes, e a reconciliação passa a ver itens antigos como novos —
> duplicata em massa. Só **acrescente no fim** do array de cada cidade/país. Se um item
> precisa sumir, troque o texto no lugar; não apague a linha.
>
> O mesmo vale para `dados/transportes.json`: a posição é a identidade.

Para acrescentar as listas que ainda faltam (Metz, Luxemburgo, Reims, Amsterdã e Roma):

```bash
# 1. acrescente os itens NO FIM do array da cidade em dados/atracoes-dele.json
# 2. copie para src/content/ (o app lê de lá)
cp dados/atracoes-dele.json src/content/atracoes-dele.json
# 3. reconcilie
npm run seed
```

`npm run seed` pode rodar quantas vezes quiser:

| situação | o que acontece |
|---|---|
| o `seed_id` já está na tabela | não mexe (ele pode ter editado o nome, o preço) |
| o `seed_id` está em `killed_seed` | **nunca volta** (regra 5.14) |
| é novo | insere |

---

## Os testes

```bash
npm test          # as formulas da seção 11 e as regras da seção 5
npm run typecheck
npm run check     # os números de aceite, lidos do banco
```

`npm test` roda contra o código de produção (`src/lib/calc.ts`), sobre o estado real de
`dados/estado-atual-do-leo.json` — não contra uma cópia.

---

## Duas coisas que parecem estranhas e são de propósito

**1. A Caixa é aberta: os dois veem e editam o número um do outro.**
A seção 7 propunha o contrário — cada um lendo só a própria linha, e o *geral* vindo de
uma função `security definer` que devolvesse só agregados. Perguntado em 04/09, o Leo
escolheu abrir, igual ao artefato. Com isso `savings` e `contribution` viraram tabelas
compartilhadas normais, e caíram a função `caixa_geral()`, a tabela `caixa_pulse` e o
gatilho de pulso que existiam só porque **a RLS filtra o Realtime**. **Como fechar de
novo está escrito, com o SQL pronto, no fim de `supabase/02-politicas.sql`.**

**2. Os campos de digitação não são controlados pelo React.**
Todo campo em `Field.tsx` usa `defaultValue`, não `value`. É o que permite duas pessoas
digitarem ao mesmo tempo: quando chega mudança da outra, o valor novo só entra no DOM se
aquele campo **não estiver com o foco**. Um campo controlado se remontaria a cada tecla,
perderia o cursor e reformataria o número no meio da digitação.

---

## O teste que decide se deu certo

Não é uma tela bonita. É este (seção 15):

- Os dois em navegadores diferentes, um logado como Leo e outro como Lu.
- O Leo marca uma atração num dia → **aparece na tela da Lu sem recarregar.**
- A Lu lança um aporte → ele **aparece no extrato do Leo sem recarregar**, e o geral sobe.
- Os dois digitando ao mesmo tempo em campos diferentes → **nenhum perde o que digitou.**
- A Lu com o cursor num campo e chega mudança do Leo → **o campo dela não é sobrescrito
  e o foco não é roubado.**
