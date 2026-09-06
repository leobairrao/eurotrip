# Eurotrip 2026 — especificação para reconstruir como site

**Para quem for construir:** este documento é a especificação completa de um app que já
existe e já está em uso. Não é um brief aberto — é a descrição de um comportamento que foi
ajustado ao longo de 28 versões com o usuário. **Onde o documento é específico, siga.**
Onde ele não diz, use bom senso e pergunte antes de inventar tela nova.

O app atual roda como uma página única no claude.ai. Ele funciona, mas guarda tudo dentro do
próprio HTML, o que só permite **um** editor. Esta reconstrução existe por um motivo só:
**duas pessoas mexendo no mesmo dado, ao mesmo tempo, sem perder nada.**

---

## 1. O que é, e para quem

Um app de planejamento para **uma viagem específica**, de **duas pessoas específicas**:

| | |
|---|---|
| **Leo** | brasileiro, sai de Florianópolis. É quem monta o roteiro. Pensa em **R$** |
| **Lu** | namorada dele, **au pair no Luxemburgo**. Encontra o Leo em 19/12. Ganha e pensa em **€** |
| **Viagem** | 10/12/2026 a 12/01/2027 — **34 dias**, 8 bases, 7 países |
| **Voo internacional** | já pago: **R$ 5.079,77** (GRU–MAD ida e volta) |
| **Orçamento** | teto de R$ 19.920 além do voo. A estimativa atual fecha em ~R$ 16.770 |

Não é um app genérico de viagem. As datas são fixas, as cidades são fixas, e o conteúdo
(atrações, comidas, avisos) já está escrito e vem pronto nos JSONs deste pacote.

### O perfil do Leo, que explica quase toda decisão de produto

Isto não é enfeite — é o que define o que o app enfatiza:

- **Economia é a prioridade número um.** Bairro barato, mas não perigoso.
- *"todas as hospedagens vou querer ficar em um lugar mais longe para pagar mais barato"*
- *"passeios eu vou em um ou outro, no mais eu quero conhecer a rua, comidas e construções"*
- Gosta de **centros, grandes construções, cartões-postais e vistas.** Museu ou palácio só se
  for enorme.
- **O custo mostrado é o dele, não uma estimativa.** Ele foi explícito: *"conte o meu custo
  real, não as suas sugestões"*. Nada entra numa soma sem ele ter digitado.
- Respostas e telas curtas, em tabela quando der.

### Cidades que foram cortadas e NÃO devem voltar
**Barcelona, Berlim, Cracóvia/Auschwitz, Bruxelas.** Aparecem em comentários e no conteúdo de
comidas por resquício histórico; não crie tela nem entrada de roteiro para elas.

---

## 2. O que muda em relação ao app de hoje

| | hoje | no site novo |
|---|---|---|
| onde os dados moram | dentro do HTML publicado | Postgres (Supabase) |
| quem pode editar | só o Leo | **Leo e Lu**, ao mesmo tempo |
| como o outro vê | página inteira recarrega | **atualiza no lugar**, sem recarregar |
| conflito | quem salva por último apaga o outro | **campo a campo**, ninguém apaga ninguém |
| botão salvar | existe, e é manual | **não existe** — salva ao digitar |
| a Caixa da Lu | o Leo digita por ela | **ela digita, e o valor dela é privado** |

**Tudo o resto deve continuar igual.** As 9 abas, as fórmulas, os textos, as cores.

---

## 3. Decisões já tomadas

Não reabra estas; foram escolhidas com o usuário.

| decisão | escolha |
|---|---|
| hospedagem | **Vercel** |
| banco | **Supabase** (Postgres + Realtime + Auth) |
| login | **nome de usuário, sem verificação** (mudou em 04/09; ver seção 9) |
| quem entra | **dois nomes**: `leobairrao` e `luananda`. A allowlist de e-mails continua no banco |
| visual | **igual ao atual, pixel a pixel** — o CSS vem pronto em `referencia/estilo-atual.css` |
| idioma | **português do Brasil**, em tudo |
| framework | livre. Next.js App Router é o caminho natural na Vercel |

**Não** introduza: internacionalização, tema configurável, onboarding, tour, landing page,
convites, papéis além dos dois, notificações, PWA, app nativo. O app tem dois usuários e uma
viagem.

---

## 4. Os arquivos deste pacote

```
ESPECIFICACAO.md              este documento
dados/
  paises-cidades.json         os 7 países e as 11 cidades, com as cores de cada país
  atracoes-dele.json          35 atrações que o Leo mandou     → entram como "backlog"
  atracoes-sugeridas.json     69 atrações pesquisadas          → entram como "sugerida"
  avisos-cidade.json          o aviso duro de 7 cidades
  dias-bases.json             os 34 dias e a base (cidade) de cada um
  avisos-dia.json             o fato operacional de 18 dias    → não editável
  comidas-dele.json           o que o Leo já anotou de comida
  comidas-sugeridas.json      sugestões de comida por país. O arquivo tem 9 entradas, mas
                              só 7 valem: 'be' e 'pl' são resquício de Bruxelas e Cracóvia,
                              que foram cortadas. Ignore essas duas
  reservas-dele.json          5 itens de burocracia
  reservas-sugeridas.json     13 sugestões de reserva
  hospedagem.json             7 bases com bairro, ressalva de segurança e justificativa
  transportes.json            os 12 trechos entre bases, com o tipo de cada um
  estado-atual-do-leo.json    O QUE ELE JÁ PREENCHEU. Tem que ser importado — ver seção 12
referencia/
  estilo-atual.css            o CSS do app atual, na íntegra
  artefato-v28.html           o app atual inteiro, funcionando. Abra num navegador
```

**`referencia/artefato-v28.html` abre e roda offline.** Antes de escrever qualquer tela, abra
esse arquivo e clique em tudo. É mais rápido que ler esta especificação, e é a verdade.

---

## 5. As 15 regras que não se negociam

Cada uma custou uma rodada de conserto. Se você quebrar uma, o app fica errado de um jeito
que o usuário vai notar na hora.

### 5.1 — Noites ≠ dias. A ponte entre 31 e 34 são os dias em terra.
```
34 dias de viagem  =  32 dias em terra  +  2 dias só de voo
32 dias em terra   →  31 noites de cama   (na última ele dorme no avião)
```
**Nunca escreva "31 + 2 = 34".** Isso já foi publicado errado uma vez. A última base perde
uma noite porque o voo de volta sai 23h35 do último dia.

### 5.2 — ~~Só o que está marcado como **escolhida**~~ **Só o que está num dia do Roteiro** entra no custo.

> **Revista em 05/09/2026.** A regra dizia: *"atração tem três situações — `escolhida`,
> `backlog`, `sugerida` — e o custo real soma apenas `escolhida`"*. O código obedecia. O
> resultado no banco dele: **15 atrações marcadas `escolhida` e 14 delas em dia nenhum**,
> somando R$ 793,60 no total real. Ele disse: *"total real até agora não faz sentido, está
> contando passeios que não estão em lugar nenhum, deve contar apenas o que foi adicionado,
> se foi retirado o valor deve diminuir (acompanhar o roteiro)"*.

**`day_iso` é a única verdade sobre uma atração** — para a etiqueta e para o dinheiro. A
etiqueta na lista é **derivada e não clicável**: *no roteiro* ou *backlog*.

`status` **não morreu**: continua a mesma coluna, com o mesmo `check` e os mesmos três
valores, e passou a significar **origem**. As três famílias são exclusivas e cobrem tudo:

| família | quem é | entra no custo? |
|---|---|---|
| **roteiro** | tem `day_iso` | **sim** |
| **fora** | dele, sem dia | não — é a linha *"fora do roteiro somaria mais € X"* |
| **pesquisa** | `sugerida` sem dia | não — a camada que eu pesquisei, com painel e total próprios |

**A linha "fora do roteiro somaria mais € X" não é enfeite.** Sem ela, no dia em que isto
subiu o total caiu de R$ 5.821 para R$ 5.337 e o *"ainda por gastar"* virou **R$ 0,00** —
porque nenhum trecho e nenhuma hospedagem tem valor lançado ainda. Zero não é um número
honesto ali; é um app que parece quebrado. E ela protege o erro inverso: os € 78 de Sintra
são bate-volta real (regra 5.12) e, enquanto não tiverem dia, o total **subestima** a
viagem em R$ 483,60.

**Transporte, hospedagem e burocracia NÃO seguem o roteiro**, de propósito — ver 5.10.

