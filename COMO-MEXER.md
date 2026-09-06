# Como mexer neste app

Isto é o que eu saberia se fosse continuar. O `README.md` diz como rodar e publicar;
este arquivo diz **como a coisa funciona por dentro, o que não se pode quebrar, e onde
já pisei em falso** — para você não repetir.

Se este arquivo e a [`ESPECIFICACAO.md`](ESPECIFICACAO.md) discordarem, a especificação
manda. Ela é a fonte; isto é o mapa.

---

## 0. Onde eu parei — 05/09/2026, fim do dia

**Os sete ajustes que ele pediu estão TODOS no ar**, mais a cidade que ele pode criar.
Desenho em [`docs/superpowers/specs/2026-09-05-ajustes-do-leo-design.md`](docs/superpowers/specs/2026-09-05-ajustes-do-leo-design.md).
`npm test` 121/121; typecheck limpo; build limpo com `ƒ Middleware` no relatório.

### O que quebrou de noite, e já está consertado

**A cidade que ele cria derrubava o app inteiro.** Ele criou uma chamada "teste" e viu
"Application error: a client-side exception has occurred" — duas vezes, porque a linha
ficava no banco e o tombo se repetia a cada F5. Três telas perguntavam o nome da cidade
direto à `CT`, a lista das **11 fixas**: `CT['teste'].n` é TypeError, e não havia rede
nenhuma embaixo do app.

- Trocado por `C.nomeCidade(s, k)` em `Atracoes.tsx` (o formulário de acrescentar),
  `Roteiro.tsx` (os chips de "pôr neste dia", os dois vazios e a linha da atração) e
  `Hospedagem.tsx` (que não recebe cidade dele hoje, mas ficava a um `basesDe` de receber).
- **Segundo defeito no mesmo lugar**, que só apareceu depois de o primeiro sair: o chip de
  uma cidade dele não selecionava — `pk` conferia a existência pela `CT` e caía de volta na
  base do dia. Agora é `C.temCidade(s, k)`, que olha as duas listas.
- Helpers novos em `calc.ts`: **`temCidade`** (existe? fixa ou dele) e **`ccCidade`** (a cor
  pelo país — a `ccOf` do `content` devolve `--pine` para toda cidade dele).
- **A rede que faltava:** `src/app/error.tsx` e `src/app/global-error.tsx`. Antes, qualquer
  tropeço de tela virava a tela preta em inglês. Agora é um cartão em português dizendo que
  nada se perdeu, com "tentar de novo" e "recarregar".
- **`tests/telas.test.mjs`**: lê o próprio código e falha se alguma tela voltar a indexar
  `CT[...]` cru, apontando arquivo e linha. Provei que falha mesmo — repus o defeito e o
  teste acusou `Atracoes.tsx:487`.

**Provado no navegador, não só no `tsc`:** com a cidade "teste" no banco, abri Atrações de
Portugal, Roteiro (clicando num dia e no chip "teste") e Dicas. As três desenham, e o chip
seleciona. A linha de teste foi apagada do banco no fim.

**`npm run check` agora abre com dois X vermelhos, e não é defeito.** Quatro atrações de
Lisboa foram postas no dia 13/12 — ou seja, o app foi usado. Os números de aceite da seção
12.3 são o retrato da semeadura; o script não distingue "ele usou" de "o dado quebrou".

### O PRÓXIMO PASSO, e é só um

**Ele apagou de propósito as 35 atrações de Madrid (20) e Lisboa (15) para pesquisar de
novo, e depois se arrependeu.** Eu já restaurei pelo `seed` — as 104 estão de volta e o
`check` fechou. **O que ele quer agora é a pesquisa refeita**: atrações novas para Madrid
e Lisboa. Ele não disse quantas nem com que critério; pergunte antes de encher a lista.

Duas coisas que a restauração NÃO trouxe: as 5 de Sintra que ele tinha promovido para
`escolhida` voltaram como `backlog` (não muda dinheiro nenhum — a etiqueta vem do dia do
Roteiro desde a Fase 3), e qualquer preço ou nota que ele tenha editado depois do dia 4.

### O que está pendente de PROVA, e só ele consegue

- **O tempo real da tabela `city` e da `stay_option`.** As duas são novas, estão na
  publicação e com `replica identity full` (conferido no banco, quatro linhas de `select`
  batendo). Mas ninguém abriu dois navegadores para ver criar e apagar chegando do outro
  lado. Foi exatamente aí que a `aviso` falhou da primeira vez.
