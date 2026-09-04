# Como mexer neste app

Isto é o que eu saberia se fosse continuar. O `README.md` diz como rodar e publicar;
este arquivo diz **como a coisa funciona por dentro, o que não se pode quebrar, e onde
já pisei em falso** — para você não repetir.

Se este arquivo e a [`ESPECIFICACAO.md`](ESPECIFICACAO.md) discordarem, a especificação
manda. Ela é a fonte; isto é o mapa.

---

## 1. O mapa

```
ESPECIFICACAO.md        a fonte da verdade. 16 seções
COMECE-AQUI.md          o brief original
README.md               rodar, semear, publicar
COMO-MEXER.md           este arquivo

referencia/
  artefato-v28.html     O APP DE HOJE, FUNCIONANDO. Abre offline.
                        É a verdade visual e comportamental. Não apague.
  estilo-atual.css      o CSS original, com a tag <style> ainda nele

dados/                  os 13 JSONs: conteúdo + o estado real do Leo
                        os scripts leem DAQUI

src/content/            cópia dos JSONs que o APP importa como constante
  index.ts              tipa e exporta tudo, + o que só existia no artefato
                        (BASEOUT, DECISOES, emojis, rótulos, VOO, ESTIM_EUR)

src/lib/
  types.ts       140    espelha o esquema do Postgres
  fmt.ts         138    num, brl, eur, datas, norm, stripTags, saveMonths
  calc.ts        318    TODAS as fórmulas da seção 11
  merge.ts       146    mesclagem pura e testável (o coração do tempo real)
  store.tsx      275    provider, Realtime, fila de escrita, presença
  load.ts        221    carga inicial no servidor + modo demonstração
  ui.tsx          76    estado de navegação (aba, dia, país, filtro)
  supabase/      2 arq  cliente do navegador e do servidor

src/components/
  Field.tsx      138    OS CAMPOS. Leia a seção 4 antes de tocar.
  AppShell.tsx   120    cabeçalho, as 9 abas, presença, rodapé
  Login.tsx      105    a tela de entrada

src/screens/           uma tela por arquivo, na ordem das abas
  Painel.tsx     278    Roteiro.tsx    745   ← a maior, e a mais complexa
  Atracoes.tsx   293    Comidas.tsx    284
  Transporte.tsx 258    Hospedagem.tsx 200
  Reservas.tsx   247    Caixa.tsx      457
  Custos.tsx     306

src/app/
  estilo-atual.css 587  O CSS, sem a tag <style>. NÃO RENOMEIE CLASSE.
  extras.css       ~86  o pouco que o artefato não tinha (login, presença,
                        e o extrato de aportes da Caixa)
  page.tsx              servidor: sessão → allowlist → carrega tudo
  layout.tsx            html lang=pt-BR, as 3 fontes do Google
  auth/callback/        o link mágico volta aqui
  auth/sair/            logout

supabase/
  00-tudo.sql           esquema + políticas, para uma colada só
  01-schema.sql         as 13 tabelas (seção 6.2)
  02-politicas.sql      RLS, Realtime, e a nota de como fechar a Caixa
  03-caixa-aportes.sql  migração: a Caixa deixa de ser mês a mês (04/09).
                        Só para banco que já existia. Num banco novo, 01 já basta.

scripts/                rodam SÓ na sua máquina, com a chave secreta
  seed.mjs              primeira carga + reconciliação por seed_id
  import.mjs            traz o estado real do Leo
  check.mjs             os 18 números de aceite, LIDOS DO BANCO
  usuarios.mjs          cria as 2 contas e a allowlist
  link.mjs              gera link de entrada sem passar pelo e-mail

tests/                  51 testes sobre o código de produção
```

---

## 2. As três coisas que, se você quebrar, o app fica errado

### 2.1 O CSS é o do artefato, e as classes são o contrato

`src/app/estilo-atual.css` é o CSS original, na íntegra. Cada tela emite **exatamente**
as classes que a função `view*` correspondente do artefato emitia. Isso significa:

- **Não renomeie classe.** `mrow at5 st-esc` não é decoração, é o que aplica a barra
  verde à esquerda e a cor do select. Renomear quebra silenciosamente.
- Se quiser mudar aparência, **mexa no CSS**, não nas classes do JSX.
- Se precisar de uma classe nova, ponha em `extras.css` e deixe `estilo-atual.css`
  intocado. Assim você sempre sabe o que é original e o que é seu.

**O tradutor de nomes.** O banco usa a palavra inteira, o CSS usa a sigla do artefato.
Já existe pronto em `src/content/index.ts`:

| coisa | no banco | classe no CSS | use |
|---|---|---|---|
| situação | `escolhida` `backlog` `sugerida` | `st-esc` `st-bac` `st-sug` | `STCLS[status]` |
| comida | `prato` `restaurante` `cafe` | `fk-pr` `fk-rest` `fk-cafe` | `FKCLS[kind]` |
| atração | `passeio` `tour` | `akc-pass` `akc-tour` | — |
| trecho | `trem` `aviao` `onibus` `carro` | `tk-trem` … | igual |

Cor de cartão é variável CSS, não classe:
```tsx
<div className="card" style={{ ['--cc' as string]: 'var(--ochre)' }}>
```

### 2.2 Os campos são não-controlados de propósito

Isto é a regra 5.15 e a seção 8 da especificação, e é a parte mais fácil de quebrar
sem perceber. **Todo input de dado do usuário usa os componentes de `Field.tsx`:**

```tsx
<TextField fk={`attraction|${it.id}|name`} value={it.name}
           onCommit={(v) => patch('attraction', it.id, 'name', v)}
           className="nv" aria-label="nome" />
<NumField  fk={`leg|${it.id}|amount`} value={it.amount}
           onCommit={(v) => patch('leg', it.id, 'amount', v)}
           className="pv" placeholder="a lançar" />
```

Por que não `<input value={...} onChange={...}>`?

1. **Foco.** Um input controlado que re-renderiza a cada tecla pode perder o cursor e
   a posição dele. Não-controlado (`defaultValue`) não perde.
2. **Formatação.** Controlado te obriga a decidir o formato em cada tecla. Digitar
   `12,` viraria `12` e o cursor pularia. Não-controlado deixa você digitar em paz.
3. **A outra pessoa.** Quando chega mudança do outro navegador, o `useRemoto` dentro do
   `Field` só escreve no DOM **se o campo não estiver com o foco**:
   ```ts
   if (document.activeElement === el || estaFocado(fk)) return;   // a regra
   ```
   Sem isso, a Lu digitando perderia o que escreveu quando você salvasse qualquer coisa.

**O `fk` é obrigatório e tem que ser único**: `"tabela|chave|coluna"`. É por ele que a
proteção de foco funciona. `fk` repetido = dois campos brigando.

`<select>` e `<input type="checkbox">` são JSX normal + `now(...)` — mudar um select é um
evento discreto, não tem o problema de digitação.

### 2.3 A escrita é por campo, e é isso que o projeto entrega

O app de hoje salvava o estado inteiro num JSON. Dois editores = quem salva por último
apaga o outro. Aqui:

- `patch(tabela, pk, coluna, valor)` → **um `update` de uma coluna**, com debounce de
  400 ms. Não da linha inteira.
- Enquanto uma escrita está na fila, a coluna dela fica em `pend`. Quando chega uma
  mudança remota da mesma linha, `aplicarRemoto` **preserva as colunas que estão na
  fila** e aplica o resto.
- Se a rede cair, tenta de novo com espera crescente. **Nunca descarta o que ele
  digitou** — a fila não esvazia até o banco confirmar.

Isso está provado em `tests/merge.test.mjs`. O teste que importa:

> O Leo lança € 120 no valor de um trecho. Antes da escrita voltar, chega do navegador
> da Lu uma mudança no **nome do mesmo trecho** — com `amount` null, porque ela não viu
> o lançamento dele. **O nome dela entra, o valor dele fica.**