### 5.3 — Pôr uma atração num dia **é** escolhê-la. ~~Tirar do dia não desfaz.~~

> **Revista em 05/09/2026, junto com a 5.2.** A segunda metade dizia: *"tirar do dia NÃO
> desfaz — o item continua escolhido, só perde a data"*. Era ela que deixava um passeio
> somar dinheiro depois de ter saído do roteiro.

Ao atribuir um dia, a situação vira `escolhida` automaticamente — isso continua, e agora
**também adota** a sugestão para a lista dele. **Tirar do dia continua não mexendo no
`status`**, mas agora **tira o dinheiro do total na hora**, que é o que ele pediu.

Consequência deliberada, registrada para não ser descoberta depois: com o uso, tudo que
passar por um dia vira `escolhida`, e o corte atual entre a lista dele e o backlog deixa
de ser recuperável pela coluna.

### 5.4 — A base do dia sozinha não é "plano".
Um dia conta como planejado se tem **texto escrito pelo usuário** ou **pelo menos uma atração
marcada**. A cidade onde ele dorme já vem preenchida nos 34 dias e não conta.

### 5.5 — O texto dos dias começa **vazio**, de propósito.
Ordem dele: *"deixe todo o roteiro em branco, eu vou preencher com base nas minhas escolhas de
atrações"*. As **bases** (cidades) vêm preenchidas; o campo de texto de todos os 34 dias vem
vazio. Não preencha com sugestão.

### 5.6 — Os avisos ~~são meus~~ **são dele**, e não somam.

> **Revista em 05/09/2026.** A regra dizia: *"os avisos de dia e de cidade são meus, não
> dele — não edita, não apaga, não soma"*. O Leo pediu que **tudo** fosse editável, e
> escolheu isso sabendo que implicava tabela nova. As duas primeiras partes caíram; a
> terceira continua de pé, e é a que importava:

**AVISO NÃO SOMA EM CONTA NENHUMA.** Nem no custo real, nem na estimativa, nem na Caixa.
Ele é recado, não dinheiro.

O que mudou na prática:

- Os avisos saíram dos arquivos e viraram linhas da tabela `aviso` (`supabase/04-avisos.sql`).
  Os JSONs de `src/content` continuam sendo a **semente**: `npm run seed` os traduz em
  linhas, uma vez, e daí em diante quem manda é o banco.
- Cada aviso tem `spot` (onde aparece), `tone` (a cor), título, corpo e posição. São
  **45**: 7 de cidade, 18 de dia, 4 de país, 15 do "o que eu acho que não vale", e o
  "não conte duas vezes" do Transporte.
- **O corpo é texto puro.** Negrito se escreve `*assim*`, entre asteriscos, como no
  WhatsApp — `marcado()` em `fmt.ts` é o único lugar do app que transforma isso em HTML,
  e ele escapa tudo antes. Foi assim que o `<b>` das minhas notas sobreviveu à mudança
  sem reabrir o buraco de 04/09, em que um `<` solto engolia o resto da frase.
- Regra 5.14 continua valendo: aviso apagado tem o `seed_id` gravado em `killed_seed` e
  **não volta** na próxima semeadura.

### 5.7 — A diária de hospedagem é a **cheia do anúncio**, não a parte dele.
Ordem explícita: *"deixe a diaria total, não a minha parte"*. A divisão entre os dois é
resolvida fora do app.

### 5.8 — Prato típico não vai para dia.
Comida tem três tipos: **prato**, **restaurante**, **café**. Prato é lista de desejo, sem data.
Restaurante e café são lugares e podem ser marcados num dia. Trocar o tipo de um item para
"prato" **limpa a data dele**.

### 5.9 — Comida não tem preço.
Nenhum campo de valor em comida. O custo de comer vive na estimativa e na Caixa, não no custo
real. Só atração, hospedagem, transporte, burocracia e linhas livres têm valor.

### 5.10 — Transporte, burocracia **e hospedagem**: o valor conta sempre; a caixinha só decide de que lado.
Todo trecho com valor entra no **custo total**. A caixinha **comprado** decide se ele aparece
como **"já pago"** ou como **"previsto"**. Mesma regra para os itens de burocracia (reservas).