- **O celular ele já conferiu** (05/09, "parece bom"). Registro: **foi ele, não eu** — o
  `resize` do Chrome não pegou aqui, então o que eu provei foi a aritmética das grades,
  medindo numa caixa de 328px. Ele confirmou o conjunto, não as 10 abas × 3 larguras ×
  2 temas uma a uma.

### O conserto que eu prometi e NÃO fiz

**Um toque no `×` apaga para sempre, sem confirmação e sem desfazer** — e o `seed_id` vai
para `killed_seed`, o que faz até o `npm run seed` respeitar. Foi assim que as 35 sumiram
em 15 segundos. Ele concordou que precisa mudar: o `×` deve pedir confirmação no próprio
botão (primeiro toque vira "apagar?", segundo confirma, some sozinho em alguns segundos).
Vale para atração, comida, trecho, reserva, aviso e opção de hospedagem.

*(Como desfazer, se acontecer de novo: as linhas semeadas voltam tirando o `seed_id` de
`killed_seed` e rodando `npm run seed`. As criadas à mão não voltam — não têm `seed_id`.)*

### O que mudou hoje, em uma linha cada

| fase | o que é |
|---|---|
| **0** | higiene: `stripTags` fora da entrada, teto no reenvio, `killed_seed` só depois do DELETE, ordem por nome, as duas redes de segurança reconciliadas |
| **1** | o acrescentar de Reservas subiu, e nenhuma tela come mais o que foi digitado |
| **2** | "a lançar" virou "quanto custa" em toda parte; campo vazio ganhou borda |
| **3** | **o dinheiro segue o roteiro**: `day_iso` manda, `status` virou ORIGEM, painel de sugestões separado |
| **4** | as dicas saíram dos dias e viraram a aba **Dicas** (10ª); 3 alertas ficaram no dia |
| **5** | caixinha **"já paguei"** em atração e hospedagem |
| **6** | **hospedagem por país**, com opções e "é esta"; tabela `stay_option`; `stay` aposentada |
| **7** | a identidade **"Círculos"**, escolhida por ele olhando; `src/app/identidade.css` |
| **+** | **cidade que ele cria** em Atrações (tabela `city`); só de visitar, dentro dos 7 países |

**Migrações rodadas por ele hoje:** `05-hospedagem-e-pago.sql` e `06-cidades.sql`. As duas
conferidas no banco depois, pelas seis/quatro coisas que falham em silêncio.

### As armadilhas que custaram caro hoje

- **Toda tabela nova entra em SETE listas**, não quatro: RLS, publicação,
  `replica identity full`, o array `tabelas` de `store.tsx`, `PK`/`Tabela`/`LISTA` de
  `merge.ts`, o `select` e o `vazio()` de `load.ts`, e o `Snapshot`. Pôr em `LISTA` sem a
  chave no `Snapshot` **não é falha silenciosa, é queda**.
- **`load.ts` normaliza por lista branca.** Coluna nova que ele não conhece funciona na
  tela, sincroniza para o outro, **e some no primeiro F5**. Declare o campo
  **obrigatório** em `types.ts` que o `tsc` acha os lugares.
- **Um `:root` num CSS carregado depois NÃO vence o tema escuro** — os tokens dele moram
  em seletores de especificidade (0,2,0). `identidade.css` repete os três.
- **Mexer no respiro de `.mrow` estoura a grade do celular.** Subir o padding de 10/12
  para 12/16 estourou 32px num aparelho de 360. Se mexer, **meça**: clone a linha numa
  caixa de 328px e confira `scrollWidth - clientWidth`.
- **`dados/*.json` e `src/content/*.json` são cópias que precisam bater.** Nada no build
  reclama.

**Ainda sem prova: a renovação de sessão.** O `middleware.ts` ficou na RAIZ desde a
primeira publicação e por isso **nunca rodou** — o Next procura `src/middleware.ts` quando
o app vive em `src/app`. A sessão nunca se renovava, e passada a validade do token os dois
caíam na tela de entrada; é provavelmente a origem do "a Lu não consegue entrar".
Consertado em 05/09. Só o uso ao longo de horas prova. Se for mexer: depois do build, o
relatório tem que imprimir `ƒ Middleware`.

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
  ordem.ts        40    subir/descer numa lista ordenada por `position`
  entrar.ts       55    quem entra, e com que nome
  avisos-semente.ts ~76 os JSONs de aviso -> linhas da tabela `aviso`