Se você mexer em `merge.ts` ou em `store.tsx`, **rode `npm test`**. Esses 13 testes são
a única coisa que protege a promessa central do projeto.

---

## 3. Como as coisas se ligam

```
   navegador                                        Supabase
   ─────────                                        ────────
   page.tsx (servidor)
     ├─ sessão? ──não──> Login.tsx
     ├─ está em app_user? ──não──> Login.tsx        ← a allowlist
     └─ load.ts: carrega TUDO de uma vez ─────────> 13 selects em paralelo
          │                                          (~150 linhas no total,
          ▼                                           não vale paginar nada)
   store.tsx  Provider
     ├─ estado: Snapshot inteiro em memória
     ├─ Realtime: postgres_changes em 12 tabelas ──> patch no lugar
     ├─ presença: um pontinho e o nome
     └─ fila de escrita por campo ─────────────────> update de 1 coluna
          │
          ▼
   ui.tsx  qual aba, qual dia, qual país, qual filtro
          │
          ▼
   AppShell.tsx  ─── 9 telas ─── calc.ts (as fórmulas) ─── Field.tsx (os campos)
```

**Uma coisa que não é óbvia:** as fórmulas em `calc.ts` recebem o `Snapshot` inteiro e
recalculam do zero a cada render. Isso é de propósito — são ~150 linhas de dado, o custo
é irrelevante, e derivar sempre elimina toda uma classe de bug de cache desatualizado.
Não tente memoizar sem medir primeiro.

---

## 4. Receitas

### Mudar uma cor, um espaçamento, uma fonte

Tudo mora em variáveis CSS no topo de `src/app/estilo-atual.css`, nos três estados de
tema (`:root`, `@media (prefers-color-scheme:dark)` guardado por
`:root:not([data-theme="light"])`, e `:root[data-theme="dark"]`).

**Mexa nos três**, senão o tema escuro fica errado. As cores de país (`--c-es`, `--c-pt`…)
também têm as duas versões.

### Acrescentar atrações novas (Metz, Luxemburgo, Reims, Amsterdã, Roma)

É o caminho que a seção 12.4 pediu que ficasse fácil:

```bash
# 1. acrescente NO FIM do array daquela cidade em dados/atracoes-dele.json
# 2. o app lê de src/content/, então copie:
cp dados/atracoes-dele.json src/content/atracoes-dele.json
# 3. reconcilie — insere só o que falta
npm run seed
```

> ### ⚠️ O índice é a identidade
> O `seed_id` é posicional: `m:lisboa:7` é o oitavo item do array de Lisboa. **Nunca
> reordene nem remova item do meio.** Tirar um do meio desloca todos os seguintes e a
> reconciliação passa a ver itens antigos como novos — duplicata em massa. Só acrescente
> no fim. Se um item tem que sumir, troque o texto no lugar.
>
> Vale igual para `transportes.json`.

`npm run seed` pode rodar quantas vezes quiser: item que já existe não é tocado (ele pode
ter editado o nome ou o preço), e `seed_id` que está em `killed_seed` **nunca volta**.

### Acrescentar um campo numa tabela

1. **SQL**: `alter table attraction add column etiqueta text not null default '';`
   (rode no SQL Editor, e acrescente também em `supabase/01-schema.sql` para o próximo
   banco nascer certo)
2. **`types.ts`**: põe o campo na interface
3. **`load.ts`**: põe no normalizador (`normAttr`, `normLeg`…) — se esquecer, o campo
   chega `undefined` e o React reclama
4. **a tela**: um `<TextField>` com `fk` novo e `patch('attraction', id, 'etiqueta', v)`

O Realtime não precisa de nada: ele manda a linha inteira, e `aplicarRemoto` mescla
qualquer coluna.

### Acrescentar uma aba

A especificação diz para **não** inventar tela (seção 16). Mas se for uma decisão sua:

1. `src/content/index.ts` → `TABS` (a ordem do array é a ordem das abas)
2. `src/screens/MinhaTela.tsx`
3. `src/components/AppShell.tsx` → importa e põe no mapa `TELAS`