> **Estendida em 05/09/2026.** Quando a 5.2 passou a fazer **atração** seguir o roteiro,
> ficou a pergunta se os outros três seguiriam também. **Não seguem**, e o motivo é
> concreto: dois dos doze trechos são **agrupamentos que por decisão dele nunca vão ter
> dia** ("Bate-voltas de Metz no TER" e "Reims ⇄ Paris no TER" — e "Metz ⇄ Luxemburgo, 24
> e 25" tem a mesma cara); **hospedagem é por cidade e não tem data nenhuma**; e passaporte
> e seguro também não têm dia. Fazer os três seguirem o roteiro esconderia dinheiro que ele
> vai pagar de verdade. **Hospedagem não estava escrita nesta regra e passou a estar.**

### 5.11 — A moeda de burocracia começa em **R$**; a de transporte, em **€**.
Passaporte, seguro e cartão são pagos no Brasil. Trem e voo europeu, em euro. **O cálculo e o
valor pré-selecionado do seletor têm que concordar** — esse desencontro já causou um bug em que
R$ 257 apareceu como R$ 1.595.

### 5.12 — Bate-volta cujo transporte já está no preço da atração não entra em transporte.
Sintra, Cascais, Toledo, Segovia, Ávila, Utrecht, Ostia, Nápoles, Florença: o trem já está no
preço da atração. Contar de novo em transporte é contar duas vezes. A tela de transporte é só
**perna entre bases**, e tem um aviso dizendo isso.

### 5.13 — O que eu sugiro nunca vira "dele" sozinho.
Toda sugestão (atração, comida, reserva) só entra na lista do usuário quando **ele clica no +**.
Nunca mova nada da camada de pesquisa para a dele automaticamente.

### 5.14 — Item apagado não ressuscita.
O conteúdo semeado é reconciliado a cada carga: o que não existe é acrescentado, o que o
usuário apagou **nunca volta**. Ver seção 12.

### 5.15 — Digitar não pode perder o foco do campo.
No app atual, digitar um valor atualiza os números grandes **no lugar**, sem re-renderizar a
lista. Num framework reativo isso sai de graça, mas **não re-monte a lista a cada tecla** e não
formate o número enquanto ele digita.

---

## 6. Modelo de dados

Postgres. Chaves em inglês, conteúdo em português. Ids `uuid` com `gen_random_uuid()`.

### 6.1 — Princípio: uma linha por coisa editável

O erro a evitar é guardar um JSON grande com o estado inteiro — foi exatamente isso que
impediu duas pessoas de editar. **Cada atração, cada trecho, cada aporte é uma linha.** Dois
usuários mexendo em linhas diferentes nunca colidem.

### 6.2 — Tabelas

```sql
-- ---------- quem pode entrar ----------
-- Só estes e-mails. Popule com os dois e-mails reais antes do primeiro deploy.
create table app_user (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  -- 'leo' | 'lu'. Define de quem é a coluna na Caixa.
  who         text not null check (who in ('leo','lu')),
  created_at  timestamptz not null default now()
);

-- ---------- 1. os 34 dias ----------
create table day (
  iso         date primary key,              -- 2026-12-10 .. 2027-01-12
  base        text not null default '',       -- a cidade onde dorme. Vem semeada
  plan        text not null default '',       -- o texto DELE. Começa vazio (regra 5.5)
  updated_at  timestamptz not null default now(),
  updated_by  uuid references app_user(id)
);

-- ---------- 2. atrações ----------
-- Lista única. A situação (status) é o que separa dele / backlog / sugestão.
create table attraction (
  id          uuid primary key default gen_random_uuid(),
  city        text not null,                  -- chave de cidade: 'lisboa', 'madrid'...
  name        text not null,
  price_eur   numeric(10,2) not null default 0,
  note        text not null default '',       -- pode conter <b> e <i>. Ver seção 10.0
  status      text not null default 'backlog'
              check (status in ('escolhida','backlog','sugerida')),
  kind        text not null default 'passeio'
              check (kind in ('passeio','tour')),
  day_iso     date references day(iso) on delete set null,   -- null = sem dia
  seed_id     text unique,                    -- 'm:lisboa:0' | 's:roma:4'. Null se ele criou
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on attraction (city);
create index on attraction (day_iso);

-- ---------- 3. comidas ----------
create table food (
  id          uuid primary key default gen_random_uuid(),
  country     text not null,                  -- 'pt','es','fr','lu','de','nl','it'
  name        text not null,
  note        text not null default '',
  kind        text not null default 'prato'
              check (kind in ('prato','restaurante','cafe')),
  day_iso     date references day(iso) on delete set null,   -- sempre null se kind='prato'
  seed_id     text unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index on food (country);
alter table food add constraint prato_sem_dia
  check (kind <> 'prato' or day_iso is null);   -- regra 5.8 no banco

-- ---------- 4. transporte ----------
create table leg (
  id          uuid primary key default gen_random_uuid(),
  position    int not null,                   -- ordem do roteiro. NÃO ordene por nome
  name        text not null,                  -- 'Madrid → Cáceres'
  note        text not null default '',
  kind        text not null default 'trem'
              check (kind in ('trem','aviao','onibus','carro')),
  amount      numeric(10,2),                  -- null = ainda não lançou
  currency    text not null default 'eur' check (currency in ('eur','brl')),
  bought      boolean not null default false, -- a caixinha "comprado" (regra 5.10)
  day_iso     date references day(iso) on delete set null,
  seed_id     text unique,                    -- 't:0' .. 't:11'
  updated_at  timestamptz not null default now()
);

-- ---------- 5. burocracia ----------
create table booking (
  id          uuid primary key default gen_random_uuid(),
  position    int not null,
  name        text not null,
  note        text not null default '',
  amount      numeric(10,2),
  currency    text not null default 'brl' check (currency in ('eur','brl')),  -- regra 5.11
  done        boolean not null default false,
  seed_id     text unique,
  updated_at  timestamptz not null default now()
);

-- ---------- 6. hospedagem ----------
-- Uma linha por base. As 7 linhas vêm semeadas e não se cria nem apaga base aqui.
create table stay (
  city        text primary key,
  address     text not null default '',
  check_in    text not null default '',       -- texto livre: 'dia 12 · 15h'
  check_out   text not null default '',
  nightly_eur numeric(10,2),                  -- a diária CHEIA do anúncio (regra 5.7)
  nights      int,
  total_eur   numeric(10,2),                  -- se preenchido, IGNORA nightly × nights
  link        text not null default '',
  notes       text not null default '',
  updated_at  timestamptz not null default now()
);

-- ---------- 7. linhas livres de custo ----------
create table extra (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  amount      numeric(10,2),
  currency    text not null default 'eur' check (currency in ('eur','brl')),
  created_at  timestamptz not null default now()
);

-- ---------- 8. Caixa: quanto cada um guardou ----------
-- Uma linha por pessoa. 'currency' é a moeda em que ELA pensa.
create table savings (
  who         text primary key check (who in ('leo','lu')),
  goal        numeric(10,2),                  -- a meta dela
  opening     numeric(10,2),                  -- o que já tem hoje
  currency    text not null default 'brl' check (currency in ('eur','brl')),
  updated_at  timestamptz not null default now()
);
-- Um aporte por pessoa por mês.
create table contribution (
  who         text not null check (who in ('leo','lu')),
  month       text not null,                  -- '2026-09' .. '2026-12'
  amount      numeric(10,2),
  updated_at  timestamptz not null default now(),
  primary key (who, month)
);

-- ---------- 9. configuração ----------
create table settings (
  id              int primary key default 1 check (id = 1),
  eur_rate        numeric(6,2) not null default 6.00,   -- R$ por euro. Ele já pôs 6,20
  flight_paid_brl numeric(10,2) not null default 5079.77
);
insert into settings (id) values (1) on conflict do nothing;

-- ---------- 10. sementes apagadas ----------
-- Regra 5.14: seed_id que o usuário apagou nunca volta.
create table killed_seed (
  seed_id     text primary key,
  killed_at   timestamptz not null default now()
);
```

### 6.3 — Conteúdo que NÃO vai para o banco

Ficam como constantes no código, porque não são editáveis e não contam em nada:

| constante | fonte | por quê |
|---|---|---|
| países e cidades | `paises-cidades.json` | estrutura fixa da viagem |
| avisos de dia (18) | `avisos-dia.json` | **semente** da tabela `aviso` (5.6, revista) |
| avisos de cidade (7) | `avisos-cidade.json` | **semente** da tabela `aviso` (5.6, revista) |
| sugestões de comida | `comidas-sugeridas.json` | camada de pesquisa; o + copia para `food`. **Só os 7 países de `paises-cidades.json`** — `be` e `pl` são resquício de cidades cortadas |
| sugestões de reserva | `reservas-sugeridas.json` | idem, o + copia para `booking` |
| textos de hospedagem | `hospedagem.json` (`res`, `warn`, `area`) | é a justificativa do bairro, não dado dele |
| a estimativa (€ 2.795) | esta especificação | referência, não entra em soma |

**Atenção em `hospedagem.json`:** o arquivo mistura duas coisas. `c`, `area`, `res`, `warn` e
`free` são **conteúdo fixo** (código). Os campos que o usuário preenche vivem na tabela `stay`.

---

## 7. Quem lê o quê (RLS)

Ligue Row Level Security em todas as tabelas. O modelo é simples porque são duas pessoas que
planejam a mesma viagem:

| tabela | ler | escrever |
|---|---|---|
| `day`, `attraction`, `food`, `leg`, `booking`, `stay`, `extra`, `settings`, `killed_seed` | os dois | os dois |
| `savings`, `contribution` | **só a própria linha** | **só a própria linha** |
| `app_user` | os dois (para saber quem é quem) | ninguém pelo app |

**A Caixa é a única coisa privada, e é de propósito.** A Lu lança o aporte dela e o Leo não vê
o número dela por pessoa; ele vê **o total dos dois** na aba geral. Isso vem da forma como ele
descreveu a aba: *"deve ter um geral, uma para mim e uma para a Lu"*.

> Se ao construir isso ficar estranho na prática — os dois estão poupando para a mesma viagem —
> **pergunte ao Leo antes de abrir**. Não abra por conveniência de implementação.

O "geral" precisa somar dois valores que nenhum dos dois pode ler individualmente. Resolva com
uma **view ou função `security definer`** que devolve só os agregados (total, meta, falta),
nunca as linhas.

```sql
alter table savings enable row level security;
create policy "só a própria" on savings for all
  using (who = (select who from app_user where id = auth.uid()))
  with check (who = (select who from app_user where id = auth.uid()));
```

E o portão de entrada, em toda tabela compartilhada:
```sql
create policy "só os dois" on attraction for all
  using (exists (select 1 from app_user where id = auth.uid()))
  with check (exists (select 1 from app_user where id = auth.uid()));
```

---

## 8. Tempo real

**É o motivo de existir deste projeto.** Não trate como enfeite.

- Assine as mudanças de todas as tabelas compartilhadas (Supabase Realtime, `postgres_changes`).
- Quando chega uma mudança, **atualize só o que mudou** — não recarregue a página, não perca a
  posição da rolagem, e **não roube o foco de um campo que a outra pessoa está digitando**.
- **Nunca sobrescreva um campo que está com o foco no cliente local.** Se a Lu está digitando o
  aporte dela e chega uma mudança do Leo, aplique a dele em tudo menos no campo em foco.
- Escrita: **por campo, com debounce de ~400 ms**. Um `update` de uma coluna, não da linha
  inteira, para dois `update` simultâneos em colunas diferentes não se apagarem.
- Último a escrever ganha, **por campo**. É suficiente aqui e não precisa de resolução de
  conflito. O que não pode acontecer é o de hoje: salvar um campo e apagar dez.
- Mostre discretamente quem está online, se for barato (Supabase Presence). Um pontinho e o
  nome. **Não** faça cursores compartilhados nem avatares grandes.

### O que fazer quando a rede cai
Escreva otimista na tela e enfileire. Se a escrita falhar, mostre um aviso discreto e tente de
novo; **nunca** descarte o que ele digitou em silêncio. Não invente modo offline completo.

---

## 9. Login

> **Mudou em 04/09/2026 — não é mais link mágico.** A Lu não conseguia entrar pelo e-mail,
> e o Leo pediu para trocar por **nome de usuário sem verificação nenhuma**: digitar
> `luananda` ou `leobairrao` e entrar. Foi dito a ele, por escrito, o que isso custa — o
> site é público, e quem digitar o nome vê tudo e edita tudo. Ele decidiu assim. Está
> registrado aqui e em `COMO-MEXER.md` para ninguém depois achar que foi descuido, e para
> ninguém "consertar" de volta.
>
> O que vale hoje:
>
> 1. Tela de entrada com **um campo de usuário** e um botão. Nada mais.
> 2. `POST /auth/entrar` traduz o nome em e-mail (`src/lib/entrar.ts`) e abre a sessão com
>    `signInWithPassword`, usando uma senha de servidor igual para as duas contas que mora
>    só em `ENTRAR_SENHA` e **nunca chega ao navegador**. Ela não protege nada: o nome é a
>    porta. É só o jeito de pedir a sessão ao Supabase, que é o que faz a RLS funcionar.
> 3. Nome fora da lista, corpo estranho, qualquer coisa: **sempre** a mesma resposta,
>    401 `nao-e-da-casa`, e a tela diz que o app é privado. Nunca diz se existe ou não, e
>    nunca mostra mensagem crua do Supabase.
> 4. Sem `ENTRAR_SENHA`: 503, e a tela diz exatamente isso.
>
> O item 5 abaixo (renovação de sessão) **continua valendo** — e note que o middleware tem
> que ficar em `src/middleware.ts`, não na raiz. Ver `COMO-MEXER.md`.
>
> O texto original fica abaixo, riscado, porque descreve o que o banco ainda sabe fazer:
> `email_permitido` e `/auth/callback` continuam de pé, só sem tela.

~~Supabase Auth, **magic link**, e uma allowlist de dois e-mails.~~

1. Tela de entrada com um campo de e-mail e um botão. Nada mais — sem cadastro, sem senha, sem
   "entrar com", sem texto de marketing.
2. E-mail fora da allowlist: mensagem clara de que o app é privado. **Não** diga se o e-mail
   existe ou não.
3. Depois de entrar, a sessão persiste. Ninguém quer logar de novo toda semana.
4. Quem está logado aparece num canto, com um "sair".
5. A allowlist vive na tabela `app_user`, semeada por SQL antes do primeiro acesso.

O `who` (`leo` | `lu`) vem de `app_user` e define **duas coisas**: qual linha da Caixa é dele, e
qual sub-aba da Caixa abre por padrão.

---

## 10. As nove telas

Ordem das abas, que é a ordem de uso:

`Painel · Roteiro · Atrações · Comidas · Transporte · Hospedagem · Reservas · Caixa · Custos`

A barra de abas **rola na horizontal no celular**, e a aba ativa é trazida para a vista ao
trocar de aba (sem rolar a página junto).

### 10.0 — Coisas que valem para todas as telas

- **Os campos de nota (`note`) contêm HTML** — `<b>` e `<i>` — vindo dos JSONs. Renderize como
  HTML **apenas o conteúdo semeado**. O que o usuário digita é **texto puro** e tem que ser
  escapado. No app atual, o texto novo passa por uma função que arranca tags antes de salvar;
  faça o equivalente.
- **Valores aceitam vírgula.** `"12,50"` é doze e cinquenta. A conversão é:
  troque `,` por `.`, `parseFloat`, e **se der `NaN`, vale zero**.
- **Moeda:** `R$ 1.234` (sem centavos, arredondado) e `€ 12,5` (até 2 casas, ponto de milhar
  brasileiro). Formatação `pt-BR`.
- **Campo de valor vazio é vazio, não zero.** Um trecho sem valor mostra "a lançar", não "€ 0".
- **Data curta:** `12 dez`, `2 jan`. **Longa:** `12 de dezembro`. **Dia da semana** minúsculo.
- Toda lista de itens dele tem um `×` que apaga. Se o item tem `seed_id`, apagar **grava o
  `seed_id` em `killed_seed`** (regra 5.14).

### 10.1 — Painel ("Detalhes gerais")

Só leitura. É o resumo de tudo. Nada se edita aqui.

**Quatro indicadores no topo:**

| número | texto | subtexto |
|---|---|---|
| dias até 10/12/2026 | "dias até embarcar" | "10 dez, 20h15 de Florianópolis — voo pago" |
| **34** | "dias de viagem" | "31 noites na Europa · 8 bases · 2 dias só de voo" |
| nº de atrações `escolhida` | "atrações escolhidas" | "N no backlog · N sugeridas por mim" |
| `stay` com endereço / 7 | "hospedagens fechadas" | "diária cheia, sem divisão" |

**Cinco números de dinheiro, nesta ordem** (a ordem foi pedida explicitamente):
`total já pago` · `hospedagem` · `atrações` · `transportes` · `total real até agora`.
Cada um com uma linha de contexto embaixo.

**Tabela do roteiro:** Lugar / Noites / "O que sai daqui de bate-volta". **Sem datas** — ele
pediu assim. Derivada dos dias, não escrita à mão. Rodapé: `8 bases · 31 · "32 dias em terra +
2 de voo = 34 dias de viagem"`.

**Cartão vermelho "O que ainda está aberto".** Inteiramente **derivado**, nunca escrito à mão.
Uma pendência para:
- cada `booking` com `done = false` (mostrando o valor previsto, se tiver)
- a Caixa: acumulado × meta, e quanto falta por mês. Se não há meta, o texto é outro: manda
  abrir a aba Caixa e definir
- `7 − (stay com endereço)` → hospedagens sem reserva
- `12 − (leg com bought)` → "trechos ainda não comprados"

Cada pendência tem um rótulo em caixa alta (`burocracia`, `dinheiro`, `hospedagem`,
`transporte`) **em cima do título, na largura inteira** — não numa coluna lateral estreita.
Se tudo estiver resolvido, o cartão diz "nada pendente".

**Cartão ocre "Decisões de roteiro".** Cinco itens de texto fixo (estão no HTML de referência).
São escolhas em aberto que não travam nada. Mantenha o texto.

### 10.2 — Roteiro

O coração do app. Três partes.

**(a) Calendário de dois meses** — dezembro/2026 e janeiro/2027, semana começando na segunda.
Cada dia da viagem é clicável. Marcações no quadradinho:
- **bolinha** embaixo = o dia tem plano (regra 5.4)
- **triângulo no canto** = tem aviso meu, com a cor pelo tipo (`warn` ocre, `alert` vermelho,
  `free` verde)

Embaixo, uma legenda com as contagens (N de 34 planejados, 31 noites em 8 bases, 2 dias só de
voo, N de 104 atrações com dia, N lugares de comer, N trechos com dia) **e a legenda dos
emojis** — 🚆 trem · ✈️ voo · 🚌 ônibus · 🚗 carro · 🚶 passeio pela rua · 🏛️ tour num
lugar · 🍽️ restaurante · ☕ café.

**(b) Sem dia selecionado: os blocos.** Dias consecutivos com a **mesma base** viram um cartão
("Lisboa · 12 dez → 15 dez · 4 dias"). Cada dia dentro do bloco é uma linha clicável que mostra
o texto dele, as etiquetas do que está marcado, e o aviso do dia se houver. Dias sem base caem
num cartão separado, em ocre, chamado "Dias sem base".

**(c) Com um dia selecionado: o editor**, no lugar dos blocos, com o calendário ainda visível
em cima e chips de navegação (← dia anterior · ver o roteiro inteiro · dia seguinte →).
O editor são **quatro cartões, nesta ordem**:

1. **O dia** — o aviso do dia (se houver, não editável), o campo "Onde eu durmo / qual é a
   base", o campo de texto livre "O que fazer neste dia — suas palavras", e um botão
   **"apagar o meu texto"** que limpa **só o texto** e nunca a base.
2. **"Como eu me movo neste dia"** (azul) — os trechos marcados, e abaixo chips dos 4 tipos com
   a lista de trechos livres para marcar com `+`.
3. **"Atrações deste dia"** (ocre) — as atrações marcadas com o € de cada, e abaixo chips de
   cidade (**a cidade da base do dia vem pré-selecionada**) com a lista para marcar com `+`.
4. **"Onde comer neste dia"** (laranja) — restaurantes e cafés marcados, e chips de país (**o
   país da base do dia vem pré-selecionado**) com a lista. **Prato típico não aparece aqui.**

Em cada um dos três cartões de escolha: um item **já marcado em outro dia não aparece** na
lista de disponíveis — sai só um rodapé contando quantos são. E o `×` tira do dia sem apagar o
item.

**Como a base do dia acha a cidade:** o campo é texto livre. Normalize (minúsculo, sem acento,
sem pontuação) e compare com as chaves e os nomes de cidade; aceite também quando um contém o
outro. "Amsterdã" → `amsterda`; "em trânsito" → nenhuma cidade, e aí o cartão mostra um aviso
pedindo para escrever a base ou escolher a cidade na mão.

**As etiquetas do dia** (na lista de blocos), nesta ordem: transporte, atrações, comida. Cada
uma com **o emoji do seu tipo** e o valor quando tem. No fim, uma etiqueta verde com o total do
dia (atrações + transporte, em €).

> **Mudou em 04/09/2026 — as três telas de lista.** O Leo pediu que *todos* os campos
> fossem editáveis, tanto o que ele escreveu quanto o que eu semeei. A **nota** (aquele
> texto cinza embaixo do nome) era só leitura nas quatro telas de lista; agora é campo.
> Junto vieram: **cidade** em Atrações, **país** em Comidas e **ordem** (setas ↑↓) em
> Transporte e Reservas. A grade principal de cada linha não mudou — os controles novos
> moram na segunda linha, onde a nota já aparecia.
>
> Consequência da regra 10.0: nota é **texto puro, em toda tela**. Isso não é só o campo:
> o Roteiro pintava a nota com `dangerouslySetInnerHTML` em quatro lugares e o Painel
> concatenava a nota da reserva dentro de uma string de HTML. Enquanto a nota era só
> semeada isso era seguro; virou perigoso no instante em que ela passou a ser texto dele.
> **Um `<` sem `>` depois atravessa o `stripTags`** — a regex dele é `/<[^>]*>/g` — e o
> `innerHTML` engole dali até o fim da frase, sem erro nenhum. O Roteiro agora pinta a
> nota como texto, e o Painel escapa com `escHtml()`.
>
> O negrito das notas semeadas some da tela junto: eram **6 notas de atração**, **3 de
> trecho** e **4 de sugestão de reserva**. Os **painéis de sugestão** continuam meus e
> continuam com formatação — e o `+`, tanto em Comidas quanto em Reservas, copia o texto
> já limpo, para que linha dele nunca guarde tag.

### 10.3 — Atrações

Sub-abas por país (mostrando o € das escolhidas de cada), e chips de filtro
**tudo / escolhidas / backlog / sugeridas** com contagem.

Um cartão por cidade, com o aviso da cidade em cima e a lista. **Uma lista só** — o que eu
sugeri e o que ele mandou convivem, separados pela situação, e ordenados
escolhida → backlog → sugerida. Cada linha tem:

`nome (editável) | situação (select) | tipo (select) | preço € | ×`

O select de tipo mostra **`🚶 passeio`** e **`🏛️ tour`**. Embaixo da linha, quando houver: a
data em que caiu (etiqueta verde) e a nota.

No fim de cada cidade: "escolhidas: € X · backlog inteiro somaria mais € Y".
No fim da tela: quatro números — o país selecionado, o total escolhido da viagem, o mesmo em
R$, e o que o backlog inteiro somaria.

Rodapé: *"Os preços são de 2026 e servem de ordem de grandeza — confirme no site oficial ao
reservar. Tudo é editável, inclusive o que eu sugeri: o nome, a nota, a cidade, o tipo e o
número que eu chutei."*

### 10.4 — Comidas

Sub-abas por país. **Três cartões por país**, nesta ordem:

| cartão | emoji | vai para o dia? |
|---|---|---|
| Pratos típicos | 🍲 | **não** — lista de desejo |
| Restaurantes | 🍽️ | sim |
| Cafés e padarias | ☕ | sim |

Cada cartão tem sua lista, seu campo de adicionar, e um select de tipo que **move o item entre
os cartões**. Depois, um cartão "Minhas sugestões de <país>" com "vale provar" (cada uma com
`+`) e "o que eu acho que não vale" (sem `+`), mais o aviso do país quando existe.

Texto do topo: *"Três listas por país. **Pratos** é lista de desejo — coisa típica que você
quer provar em algum momento, sem dia marcado. **Restaurantes** e **cafés** são lugares, e
esses aparecem no Roteiro para você encaixar num dia."*

### 10.5 — Transporte

**Uma lista só, na ordem do roteiro** (`position`). Não agrupe por tipo — os 12 trechos *são* a
sequência da viagem, e quebrar por tipo embaralha isso. O emoji e a barra colorida à esquerda
fazem a distinção.

Quatro números no topo: `já comprados` (N/12) · `já pago` · `previsto, ainda não pago` ·
`com dia marcado` (N/12).

Cada linha: `nome | tipo (select com emoji) | valor | moeda | ☑ comprado | ×`, e embaixo o tipo
em etiqueta, "comprado" ou "a comprar", a data se tiver, e a nota.

No fim: o aviso **"não conte duas vezes"** (regra 5.12) e um cartão explicando onde o dado
aparece no resto do app.

Os 12 trechos e seus tipos vêm de `transportes.json`. Dois deles não são pernas únicas
("Bate-voltas de Metz no TER", "Reims ⇄ Paris no TER") — está certo, são agrupamentos, e
simplesmente ficam sem dia.

### 10.6 — Hospedagem

> **Reescrita em 05/09/2026 (Fase 6).** A regra dizia: *"um cartão por base (7)"*, e os
> bairros que a pesquisa achou moravam em **prosa**, escondidos numa frase — Madrid tinha
> três (Chamberí, Argüelles, Tetuán) empacotados numa linha só. O Leo pediu *"na parte de
> hospedagem, vamos colocar assim como em atrações e restaurantes, vamos fazer opções por
> país"*, e escolheu a leitura de **escolher**, não a de consultar.

**Sub-abas por país**, iguais às de Atrações e Comidas (o mesmo `selCO`). Dentro de cada
país, um cartão por base, e dentro do cartão uma **lista de opções**: nome, diária cheia,
noites, o total calculado, o botão **"é esta"**, a caixinha **já paguei** e o `×`.

**Só a opção marcada entra no custo da viagem.** As outras ficam guardadas como plano B.
Sem isso, três opções em Madrid com diária lançada entrariam as três no total, e ele veria
um número errado sem nada na tela indicando erro.

> **Revisto duas vezes em 06/09/2026.** De manhã (item 8), o formulário da reserva —
> endereço, check-in, check-out, total lançado, link — **só aparecia depois de ele marcar
> a opção fechada**, e diária e noites viviam espremidas na linha, sem rótulo. Passou a ser
> um bloco com rótulo em cima de cada campo, sempre à vista.
>
> De tarde (item 9), ele mandou a foto de Madrid e escreveu *"ali está apenas um campo como
> que vou preencher isso"*. Tinha razão: a manhã arrumou a opção que EXISTE, e Madrid tinha
> zero opções — os campos estavam do outro lado de um clique que ninguém tinha como
> adivinhar. **O formulário de acrescentar passou a ser o anúncio inteiro**, e numa base sem
> nenhuma opção ele nasce aberto.

Cada opção mostra, sempre à vista e com rótulo em cima: **nome, endereço, link do anúncio,
custo por noite, quantas noites, check-in, check-out, total lançado e observação**. Não há
campo que só apareça depois de marcar.

**Acrescentar uma opção usa os mesmos campos, na mesma ordem.** Numa base vazia o formulário
nasce aberto (é a tela inteira); numa base que já tem opção ele fica recolhido atrás de um
link, como o formulário de aviso. O estado aberto/fechado é **só local**: dado que chega da
outra pessoa nunca fecha o formulário, senão o anúncio que ele está digitando some do DOM
(regra 5.15, pelo caminho mais violento que existe).

Embaixo de "quantas noites", uma dica tirada do próprio roteiro: *"o roteiro tem 4 noites
aqui"*, ou *"o roteiro passa aqui 2 vezes: 3 noites, depois 1"* em Madrid, que é a única
base com duas passagens. **A dica não preenche nada**: um Airbnb pode cobrir só parte do
bloco, e número que aparece sem ele digitar entra calado na conta.

**Base com opção e nenhuma marcada avisa por escrito** que a cidade ainda soma €0 no total.
Sem isso, ele preenche o anúncio inteiro, vê o total continuar zerado e não tem como saber
por quê.

**Luxemburgo e Alemanha não têm base**, e as abas dizem isso: *"aqui é bate-volta de Metz"*.
Aba vazia parece defeito, e não é — é decisão dele.

A ressalva de segurança (`warn`) de cada base **virou aviso dele**, editável e apagável,
como já tinha acontecido em Atrações e Comidas.

A tabela `stay` ficou **aposentada**: continua no banco, ninguém a apaga, e nenhuma tela lê.
Quem manda é `stay_option`. Trocar a chave primária da `stay` arrastaria `Snapshot.stays`
de dicionário para lista, e com ele `load.ts`, `calc.ts`, Painel, Custos, Caixa,
`check.mjs` e dois testes — e não havia dado para migrar: as 7 linhas estavam todas
vazias.

Uma linha de cálculo ao vivo abaixo dos três números: `"diária × noites: € X · R$ Y"`, ou
`"total lançado: ..."` quando o total foi preenchido.

Três números no topo: com endereço salvo (N/7) · diárias cheias somadas (€) · em reais.

Rodapé: *"Paris saiu daqui: virou bate-volta de Amsterdã, você não dorme lá. Em Amsterdã, a
base é Haarlem — 15 min de trem e fora da taxa municipal de 12,5%."*

### 10.7 — Reservas e burocracia

Lista com caixinha, nome editável, valor, moeda (**R$ primeiro**) e `×`, com a explicação de
cada item embaixo. É a **fonte das pendências de burocracia do Painel**: marcar aqui apaga a
linha lá e move o valor para "já pago".

Quatro números: `resolvidas` (N/N) · `já pago` · `previsto, ainda não pago` ·
`burocracia inteira`.

Depois: um formulário de acrescentar com **"O que é"** (campo) e **"Detalhe — prazo, preço,
onde se faz"** (área de texto, logo abaixo), valor e moeda. E as 13 sugestões com `+`.

### 10.8 — Caixa

Sub-abas **geral / Leo / Lu**. Abre na do usuário logado.

> **Mudou em 04/09/2026.** A versão escrita aqui era uma **grade fixa de meses**: uma
> coluna por pessoa, uma linha por mês (set/out/nov/dez), mais um campo `opening`
> chamado "já guardado hoje". O Leo pediu outra coisa — poder **criar aportes**, como
> numa corretora. O que vale hoje está abaixo; a grade de meses e o `opening` saíram.
> A migração do banco é `supabase/03-caixa-aportes.sql`.

- **Um aporte é uma entrada de dinheiro**, não um mês: tem **dia**, **de onde veio** (texto
  livre, pode ficar vazio) e **valor**. "R$ 1.500 do 13º salário, em 12 de setembro."
- **Não existe mais `opening`.** O que a pessoa já tinha guardado é o primeiro aporte da
  lista — um jeito só de pôr dinheiro no caixa.
- **A lista é um extrato:** do mais recente para o mais antigo, com o **acumulado** até
  aquele aporte na coluna da direita. O acumulado se refaz enquanto ele digita, sem perder
  o foco do campo.
- **Cada um na sua moeda:** Leo em R$, Lu em €. No geral cada linha mostra o símbolo de
  quem lançou, e o acumulado é convertido a R$ pelo câmbio.
- **É o mesmo componente nas três sub-abas.** No geral entra a coluna **quem** (um select,
  dá para mover um aporte de uma pessoa para a outra) e o acumulado vira R$.
- **Quanto falta por mês** divide o que falta pelos **meses de calendário que ainda cabem**,
  do mês corrente até dezembro de 2026 — calculado na hora, nunca fixo. Não existe mais a
  ideia de "mês vazio".
- Uma **barra** Leo / Lu / falta, com a legenda e o percentual da meta.
- Dois botões que **só preenchem o campo** da meta com a estimativa (€ 2.795 convertidos). A
  meta é decisão deles.
- Plural correto: "no mês que sobra" × "nos 3 meses que sobram". Isso já apareceu errado.

Na sub-aba de uma pessoa, o quinto número do topo é o **último aporte** — valor, dia e de
onde veio. Na sub-aba da Lu, um aviso verde: *"a Lu ganha em euro — como au pair no
Luxemburgo o salário dela já é em €, então ela guarda em € e não perde nada no câmbio."*

### 10.9 — Custos

Só o real. A tabela, linha por linha:

| linha | € | R$ | de onde vem |
|---|---|---|---|
| Voo internacional | — | 5.079,77 | já pago, GRU–MAD ida e volta |
| Hospedagem | soma de `stay` | × câmbio | diárias cheias que você lançou |
| Atrações | só `escolhida` | × câmbio | N escolhidas · backlog somaria mais € Y |
| Transportes | `leg` em € | + os em R$ | N de 12 com valor · N comprados, R$ X já pago |
| Burocracia | `booking` em € | + os em R$ | passaporte, seguro, chip… · R$ X já pago |
| Outras linhas em € | `extra` | × câmbio | só aparece se houver |
| Outras linhas em R$ | — | `extra` | só aparece se houver |

Depois: um cartão que **aponta para a aba Transporte** (a edição dos trechos mora lá — um lugar
só edita cada coisa), o cartão "Suas outras linhas" com o campo de adicionar, o **câmbio
editável**, e por último o cartão da minha estimativa, que **não entra em nenhuma soma acima**.

---

## 11. As fórmulas, exatas

Estes são os cálculos do app atual. **Copie-os, não os reinvente** — cada um já foi conferido
contra o número que o usuário espera ver.

### 11.1 — Conversão de texto para número
```
num(v):  troque "," por "." → parseFloat → se NaN, zero
```

### 11.2 — Blocos, noites e dias
```
blocos()      dias consecutivos com a MESMA base (comparação sem diferenciar maiúscula)
bases()       os blocos, TIRANDO os que casam com /trânsito|no ar|voando/i
              cada base tem  d = nº de dias  e  nt = nº de noites
              → a ÚLTIMA base tem nt = d − 1   (só quando há mais de uma base)
noites()      soma dos nt                                            = 31
diasEmTerra() soma dos d                                             = 32
diasDeVoo()   34 − diasEmTerra()                                     = 2
```

### 11.3 — Progresso do roteiro
```
temPlano(dia)   dia.plan tem texto  OU  existe atração com day_iso = dia
diasPlanejados  quantos dos 34 têm temPlano
```

### 11.4 — Atrações
```
atracoesEur(status)   soma de price_eur dos itens com aquele status
                      o custo real usa  atracoesEur('escolhida')
totalDoDia(dia)       soma de price_eur das atrações com day_iso = dia
```

### 11.5 — Hospedagem
```
totalDaBase(cidade)   total_eur se preenchido e > 0
                      SENÃO  nightly_eur × nights
hospedagemEur         soma de totalDaBase das 7
comEndereco           quantas têm address não vazio
```

### 11.6 — Transporte e burocracia (a mesma mecânica nos dois)
```
somaTransporte(modo):
  modo ''       → todos os trechos
  modo 'pago'   → só os com bought = true
  modo 'falta'  → só os com bought = false
  devolve { eur, brl } separando por currency

transporteBrl(modo) = eur × câmbio + brl

somaBurocracia(modo)  idem, usando  done  em vez de  bought
```
⚠️ **Cuidado com o padrão da moeda.** Item sem moeda definida cai no lado do
`<option>` pré-selecionado: **transporte → euro**, **burocracia → real**. Foi assim que R$ 257
virou R$ 1.595 uma vez.

### 11.7 — Os dois totais do dinheiro

> **Reescrita em 05/09/2026 (Fases 3 e 5).** Duas mudanças: o custo de **atração** passou a
> seguir `day_iso` em vez de `status` (regra 5.2 revista), e **atração e hospedagem
> ganharam a caixinha "já paguei"**.
>
> Até aqui existiam **dois** marcadores de pago no app inteiro, e os dois booleanos:
> `leg.bought` e `booking.done`. Atração e hospedagem não tinham como ser marcadas — então
> mesmo depois de ele pagar o Palácio da Pena, ele nunca entrava no "já pago", e o
> *"valor pago × valor esperado"* que ele pediu não existia de verdade.
>
> **Caixinha e não campo de valor**, para ser igual ao resto do app: *esperado* = tudo que
> conta; *pago* = o que está com a caixinha marcada.
>
> E a caixinha de atração **só existe para o que está no roteiro**: fora dele o item não
> entra no total, e "pago maior que esperado" seria incoerente.
```
VOO = 5079.77

jaPago  =  VOO
         + burocraciaBrl('pago')
         + transporteBrl('pago')

totalReal =  VOO
           + ( atracoesEur('escolhida')
             + hospedagemEur
             + extrasEmEuro
             + transporteEur(todos) ) × câmbio
           + extrasEmReal
           + transporteEmReal(todos)
           + burocraciaBrl(todos)

aindaPorGastar = totalReal − jaPago
```
Note que **transporte e burocracia entram no total inteiros**, comprados ou não. A caixinha só
move o dinheiro entre "já pago" e "previsto".

### 11.8 — Caixa

Reescrita em 04/09/2026, quando o aporte deixou de ser mensal (ver 10.8).

```
meses()            do mês corrente até 2026-12. Em setembro/2026 são 4: set, out, nov, dez
mesesAte()         quantos são  (mínimo 1, para não dividir por zero em jan/2027)

lista(quem)        os aportes de quem, ordenados por  dia → created_at → id
                   a ordem tem que ser TOTAL e estável, senão o acumulado dança a cada
                   render. `null` traz os dois, misturados por dia.
total(quem)        soma dos aportes de quem, na moeda de quem
falta(quem)        max(0, goal(quem) − total(quem))
emReais(v, quem)   se a moeda de quem é euro → v × câmbio, senão v

totalGeralBrl      emReais(total('leo'),'leo') + emReais(total('lu'),'lu')
metaGeralBrl       idem com goal
faltaGeralBrl      max(0, metaGeralBrl − totalGeralBrl)
percentual         min(100, totalGeralBrl / metaGeralBrl × 100)

porMes(quem)       falta(quem) / mesesAte()
```

O **acumulado** de uma linha é a soma de todos os aportes até ela **na ordem do tempo** —
por isso a conta corre na lista crescente e só depois a tela inverte para mostrar o mais
recente em cima.

### 11.9 — As constantes de referência
```
VOO                     R$ 5.079,77   já pago
ESTIMATIVA              € 2.795       minha estimativa da parte DELE. Não entra em soma
TETO                    R$ 19.920     o que sobra depois do voo
câmbio padrão           6,00          ele já mudou para 6,20
primeiro dia            2026-12-10
último dia              2027-01-12
total de dias           34
```

---

## 12. Semear o banco, e a regra do `seed_id`

### 12.1 — A primeira carga

| tabela | de onde | quantos | situação inicial |
|---|---|---|---|
| `day` | `dias-bases.json` | 34 | `base` preenchida, `plan` **vazio** |
| `attraction` | `atracoes-dele.json` | 35 | `status = 'backlog'`, `kind = 'passeio'` |
| `attraction` | `atracoes-sugeridas.json` | 69 | `status = 'sugerida'`, `kind = 'passeio'` |
| `food` | `comidas-dele.json` | 1 | `kind = 'prato'` |
| `booking` | `reservas-dele.json` | 5 | `done = false`, sem valor |
| `leg` | `transportes.json` | 12 | `position` = a ordem do arquivo, sem valor, `bought = false` |
| `stay` | `hospedagem.json` | 7 | uma linha por `c`, campos vazios |
| `savings` | — | 2 | uma linha para `leo`, uma para `lu`, vazias |
| `settings` | — | 1 | câmbio 6,00 |

**Os `seed_id`:**
```
atração dele        m:<cidade>:<índice no array daquela cidade>     m:lisboa:0
atração sugerida    s:<cidade>:<índice>                             s:roma:4
trecho              t:<índice>                                      t:3
comida              f:<país>:<índice>
reserva             b:<índice>
```

### 12.2 — A regra que evita duplicata e ressurreição

Toda vez que o conteúdo semeado for atualizado (eu acrescentar pesquisa nova), rode uma
reconciliação:

```
para cada item semeado, pelo seu seed_id:
  já existe na tabela?          → não faça nada (o usuário pode ter editado o nome, o preço)
  está em killed_seed?          → NUNCA volta
  senão                         → insira
```

> ### ⚠️ Os índices dos `seed_id` são posicionais.
> **Nunca reordene nem remova do meio dos arrays nos JSONs.** Tirar um item do meio desloca
> todos os seguintes, e o app passa a ver itens antigos como novos — duplicata em massa. Só
> **acrescente no fim** do array de cada cidade/país. Se um item precisa sumir, troque o texto
> no lugar; não delete a linha.
>
> O mesmo vale para `transportes.json`: a posição é a identidade.

O `×` de qualquer item com `seed_id` **grava o `seed_id` em `killed_seed` antes de apagar.**

### 12.3 — Importar o que o Leo já preencheu

**`dados/estado-atual-do-leo.json` é dado real e não pode ser perdido.** É o estado vivo do app
de hoje. Escreva um script de importação de uma vez só (`npm run import`), a rodar **depois**
da semeadura, que:

| do JSON | para onde | observação |
|---|---|---|
| `rate: "6,20"` | `settings.eur_rate = 6.20` | ele já ajustou o câmbio |
| `mine[cidade][]` | casa em `attraction` **pelo `sid`** | traga `st`(situação), `pr`, `n`, `w`, `day` |
| `foods[país][]` | `food` | `k` → `kind`: `pr`→prato, `rest`→restaurante, `cafe`→café |
| `res[]` | `booking` | casa pelo nome; traga `v`(valor) e `resdone[id]` → `done` |
| `tr[]` | `leg` | casa pelo `sid`; traga `v`, `m`, e o `k` de `transportes.json` |
| `days[iso]` | `day` | `c`→`base`, `p`→`plan` |
| `killed{}` | `killed_seed` | está vazio hoje, mas importe de qualquer forma |
| `stays`, `extra`, `cx` | `stay`, `extra`, `savings`/`contribution` | estão vazios hoje |

**O que ele tem hoje, para você conferir a importação:**
- **8 atrações de Lisboa marcadas como escolhidas** (Praça do Comércio, Rua Augusta, Praça Dom
  Pedro IV, Elevador de Santa Justa, Miradouro de Santa Luzia, Mosteiro dos Jerónimos, Padrão
  dos Descobrimentos, Torre de Belém)
- **câmbio 6,20**
- **passaporte marcado como resolvido, com R$ 257,25**
- 3 itens de comida na Espanha que são teste dele: "teste" (café), "teste 2" (restaurante),
  "comida 1" (prato). **Importe do mesmo jeito** — apagar coisa dele não é sua decisão
- um item "teste" nas reservas, idem
- as tabelas de hospedagem, aportes e valores de trecho estão **vazias**

Depois de importar: o Painel tem que mostrar **8 atrações escolhidas**, **R$ 5.337 de total já
pago** (5.079,77 + 257,25) e o câmbio 6,20.

### 12.4 — O que falta de conteúdo, e vai chegar depois

O usuário ainda vai mandar listas de atrações para **Metz, Luxemburgo, Reims, Amsterdã e
Roma**. Quando chegarem, elas entram como **novos itens no fim** do array daquela cidade em
`atracoes-dele.json`, com `status = 'backlog'`. **Deixe esse caminho fácil** — um comando de
reconciliação que roda contra os JSONs e insere só o que falta.

---

## 13. Design system

**O visual é para ficar igual.** `referencia/estilo-atual.css` tem o CSS inteiro, e
`referencia/artefato-v28.html` mostra o resultado. Aproveite o arquivo, não recrie de memória.

### 13.1 — Cores

```css
/* claro */
--ground:#F2F4F1;  --surface:#FBFCFA;  --surface-2:#E8ECE6;
--ink:#141C18;     --ink-2:#3D4A43;    --muted:#66756C;
--hairline:#D3DACF;--hairline-2:#BDC7B9;
--pine:#1F4D3D;    --pine-wash:#E2EBE4;   /* verde: positivo, escolhido, pago */
--ochre:#96690F;   --ochre-wash:#F2EAD6;  /* ocre: atenção, backlog */
--rust:#9E3A2C;    --rust-wash:#F5E4E0;   /* vermelho: alerta, pendência */

/* escuro */
--ground:#0F1512;  --surface:#161E19;  --surface-2:#1D2721;
--ink:#E4EAE4;     --ink-2:#B9C4BC;    --muted:#8B998F;
--hairline:#29352E;--hairline-2:#3A4941;
--pine:#63B893;    --pine-wash:#16251E;
--ochre:#D8A94F;   --ochre-wash:#241E11;
--rust:#E08975;    --rust-wash:#2A1815;

/* uma cor por país, usada na borda de topo dos cartões e nos chips */
claro:  es #1F4D3D · pt #2C6E63 · fr #34618A · nl #B06A16 · de #7A5C1F · pl #9E3A2C · it #6B4E8C
escuro: es #63B893 · pt #5FB8A8 · fr #79ABD6 · nl #DFA254 · de #CBAE63 · pl #E08975 · it #A891CC
```

**Tema:** claro e escuro, seguindo o sistema do visitante, com os três estados
(`:root` claro, `@media (prefers-color-scheme:dark)` guardado por
`:root:not([data-theme="light"])`, e `:root[data-theme="dark"]`).

### 13.2 — Tipografia (Google Fonts)

| papel | fonte | uso |
|---|---|---|
| títulos | **Bricolage Grotesque** 400/600/800 | h1–h4 e os números grandes, com `letter-spacing` negativo |
| corpo | **Source Serif 4** | texto corrido, 16,5px. **O corpo é serifado** — é o que dá a cara do app |
| mono | **IBM Plex Mono** 400/500/600 | datas, dinheiro, rótulos em caixa alta, etiquetas |

Dinheiro e contagem sempre em **`font-variant-numeric: tabular-nums`**.

### 13.3 — Layout

- Largura máxima **1000px**, centralizado. Respiro de 24px (16px no celular).
- ~~**Nada de cantos arredondados. Nada de sombra.**~~ **REVOGADA em 05/09/2026 (Fase 7),
  por decisão dele.** A regra dizia: *"bordas de 1px em `--hairline-2` e uma borda de topo
  de 4px na cor do contexto; é um visual editorial, de papel"*. O Leo pediu "ajustar a id
  visual, está feio", escolheu **mudar a identidade de vez**, e depois escolheu entre duas
  direções olhando: **"Círculos"**, inspirada em Instagram.

  **O motivo era medível, e o meu primeiro diagnóstico estava errado.** Eu disse que o
  problema era o tema claro. Medido: o cartão contra a página dá **1,09:1 no escuro** e
  1,07 no claro; o fio contra o cartão dá **1,33 no escuro** e 1,39 no claro. O mínimo para
  o olho separar um elemento de interface do fundo é **3:1**. Os dois contrastes que fazem
  o cartão existir reprovavam **nos dois temas** — consertar só o claro não resolveria nada.

  **A direção escolhida resolve por tabela, e não por ajuste.** Num esqueleto de rede
  social o cartão não tem borda: quem separa é o ar, o raio e uma elevação curta. O
  problema deixa de existir em vez de ser consertado.

  A identidade vive em `src/app/identidade.css`, carregado **depois** dos dois atuais.
  `estilo-atual.css` continua **byte a byte igual** a `referencia/estilo-atual.css` — é ele
  que permite provar o que era do desenho de origem e o que é nosso.
- **Cartão** = borda + topo colorido + cabeçalho (título grande + linha mono de metadados) +
  corpo.
- **Rótulos em caixa alta**, mono, 9–10px, `letter-spacing` largo, cor `--muted`.
- Blocos de aviso: fundo discreto e uma **barra de 3px à esquerda** na cor do tipo
  (`free` verde · `warn` ocre · `alert` vermelho), com o título do aviso em caixa alta.
- Tabela com cabeçalho em `--surface-2`, sem zebra, números alinhados à direita.
- **Toda tabela larga rola dentro do próprio contêiner** — a página nunca rola na horizontal.

### 13.4 — O celular importa

Ele usa no celular. Todas as telas têm que passar limpas em **360, 390 e 768px**, com **zero**
rolagem horizontal na página. Os pontos que já deram trabalho:

- **Linha com muitos campos.** No desktop a linha de atração é
  `nome | situação | tipo | preço | ×` numa só faixa. No celular ela quebra em três faixas:
  nome + `×`, depois situação + tipo + preço, depois a nota.
  ⚠️ **Não use `1fr` na coluna de um `select` no celular** — o navegador dá menos largura do que
  o esperado e "🚶 passeio" vira "🚶 pa". Fixe em pixels.
- A linha de transporte tem **seis** controles; no celular vira quatro faixas.
- `white-space: nowrap` no cabeçalho da tabela estoura a largura mesmo com `min-width: 0`.
- Com 9 abas, a barra rola; traga a ativa para a vista **sem rolar a página**.

### 13.5 — Os emojis

| emoji | significa | onde o usuário escolhe |
|---|---|---|
| 🚶 | passeio pela rua / centro | select de tipo, aba Atrações |
| 🏛️ | tour num lugar | idem |
| 🍲 | prato típico | select de tipo, aba Comidas |
| 🍽️ | restaurante | idem |
| ☕ | café / padaria | idem |
| 🚆 ✈️ 🚌 🚗 | trem, voo, ônibus, carro | select de tipo, aba Transporte |

O emoji aparece **no select** (junto da palavra) e **nas etiquetas do dia** (sozinho, antes do
nome). É a razão de os tipos existirem: bater o olho no dia e saber o que é cada coisa.

---

## 14. Deploy

1. Projeto Supabase novo. Rode as tabelas da seção 6, as políticas da seção 7, e ligue
   **Realtime** nas tabelas compartilhadas.
2. Semeie (seção 12.1), depois importe o estado do Leo (seção 12.3). **Confira os três números
   de aceite** antes de seguir.
3. Insira os dois e-mails em `app_user` com o `who` certo.
4. Projeto na Vercel ligado ao repositório. Variáveis: a URL e a chave anônima do Supabase,
   **e a `ENTRAR_SENHA`** (seção 9). **A chave de service role não vai para o cliente, em
   hipótese alguma** — só nos scripts de semeadura/importação, rodando localmente.
5. No Supabase Auth, ponha a URL de produção da Vercel em Site URL e nas Redirect URLs. Isso
   importa menos desde 04/09 (não há mais link mágico na tela), mas mantém a porta dos fundos
   de pé.
6. Ponha `ENTRAR_SENHA` nas variáveis da Vercel (Secret) e a mesma senha nas duas contas do
   Supabase. Depois entre digitando `leobairrao` — se a tela disser que falta a variável,
   é este passo. (Era "teste o link mágico"; mudou em 04/09, ver seção 9.)

**Um `README.md` no repositório** com: como rodar local, como semear, como importar, e como
acrescentar conteúdo novo aos JSONs sem quebrar os `seed_id`.

---

## 15. Checklist de aceite

Não considere pronto sem passar por todos.

### Dados e contas
- [ ] O Painel mostra **34 dias de viagem** e **31 noites**, e o rodapé da tabela diz
      "32 dias em terra + 2 de voo = 34 dias de viagem"
- [ ] **8 atrações escolhidas** depois da importação, todas de Lisboa
- [ ] **Total já pago = R$ 5.337** (voo + passaporte), com câmbio **6,20**
- [ ] A tabela do roteiro tem **8 linhas** e **nenhuma data**
- [ ] Atrações: **104 no total** — 35 no backlog dele, 69 sugeridas. Comidas só nos 7
      países; nada de Bélgica nem Polônia
- [ ] Marcar uma atração de € 20 num dia sobe o total real em R$ 124, e o dia acende no
      calendário
- [ ] Uma atração no `backlog` **não** entra no custo real
- [ ] Lançar € 120 num trecho: entra em **previsto**. Marcar comprado: move para **já pago**,
      e o total real **não muda**
- [ ] Desmarcar devolve para previsto
- [ ] Trocar um restaurante para "prato" **limpa a data** dele
- [ ] Um item marcado num dia **não aparece** na lista de escolher de outro dia
- [ ] Apagar um item semeado e recarregar: **ele não volta**
- [ ] Rodar a reconciliação duas vezes: **nada duplica**

### Os dois juntos — o teste que importa
- [ ] Dois navegadores abertos, um logado como Leo e outro como Lu
- [ ] O Leo marca uma atração num dia → **aparece na tela da Lu sem recarregar**
- [ ] A Lu lança o aporte dela → o **geral** do Leo sobe, mas ele **não vê o valor dela** na
      aba dela
- [ ] Os dois digitando **ao mesmo tempo em campos diferentes**: nenhum perde o que digitou
- [ ] A Lu está com o cursor num campo e chega uma mudança do Leo: **o campo dela não é
      sobrescrito e o foco não é roubado**
- [ ] Um **nome** fora da lista não entra, e a tela diz só que o app é privado (seção 9)
- [ ] Depois do build, o relatório imprime `ƒ Middleware` — senão a sessão não se renova

### Aparência
- [ ] Lado a lado com `referencia/artefato-v28.html`: cores, fontes e espaçamentos batem
- [ ] Tema claro e escuro, os dois corretos
- [ ] **Zero rolagem horizontal** em 360, 390 e 768px, nas nove abas
- [ ] No celular, nenhum rótulo de select cortado
- [ ] Digitar num campo de valor **não perde o foco** e não reformata o número no meio

---

## 16. Se você ficar em dúvida

Nesta ordem:

1. **Abra `referencia/artefato-v28.html`** e veja como está hoje. É a verdade.
2. Procure a regra na seção 5 e a fórmula na seção 11.
3. **Pergunte ao Leo.** Ele foi muito claro sobre não querer invenção:
   *"calma não, não fique inventando coisas que eu não falei"*.

Não acrescente cidade, aba, campo ou seção que não está aqui.