src/components/
  Field.tsx      ~180   OS CAMPOS. Leia a seção 4 antes de tocar.
  Avisos.tsx     ~220   desenha e edita aviso — usado nas 4 telas
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
  extras.css      ~210  o que o artefato não tinha: login, presença, o extrato
                        de aportes, os controles de linha e os avisos
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
  04-avisos.sql         migração: os avisos saem do arquivo e viram tabela (05/09).
                        Depois dela, rode `npm run seed` para encher.

scripts/                rodam SÓ na sua máquina, com a chave secreta
  seed.mjs              primeira carga + reconciliação por seed_id
  import.mjs            traz o estado real do Leo
  check.mjs             os 18 números de aceite, LIDOS DO BANCO
  usuarios.mjs          cria as 2 contas e a allowlist
  link.mjs              gera link de entrada sem passar pelo e-mail

tests/                  82 testes sobre o código de produção
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
npm test          # 100 testes: as fórmulas, a mesclagem, a ordem e a escrita
npm run typecheck # TypeScript estrito
npm run build     # o build da Vercel roda isso
npm run check     # os 18 números de aceite, lidos DO BANCO
```

**Os dois medem coisas diferentes, e em 05/09 eles discordavam em silêncio** — `npm test`
85/85 verde e `npm run check` vermelho com 5 falhas, ao mesmo tempo. A causa: `npm test`
roda sobre `dados/estado-atual-do-leo.json`, que é um **retrato de 04/09**, e o `check` lê
o banco. Desde 05/09 a divisão está escrita:

- **`npm test`** prova as **fórmulas**, sobre uma fixture congelada e declarada histórica.
  Se quebrar, foi o código.
- **`npm run check`** é **o único que fala de produção**. Ele lê o banco e confere 13
  atrações escolhidas, R$ 5.337 já pago, câmbio 6,2, 34 dias, 31 noites, 32 em terra + 2
  de voo, 104 atrações, o passaporte resolvido, e mais.

E dentro do `check` há duas famílias de número: as que **o Leo mexe** (escolhidas,
backlog) mudam quando ele usa o app — um vermelho ali costuma ser ele decidindo algo, e o
número se atualiza no `check.mjs`. As que descrevem **a viagem** (34 dias, 31 noites, 12
trechos) não mudam — um vermelho ali é bug.

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

### Os controles novos moram na segunda linha, não numa coluna nova

Quando você pediu "todos os campos editáveis" (04/09), a saída óbvia seria dar uma coluna
a mais para cada campo novo: cidade em Atrações, ordem em Transporte. Não fiz isso.

Cada linha dessas telas já tinha uma **segunda linha** — a que mostrava a etiqueta do dia
e a nota, só de leitura. Ela virou a linha dos controles: nota editável, select de
cidade/país, setas de ordem. Com isso `at5` e `tr5` — as grades principais — **não
mudaram uma vírgula**, e o celular, que já era apertado com 5 e 6 colunas, não piorou.

Duas coisas que parecem detalhe e não são:

- **O select de cidade fica invisível até você passar o mouse.** Dentro do cartão
  "Lisboa", vinte linhas repetindo "Lisboa" com borda são vinte ruídos. Ele usa a mesma
  linguagem do campo de nome: sem borda, sem fundo, acende no hover.
- **Cidade vazia órfãa a linha.** A atração só aparece dentro do cartão da cidade dela;
  com `city = ''` ela some de todos e não há como achá-la de novo pela tela. O select não
  tem como devolver vazio, mas a trava custa uma linha e está lá.

### Os avisos viraram dele, e o negrito virou *asterisco*

A regra 5.6 dizia "o aviso é meu, não dele — não edita, não apaga, não soma". Em 05/09 ele
pediu tudo editável. As duas primeiras partes caíram; **a terceira continua de pé e é a que
importava: aviso não soma em conta nenhuma.**

São 45 linhas agora: 7 de cidade, 18 de dia, 4 de país, 15 do "o que eu acho que não vale"
e o "não conte duas vezes" do Transporte — este último era JSX cravado na tela.

**A decisão que carrega o resto: o corpo é texto puro, e o negrito se escreve `*assim*`.**

Podia ter guardado HTML e editado num textarea com as tags à mostra. Não dá: de manhã eu
descobri, do jeito difícil, que `stripTags` não segura um `<` sem `>` depois, e que
`dangerouslySetInnerHTML` engole a frase inteira a partir dali. Guardar tag num campo que
ele edita seria reabrir aquele buraco em 45 lugares novos.

O asterisco resolve os dois lados: `marcado()` **escapa tudo primeiro** e só depois deixa
`*x*` virar `<b>`, então o único HTML que existe é o que essa função produz. E é a
convenção do WhatsApp, que é onde ele já escreve assim. Conferi antes de decidir: nenhum
dos 49 textos semeados tinha asterisco, então a troca não colidiu com nada.

**Uma fonte só para a semeadura.** `src/lib/avisos-semente.ts` traduz os JSONs em linhas, e
é importado por dois lugares que precisam concordar: o `npm run seed` e o modo
demonstração. Se divergissem, a demonstração deixaria de valer como ensaio da tela real.
Foi por isso que `npm run seed` passou a rodar com o resolvedor de TypeScript
(`scripts/_ts.mjs`, o mesmo dos testes) — antes ele só lia JSON.

**O formulário de acrescentar fica recolhido atrás de um `+ aviso`.** Aberto, ele apareceria
embaixo de cada uma das 11 cidades e de cada um dos 34 dias do Roteiro. E o botão `mexer`
só aparece no hover — no toque, onde não há hover, ele fica sempre visível a 70%.

### O middleware nunca rodou — e ninguém tinha percebido

Achado na revisão de 05/09, e é anterior a tudo: `middleware.ts` estava na **raiz** do
repositório. Como o app vive em `src/app`, o Next procura em `src/middleware.ts` — então o
arquivo nunca foi compilado. O `middleware-manifest.json` saía com `"middleware": {}` e o
relatório do build não imprimia a linha `ƒ Middleware`.

O efeito: **a sessão nunca era renovada**. Passada a validade do token, quem estivesse
logado caía na tela de entrada sem entender por quê. É bem provável que boa parte do
"não consigo entrar" viesse daqui, e não do e-mail.

Se mexer nisso, o teste é objetivo: depois de `npm run build`, o relatório tem que
imprimir `ƒ Middleware` e `.next/server/middleware-manifest.json` tem que listar `/`.

### A entrada é só o nome — e isso foi uma escolha, não um descuido

Em 04/09 a Lu não conseguia entrar pelo link mágico e o Leo pediu: digitar `luananda` ou
`leobairrao` e entrar, **sem verificação nenhuma**. Foi dito a ele, em texto, o que isso
custa — o site é público, e quem digitar o nome entra, vê quanto os dois já guardaram e
pode editar tudo. Ele decidiu assim mesmo. Está aqui para que ninguém depois pense que
foi esquecimento.

**Como a sessão nasce.** O Supabase precisa de alguma credencial para emitir sessão, e a
sessão é o que faz a RLS funcionar (as políticas olham `auth.uid()`). Então existe uma
senha de servidor, **igual para as duas contas**, que mora só em `ENTRAR_SENHA` e nunca
chega ao navegador. Ela não protege nada: o nome é a porta. Ela é só o jeito de pedir a
sessão.

**O repositório é público**, então essa senha não pode entrar em arquivo nenhum daqui.
Ela vive em dois lugares: `.env.local` (a máquina dele) e as variáveis de ambiente da
Vercel. Sem ela, `/auth/entrar` devolve 503 e a tela de entrada diz exatamente isso, em
vez de um "não deu certo" genérico.

**Para fechar o site de novo** — se um dia ele quiser — o caminho mais curto é acrescentar
um campo de senha na tela, mandar o que foi digitado no corpo do POST e usar isso no
`signInWithPassword` em vez de `ENTRAR_SENHA`. Aí a variável some, a senha passa a ser dos
dois, e nada mais muda: nem a RLS, nem o `app_user`, nem o Realtime.

O login por e-mail continua existindo no banco (`email_permitido`, `/auth/callback`); só
não tem mais tela. Serve de porta dos fundos se a variável sumir.

### Nota virou texto do usuário — e isso quebrou duas telas que nem foram tocadas

O erro mais caro desta mudança não estava em nenhuma das quatro telas que eu editei.

Enquanto a nota era só semeada, pintá-la com `dangerouslySetInnerHTML` era seguro: o HTML
era meu. No instante em que ela virou campo, quatro `<Nota html={...}>` no **Roteiro** e
uma concatenação no **Painel** passaram a jogar texto dele dentro de innerHTML — e
`stripTags` **não** protege disso, porque a regex é `/<[^>]*>/g` e só come um `<` que
tenha `>` depois.

Escreva numa nota `confirmar <ver e-mail da CP`. O campo mostra tudo. O Roteiro mostra
`confirmar ` e engole o resto, sem erro, sem aviso — exatamente o que a seção 8 promete
que nunca acontece. Hoje o Roteiro pinta a nota como texto e o Painel escapa com
`escHtml()`, que existe só para isso.

**A lição, se você mexer nisso de novo:** ao abrir uma coluna para escrita do usuário,
procure TODOS os lugares que a leem — `grep -n "\.note" src/screens/`. Quem lê pode estar
numa tela que você nem abriu.

### Reordenar mexe com o foco de quem está digitando

Até as setas existirem, nenhuma lista do app se reordenava sozinha em tempo de execução —
`position` era imutável pela tela. Com elas, um clique da outra pessoa chega pelo Realtime,
a lista reordena e o React **move o `<div>` da linha no DOM**; um elemento com foco que é
reinserido perde o foco. A regra 5.15 protege o **valor** do campo, não a **posição** da
linha.

`useOrdemEstavel` (em `store.tsx`, ao lado do resto da máquina de foco) congela o
rearranjo enquanto há um campo daquela lista com o cursor dentro. Item novo entra e item
apagado sai na hora; só a troca de lugar espera o dedo sair.

E `porPosicao` desempata pelo id. Duas pessoas movendo no mesmo instante são escritas por
campo, sem transação — dá para acabar com duas linhas no mesmo número. Empatado é feio;
**divergente é mentira**, e sem desempate cada navegador ordenaria as empatadas do seu
jeito. A ordem É a sequência da viagem (10.5).

### A ordem se renumera, em vez de trocar dois números

`mover()` em `src/lib/ordem.ts` podia ser três linhas: acha os dois, troca as posições.
Ele renumera a lista inteira de 0 a n−1 e escreve só quem mudou de lugar. O motivo é que
apagar do meio deixa buraco (0, 5, 9) e um bug antigo pode ter deixado duas linhas com o
mesmo número — e duas linhas empatadas, trocando só os números entre si, **nunca mais se
separam**. Renumerando, a lista se conserta sozinha no primeiro movimento. Há teste para
os dois casos.

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
| Vercel | projeto `eurotrip`, team `leobairrao's projects`. Três variáveis em **Production**: as duas `NEXT_PUBLIC_` e `ENTRAR_SENHA` (Secret) |
| Supabase | projeto `eurotrip`, ref `qwwmjibqlgysjembhbxs`, região `sa-east-1` (São Paulo) |
| chaves | formato novo: `sb_publishable_…` (navegador, pública por desenho) e `sb_secret_…` (só no `.env.local`, que está no `.gitignore`) |
| quem entra | usuário `leobairrao` (leo) e `luananda` (lu) — o mapa está em `src/lib/entrar.ts` |
| cadastro aberto | **desligado** em Authentication → Sign In / Providers |