O `TabKey` sai do próprio `TABS`, então o TypeScript te avisa se esquecer o mapa.

### Mudar uma fórmula

Está toda em `calc.ts`, com o número da seção da especificação no comentário. **Mexa lá,
nunca na tela.** Depois `npm test` — os 29 testes de `calc.test.mjs` batem contra os
números que o usuário espera ver, calculados do estado real dele.

### Conferir se não quebrou nada

```bash
npm test          # 51 testes: as fórmulas e a mesclagem
npm run typecheck # TypeScript estrito
npm run build     # o build da Vercel roda isso
npm run check     # os 18 números de aceite, lidos DO BANCO
```

O `check` é o mais valioso: ele lê o banco de verdade e confere 8 atrações escolhidas,
R$ 5.337 já pago, câmbio 6,2, 34 dias, 31 noites, 32 em terra + 2 de voo, 104 atrações,
o passaporte resolvido, e mais. Se um desses parar de bater, algo real quebrou.

### Testar a entrada sem depender de e-mail

```bash
node scripts/link.mjs leobairrao05@gmail.com                     # local
BASE=https://eurotrip-bice.vercel.app node scripts/link.mjs leobairrao05@gmail.com
```

Gera um link de entrada usando a chave secreta. Serve para testar sem esperar e-mail.

### Medir o celular de verdade

Redimensionar a janela não muda a viewport das media queries. O jeito que funciona é um
iframe de largura fixa, que tem viewport própria. Cole no console do navegador com o app
aberto:

```js
for (const w of [360, 390, 768]) {
  const f = document.createElement('iframe');
  f.style.cssText = `position:fixed;left:-9999px;width:${w}px;height:1200px`;
  f.src = '/'; document.body.appendChild(f);
  await new Promise(r => f.onload = r);
  await new Promise(r => setTimeout(r, 800));
  const d = f.contentDocument, bt = [...d.querySelectorAll('.tabs button')];
  for (let i = 0; i < bt.length; i++) {
    d.querySelectorAll('.tabs button')[i].click();
    await new Promise(r => setTimeout(r, 250));
    const de = d.documentElement;
    const over = de.scrollWidth - de.clientWidth;
    if (over > 0) console.log(w + 'px', bt[i].textContent, 'ESTOURA', over);
  }
  f.remove();
}
console.log('fim');
```

Hoje passa limpo: 9 abas × 3 larguras, zero estouro, zero rótulo de select cortado.

---

## 5. Decisões que eu tomei, e por quê

Estas não são óbvias no código. Se você discordar, mude — mas saiba o que está mudando.

### A Caixa é aberta para os dois

A seção 7 propunha privada — cada um lendo só a própria linha — e mandava **perguntar**
antes de abrir. Perguntado em 04/09: você escolheu abrir, igual ao artefato.

Isso simplificou muito. A versão privada precisava de:
- uma função `caixa_geral()` `security definer` devolvendo só agregados
- uma tabela `caixa_pulse` com um contador, e um gatilho em `savings`/`contribution`,
  porque **a RLS filtra o Realtime**: sem o pulso, o "geral" de um nunca subiria quando
  o outro lançasse

Tudo isso caiu. Hoje `savings` e `contribution` são tabelas compartilhadas normais.
**Como fechar de novo está escrito no fim de `supabase/02-politicas.sql`**, no lugar
exato, com o SQL pronto.

Você também escolheu que **os dois editam a coluna do outro** (igual ao artefato). A
seção 2 prometia "ela digita" em vez de "o Leo digita por ela"; se quiser apertar isso,
é trocar as duas políticas por `using (who = meu_who())`.

### A Caixa é um extrato de aportes, não uma grade de meses

A seção 10.8 pedia uma grade fixa: uma linha por mês (set/out/nov/dez), uma coluna por
pessoa, e um campo `opening` separado chamado "já guardado hoje". Em 04/09 você pediu
outra coisa — **poder criar aportes, quase como investimentos**. Foi feito.

O que mudou de verdade:

- `contribution` deixou de ter chave `(who, month)` e virou uma **lista com id próprio**,
  igual a `extra` e a `leg`: `id, who, on_date, label, amount`.
- **`savings.opening` saiu.** O que já estava guardado é o primeiro aporte da lista. Um
  jeito só de pôr dinheiro no caixa — antes eram dois, e os dois precisavam ser somados
  em todo lugar.
- **"Mês vazio" deixou de existir.** O que falta se divide pelos meses de calendário que
  ainda cabem. `mesesVazios()` e `plMesV()` foram embora; entraram `mesesAte()` e
  `plMesAte()`.
- De quebra: **a Caixa deixou de ser caso especial no merge e no store.** `setAporte()`
  sumiu — o aporte usa `insert` / `patch` / `remove`, que já existiam para as outras
  listas. São ~40 linhas de código especial a menos em `merge.ts` e `store.tsx`.

**Se o seu banco é anterior a isso, rode `supabase/03-caixa-aportes.sql`.** Ele não apaga
nada sem antes converter: cada aporte de mês vira um aporte no dia 1º daquele mês, e o
`opening` de cada um vira um aporte com a data de hoje, chamado "o que eu já tinha". Rodar
duas vezes não faz mal — ele percebe que já migrou.

Três coisas que a revisão pegou depois, e que valem saber porque são fáceis de
reintroduzir:

- **O campo de data comita no `blur`, não a cada tecla.** A lista se ordena pela data;
  comitando a cada tecla, digitar o ano "2026" grava `0002`, `0020`, `0202` no caminho —
  cada um válido de forma, cada um jogando a linha para outro lugar do extrato. O React
  move o `<div>` da linha e o navegador solta o foco do campo que está sendo digitado. A
  regra 5.15 protege o **valor** contra a outra pessoa; aqui o foco era roubado pelo
  próprio teclado. `isData()` também prende o ano entre 2000 e 2100.
- **`created_at` é comparado como número, não como texto.** A mesma linha chega em dois
  formatos: `'…T15:00:00+00:00'` pelo PostgREST e `'… 15:00:00+00'` pelo Realtime. Como
  `' ' < 'T'`, comparar texto punha toda linha vinda do Realtime antes de toda linha
  carregada, e o extrato do Leo saía numa ordem e o da Lu noutra. `Date.parse` do formato
  do Realtime dá `NaN` sem normalizar o fuso `+00` para `+00:00` — está em `ts()`.
- **A data de um lançamento é a de quem lança**, não `s.hoje`. `s.hoje` é fixado no
  servidor (UTC na Vercel) para a hidratação bater; usar isso como data de negócio faria
  um aporte das 22h no Brasil nascer com a data de amanhã.

Uma coisa que **não** foi feita, de propósito: o aporte **não** tem moeda própria. Ele
herda a moeda da pessoa (Leo em R$, Lu em €), que é como os dois já pensavam. Se um dia
alguém receber um bolo na outra moeda, aí vale acrescentar a coluna.

### "Ainda por gastar" segue a especificação, não o artefato

O artefato tem uma inconsistência: na primeira pintura, `viewCustos` escreve
`brl(tb - VOO)`, mas o `refreshSums` (que roda depois de qualquer edição) corrige para
`brl(tb - pagoBrl())`. Ou seja, o número mudava sozinho depois da primeira interação.

A seção 11.7 é explícita: `aindaPorGastar = totalReal − jaPago`. **Segui a especificação**
e usei `C.aindaPorGastar()`. O `refreshSums` do artefato concorda; só a primeira pintura
dele estava errada.

### `s.hoje` é fixado no servidor

`daysTo()` e `saveMonths()` dependem de "hoje". Se o servidor e o cliente calculassem
cada um o seu, um fuso diferente daria divergência de hidratação e o React reclamaria.
Então `load.ts` grava `hoje` no `Snapshot`, uma vez, no servidor, e as telas usam
`s.hoje`.

**Nunca use `new Date()` dentro de uma tela.** Se precisar de "agora", passe `s.hoje`.