**As variáveis de Preview não foram configuradas** — só Production. Se abrir um branch e
quiser o deploy de preview funcionando, duplique as **três** para Preview. Com só as duas
`NEXT_PUBLIC_`, o preview sobe, mostra a tela de entrada e recusa todo mundo com 503.

**A senha do Postgres** foi gerada na criação do projeto e não foi anotada. O app não usa
ela (só as chaves). Se precisar de `psql` direto, redefina em Settings → Database →
Reset database password.

---

## 8. O que está provado, e o que não está

### Provado

- **82 testes** rodando contra o código de produção (`src/lib/calc.ts` e
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
- **5.6** ~~os avisos são fixos~~ **revista em 05/09**: ele edita e apaga. Só continua valendo que **não somam** em conta nenhuma.
- **5.8** prato típico não vai para dia; trocar para prato limpa a data.
- **5.9** comida não tem preço. Nenhum campo.
- **5.10** o valor conta sempre; a caixinha só decide de que lado.
- **5.11** burocracia começa em R$, transporte em €. O cálculo e o `<option>`
  pré-selecionado têm que concordar — foi assim que R$ 257 virou R$ 1.595 uma vez.
- **5.13** sugestão só entra na lista dele quando ele clica no `+`.
- **5.14** item apagado não ressuscita (`killed_seed`).
- **5.15** digitar não pode perder o foco.