### Os JSONs são importados crus

`src/content/index.ts` faz `import x from './avisos-dia.json'` em vez de eu ter
retranscrito o conteúdo para TypeScript. Retranscrever texto à mão é como se perde
conteúdo — um acento, uma tag `<b>`, uma linha inteira. Os JSONs são a fonte.

O preço é que `dados/` e `src/content/` são cópias. Os **scripts** leem `dados/`; o
**app** lê `src/content/`. Quando acrescentar conteúdo, copie (está na receita acima).

### O modo demonstração só existe fora de produção

Sem as variáveis do Supabase, o app monta o `Snapshot` a partir de
`dados/estado-atual-do-leo.json` e mostra as nove telas sem login. É ótimo para conferir
o visual lado a lado com o artefato.

**Publicado, isso seria servir seus dados para qualquer um que abrisse a URL.** Então
`MODO_DEMO` exige `NODE_ENV !== 'production'`. Em produção sem variáveis, a página diz
que falta configurar e não mostra dado nenhum.

Eu deixei esse furo aberto no primeiro deploy. Ele quebrou com erro de servidor antes de
expor nada — porque `dados/` não vai no bundle da função serverless — mas foi sorte, não
desenho.

### O callback aceita duas formas de link

`?code=` (fluxo PKCE, `{{ .ConfirmationURL }}`) e `?token_hash=&type=`
(`{{ .TokenHash }}`). Depende de qual variável o modelo de e-mail do Supabase usa. Com
só uma tratada, trocar o texto do e-mail quebraria a entrada silenciosamente.

---

## 6. Pedras em que eu já tropecei

Para você não gastar tempo nas mesmas.

| o que parece | o que é |
|---|---|
| `npm run seed` diz "falta configurar .env.local" | `dotenv` lê `.env`, não `.env.local`. Já resolvido em `scripts/_db.mjs`, que pede os dois explicitamente. |
| criei `src/app/api/_algo/route.ts` e dá 404 | pasta que começa com `_` é **privada** no Next e não entra no roteamento. Tire o underscore. |
| `npm run dev` explode sem Supabase | o `middleware.ts` e o `store.tsx` toleram não haver Supabase. Se você criar outro lugar que chame `createServerClient`, guarde com o mesmo teste. |
| o React reclama de hidratação | alguém usou `new Date()` numa tela. Use `s.hoje`. |
| mudei o CSS e nada aconteceu | você mudou uma classe que a tela não emite. Confira o `className` no JSX contra o seletor no CSS. |
| um campo perde o foco ao digitar | trocaram um `Field` por `<input value={...}>`. Volte para o `Field`. |
| o preço 0 aparece como "0" em vez de vazio | o artefato usa `it.pr \|\| ""`, então 0 é falsy e o campo fica vazio mostrando o placeholder. Em JSX: `value={it.price_eur \|\| null}`. |
| a Vercel diz "repository couldn't be found" | não é typo nem permissão de repo: é a conta da Vercel sem provedor de Git conectado. `vercel.com/new` → botão GitHub. |
| as variáveis de ambiente desapareceram no import | a página do import recarrega ao conectar o GitHub e perde o formulário. Ponha as variáveis **depois**, em Settings → Environment Variables. |
| o link mágico chega quebrado | a URL de produção não está em **Authentication → URL Configuration** do Supabase, em Site URL **e** em Redirect URLs (`https://.../**`). |

---

## 7. Onde as coisas moram

| | |
|---|---|
| no ar | **https://eurotrip-bice.vercel.app** |
| repositório | `github.com/leobairrao/eurotrip` — push em `main` publica sozinho |
| Vercel | projeto `eurotrip`, team `leobairrao's projects`. Só as duas variáveis `NEXT_PUBLIC_`, ambiente **Production** |
| Supabase | projeto `eurotrip`, ref `qwwmjibqlgysjembhbxs`, região `sa-east-1` (São Paulo) |
| chaves | formato novo: `sb_publishable_…` (navegador, pública por desenho) e `sb_secret_…` (só no `.env.local`, que está no `.gitignore`) |
| quem entra | `leobairrao05@gmail.com` (leo) e `luisaanandamelo@gmail.com` (lu), na tabela `app_user` |
| cadastro aberto | **desligado** em Authentication → Sign In / Providers |

**A variável de ambiente Preview não foi configurada** — só Production. Se abrir um
branch e quiser o deploy de preview funcionando, duplique as duas variáveis para Preview.

**A senha do Postgres** foi gerada na criação do projeto e não foi anotada. O app não usa
ela (só as chaves). Se precisar de `psql` direto, redefina em Settings → Database →
Reset database password.

---

## 8. O que está provado, e o que não está

### Provado

- **51 testes** rodando contra o código de produção (`src/lib/calc.ts` e
  `src/lib/merge.ts`), sobre o estado real de `dados/estado-atual-do-leo.json` — não
  contra uma cópia.
- **18 números de aceite** lidos do banco por `npm run check`.
- **Tempo real**, local e em produção sobre HTTPS: escrita vinda de fora subiu o total
  de R$ 5.337 para R$ 5.461 (+R$ 124 = € 20 × 6,20), 8 → 9 escolhidas, o dia acendeu no
  calendário — tudo sem recarregar.
- **A porta fechada**: visitante anônimo lê 0 linhas de todas as tabelas;
  `email_permitido()` recusa estranho e aceita os dois (sem diferenciar maiúscula,
  tolerando espaço); estranho pedindo cadastro recebe `422 signup_disabled`; a página sem
  login não traz nenhum dado no HTML.
- **Celular**: 9 abas × 360/390/768 = 27 combinações, zero rolagem horizontal, zero
  rótulo de select cortado.

### Não provado

- **Os dois ao mesmo tempo, em navegadores separados, com dois logins de verdade.** Eu
  simulei a Lu escrevendo direto no banco, o que exercita o mesmo caminho de Realtime e
  de mesclagem — mas não duas sessões reais. É o último item da seção 15, e depende de
  você e da Lu.
- **Comparação pixel a pixel com o artefato.** Cada tela foi traduzida classe por classe
  do artefato e revisada contra ele, e o CSS é o original sem uma regra mexida. Mas eu
  não fiz sobreposição de imagem tela por tela. Se algo parecer diferente, abra
  `referencia/artefato-v28.html` ao lado — ele é a verdade.
- **Tema claro.** O CSS tem os três estados e eu não mexi neles, mas eu só vi o app no
  tema escuro. Vale um olhar no claro.

---

## 9. Se ficar em dúvida

Na ordem que a própria especificação manda (seção 16):

1. **Abra `referencia/artefato-v28.html`** e veja como está hoje. É a verdade.
2. Procure a regra na **seção 5** e a fórmula na **seção 11** da especificação.
3. As 15 regras da seção 5 custaram uma rodada de conserto cada. Quebrar uma deixa o app
   errado de um jeito que se nota na hora.

As que mais aparecem no código:

- **5.1** noites ≠ dias. 32 em terra + 2 de voo = 34. Nunca "31 + 2".
- **5.2** só `escolhida` entra no custo.
- **5.3** pôr num dia **é** escolher; tirar do dia **não** desfaz.
- **5.4** a base sozinha não é plano — plano é texto dele ou atração marcada.
- **5.6** os avisos são fixos: não editáveis, não apagáveis, não somam.
- **5.8** prato típico não vai para dia; trocar para prato limpa a data.
- **5.9** comida não tem preço. Nenhum campo.
- **5.10** o valor conta sempre; a caixinha só decide de que lado.
- **5.11** burocracia começa em R$, transporte em €. O cálculo e o `<option>`
  pré-selecionado têm que concordar — foi assim que R$ 257 virou R$ 1.595 uma vez.
- **5.13** sugestão só entra na lista dele quando ele clica no `+`.
- **5.14** item apagado não ressuscita (`killed_seed`).
- **5.15** digitar não pode perder o foco.
