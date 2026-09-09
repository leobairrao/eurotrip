# Melhorias do sistema — a lista dele, 08/09/2026

Ele mandou um PDF de cinco páginas com prints e anotações. **Este arquivo é a
transcrição fiel**, na ordem em que ele escreveu, com os prints descritos em
palavras — o PDF original está em `~/Downloads/Melhorias do sistema.pdf`, fora
do repo.

**A palavra dele sobre como usar isto:**

> *"Alguns pontos, antes de começar a resolver, salve o contexto de tudo que
> fizemos porque vou dar clear no chat. Eu só escrevi várias coisas que quero
> arrumar e ainda tem muitas outras, mas vamos aos poucos. Escrevi de uma forma
> que eu entendi, mas vamos debater muito para construir tudo que está aí."*

Três coisas saem daí, e valem para quem ler:

1. **Não é especificação, é intenção.** Ele escreveu do jeito dele. Cada item
   precisa de conversa antes de virar código.
2. **A lista não está fechada** — "ainda tem muitas outras".
3. **Aos poucos.** Não é para atacar tudo de uma vez.

## O BALANÇO DE 09/09/2026 — o que saiu e o que falta

Doze commits, tudo publicado e conferido no site. **Dois SQL rodados por ele:** o 11
(compro antes + gasto real) e o 12 (a tabela `plan_row` do plano de roteiro).

### ✅ FEITO

| Item da lista dele | O que ficou |
|---|---|
| **Painel** · tirar as frases miúdas da Tabela 1 | saíram as quatro |
| **Painel** · Tabela 1 com três números | dias até embarcar · dias de viagem · **cidades visitadas** |
| **Painel** · "Cidades visitadas" | metade ou mais das atrações **daquela cidade que estão num dia** marcadas como feitas. Sai da ATRAÇÃO, nunca da base do dia (ele dorme em 7 cidades e passa por ~15) |
| **Painel** · Tabela 2 = pago / estimado / acumulado | os três, e somar os três dá errado de propósito |
| **Painel** · Tabela 3 "quantos peguei e quanto gastei" | hospedagem · transporte que compra antes · atrações, com a contagem como número grande |
| **Painel** · a tabela do roteiro, editável | virou duas coisas: as **estadias reservadas** (fato) e a tabela `plan_row` que ele escreve à mão, com mostrar/esconder |
| **Painel** · retirar o texto "A tabela sai do calendário…" | saiu |
| **Painel** · as "Decisões de roteiro" deixam de existir | o cartão e a constante `DECISOES` |
| **Roteiro** · legenda só com ícones | ficaram os dois símbolos e a fita de emojis; saíram os cinco contadores |
| **Roteiro** · tirar o bloco "10 blocos · 34 dias" | saiu |
| **Roteiro** · acrescentar cidade de dormir / editar o nome | **já funcionava** — a base do dia é campo livre no banco (a correção da minha nota errada de 08/09) |
| **Atrações** · os números do topo | custo real do país (€ grande, R$ embaixo) · a **%** sobre o total de atrações · o que ficou de fora. **Os três seguem a bandeira** |
| **Compro antes vs pago lá** | etiqueta clicável em transporte e atração, mais o **prazo em dias** na atração. Comida ganhou €; reserva ficou de fora (tudo lá é comprado antes por natureza) |
| **O gasto real** (ele inventou no meio) | as quatro colunas `spent`/`spent_eur` existem, e **gasto de verdade** aparece na aba Custos |
| **Onde durmo vs onde passo** | o dia lidera pela cidade de visita (sai das atrações), o bloco é a **estadia reservada**, e a cama desceu para a última linha |
| **11 abas** · as frases grandes de abertura | saíram todas (ele acrescentou este na conversa) |

**Três defeitos que apareceram no caminho e foram consertados:** `parseNum` já estava certo,
mas o **custo da segunda estadia de Madrid desaparecia do total** (o app só aceitava uma
hospedagem marcada por cidade); a página **pulava ~15px** quando qualquer bloco abria; e o
`button:active { scale(.97) }` global **encolhia a linha da gaveta inteira** no clique.

### ⏳ FALTA

| Item | Precisa de SQL? |
|---|---|
| **O airbnb, que "ainda não ficou 100%"** — é o que ele quer primeiro. Ver a seção 0 do COMO-MEXER: ele não disse o que falta, **pergunte** | a decidir |
| **Tabela 4** · "o que ainda está aberto" puxando das quatro abas, com o prazo das atrações | **não** — `buy_ahead` e `ahead_days` já existem |
| **A tela de conferir o dia** · onde ele digita o gasto real, no molde do exemplo do dia 11 | **não** — as colunas já existem |
| **Roteiro** · arrastar quantos dias fica em cada cidade | **não** — as datas dos 34 dias são fixas; arrastar reescreve a base de uma faixa |
| **Atrações** · duas cidades de países diferentes com o mesmo nome | **provavelmente sim** — a chave de cidade precisa carregar o país |
| **Atrações** · lixeira com `CONFIRMAR` em TODA cidade, fixa ou criada | **provavelmente sim** — cidade fixa vem do arquivo e voltaria no F5 |
| **A coluna "o que sai daqui de bate-volta" editável** | não, se usar um `spot` de aviso por cidade |
| **O bate-volta virando "roteiro superficial"** | precisa da palavra dele — é a expressão que eu menos entendo da lista |
| **Apagar a minha semente do `day.base` dos 34 dias** | não — mas com cópia antes, e ele autoriza |
| **Design** | por último, decisão dele |

**A lista não está fechada** — *"ainda tem muitas outras"*. As perguntas em aberto que eu
enxergo estão marcadas **[a debater]** abaixo; são minhas, não dele.

como **[a debater]** — são minhas, não dele.

---

## 0. Design

> Melhorar Design → **(deixamos por último)**

---

## 1. Aba Painel

### Tabela 1 — os quatro números do topo

*Hoje:* `93 dias até embarcar` · `34 dias de viagem` · `0 atrações no roteiro` ·
`0/7 hospedagens fechadas`, cada um com uma frase miúda embaixo.

- **Remover as frases abaixo dos dados** (*"10 dez, 20h15 de Florianópolis — voo
  pago"*, *"31 noites na Europa · 8 bases · 2 dias só de voo"*, e os outros).
- **Os itens que devem ficar:** Dias até embarcar, Dias de viagem, e
  **Cidades visitadas** — *"vai dando check conforme vou dando check no roteiro"*.

**[a debater]** "Cidades visitadas" conta o quê: cidade em que ele marcou algo
como feito? cidade cujo dia já passou? E o denominador são as 8 bases, as 11
cidades fixas, ou as cidades que ele criou também? A frase *"vai dando check"*
sugere que é derivado do **feito** das linhas do dia — mas hoje "feito" é por
item, não por cidade.

**[a debater]** A tabela 1 tinha quatro números e ele listou três. O quarto sai
ou fica em branco?

### Tabela 2 — o dinheiro

*Hoje:* `R$ 5.337 total já pago` · `€0 hospedagem` · `€0 atrações` ·
`€0 transportes` · `R$ 5.337 total real até agora`.

Deve conter:

- **Total pago** — o que já foi pago até agora.
- **Total estimado** — o que ele vai gastar lá: passeios que não comprar antes,
  comidas, transportes. E a observação dele, que é a parte difícil:

  > *"Isso tudo temos que pensar como colocar em todas as etapas (tem passagem
  > que vou comprar antes e tem passagens que vou comprar apenas nas cidades,
  > por exemplo) pode ter outras coisas também que seja algumas aqui e outras
  > lá"*

- **Valor Acumulado** — o que ele (Leo) já juntou para a viagem. **Puxa da aba
  Caixa.**

**[a debater] — este é o item mais pesado da lista inteira.** "Comprar antes"
vs "pagar lá" é uma **distinção que hoje não existe no banco** em lugar nenhum.
Transporte tem `bought` (já comprei), que é outra coisa: é *estado*, não
*intenção*. Ele está pedindo uma classificação nova que atravessa transporte,
atração, comida e reservas — e ela decide três números do Painel. Provavelmente
é coluna nova (SQL) em mais de uma tabela.

### Tabela 3 — quantos e quanto (o desenho da tabela 2, itens novos)

> igual a de cima (em design) mas com os seguintes itens

- **Hospedagem:** quantas ele pegou e qual foi o valor gasto. *"Quantos eu
  peguei (0 de 7) deve ficar grande."*
- **Transportes:** quantos pegou e o valor gasto (o número grande). **Só os que
  ele compra antes** — viagens intercidades e voos interpaíses. *"tickets de
  transportes do dia a dia nas cidades eu devo comprar apenas no dia."*
- **Atrações:** quantas pegou e o valor gasto (o número grande).

**[a debater]** Depende da mesma classificação da tabela 2. E "quantas eu
peguei" de atração precisa de definição: as que estão num dia do roteiro? as
compradas?

### Tabela "roteiro" — *O roteiro, em uma tabela*

*(Ele numerou esta como "Tabela 3" também. São duas coisas diferentes.)*

- **Deve puxar os dados da aba Roteiro**, que por consequência **devem ser
  editáveis**. *"vou aprofundar depois"*.
- **Retirar o texto:** *"A tabela sai do calendário: se você mudar a base de um
  dia na aba Roteiro, ela se refaz aqui."*
- **Deixar editáveis** os textos da coluna **O QUE SAI DAQUI DE BATE-VOLTA**.
- **Transformar** esse texto em **roteiro superficial**.

**[a debater]** "Roteiro superficial" é a expressão que eu menos entendo da
lista. É um resumo do dia? uma lista curta do que fazer naquela base? Precisa da
palavra dele.

**[a debater]** Hoje essa coluna é **texto meu, de arquivo** (`src/content`).
Torná-la editável significa que ela vira dado dele, no banco — provavelmente
coluna nova.

### Tabela 4 — *O que ainda está aberto*

Deve puxar **tudo** que está em:

- **Transporte** — comprados 0 de X, **só os que precisa comprar com
  antecedência**, não os intercidades *(nota: ele escreveu "não os
  intercidades" aqui e "intercidades sim" na Tabela 3 — **[a debater]**, um dos
  dois é engano)*;
- **Hospedagens** — peguei 0 de 7;
- **Reservas** — tudo dessa aba;
- **Atrações** que tiverem a tag **"Comprar com antecedência"**, e **o tempo que
  precisa** — *"essa última, da tag de atrações ainda vamos adicionar"*.

**[a debater]** A tag "comprar com antecedência" e o "tempo que precisa" são
campos novos em atração. É a mesma família do item da Tabela 2.

### Tabela 5 — *Decisões de roteiro*

> **Deixa de existir, isso eu que mando.**

*(É o bloco com "O carro de Cáceres", "Toledo, Segovia e Ávila", "O dia 21 em
Metz", "O dia 28 em Reims", "Roma tem 8 noites" — conselhos meus.)*

---

## 2. Aba Roteiro

- **Poder acrescentar cidades novas.** E a distinção que ele fez, que importa:

  > *"Essas cidades de roteiro são as fixas para dormir, diferente das cidades
  > de atrações que são cidades que vamos passear."*

- **Poder editar quantos dias fica em cada cidade** — *"arrastando os dias de
  uma cidade para outra"* — e **poder editar o nome das cidades**.
- **Organizar a legenda.** Só os ícones; as escritas pode tirar (*0 de 34
  planejados*, *31 noites em 8 bases*, …).
- **Tirar o bloco** *"10 blocos · 34 dias com base de 34"*.

**CORREÇÃO DE 09/09, e ela derruba o que eu havia escrito aqui.** Eu disse que
"as 8 bases e os 34 dias vêm de arquivo (`STAYS`)" e que isto "muda a espinha do
app". **Errado, e o código é claro:**

- `blocks()` e `baseList()` leem **`s.days[iso].base`**, que é **coluna do banco** e
  campo de **texto livre** no cartão *o dia* do Roteiro;
- `STAYS` (de `hospedagem.json`) são as **7 cidades de HOSPEDAGEM** — só a aba
  Hospedagem e o argumento `cities` das contas de dinheiro a usam. Não é o calendário;
- do arquivo vêm mesmo: os **34 dias** (`ISOS`), as **7 de hospedagem** e os **textos
  de bate-volta** (`BASEOUT`).

**Então:** *acrescentar cidade de dormir* e *editar o nome* **já funcionam hoje** —
é digitar a base no dia. E *arrastar quantos dias fica em cada cidade* **não precisa
de SQL nem move data nenhuma**: as datas dos 34 dias são fixas, e arrastar reescreve
a `base` de uma faixa de dias. O que falta é a interface de arrastar.

**O que sobra de verdade neste item:** a aba Hospedagem lê as 7 do arquivo, então uma
base nova não ganha cartão de hospedagem. Isso sim é decisão a tomar.

Há dois testes que trancam a correção em `calc.test.mjs` ("cidade de dormir NOVA
entra num bloco próprio" e "mudar a base de um dia MOVE o dia de bloco").

---

## 3. Aba Atrações

### Tabela 1 — os quatro números do topo

*Hoje:* `€0 Espanha, no roteiro` · `€0 no roteiro, na viagem` · `R$0 em reais` ·
`€188 fora do roteiro somaria`.

Deixar os itens:

- **Custo da Espanha, real** — o quanto vai gastar com o que escolheu de fato
  (**em euro grande e em R$ embaixo**);
- **A % do custo da Espanha** em relação à viagem toda;
- **Custo das atrações que ele não incluiu** na viagem final.

**FEITO em 09/09**, com duas decisões dele na conversa: a **%** é sobre o **total das
atrações da viagem** (*"só o total das atrações"*), não sobre o custo da viagem inteira —
então as fatias dos sete países somam 100; e **os três seguem a bandeira clicada** (*"os
três seguem o país"*), onde antes só o primeiro seguia. Provado na tela com uma atração
posta num dia pelo app e depois retirada: €19 / R$ 118 · 100% · €85 fora.

### Cidade com nome repetido em país diferente

> *"Se eu crio uma cidade com mesmo nome que já tenha em outro país ele não
> deixa, isso não pode, dois países podem ter cidades com nomes iguais"*

*(O print mostra: criar "teste" em Portugal responde **"TESTE já existe (em
Itália)."**)*

**[a debater]** A chave de cidade hoje é o nome normalizado (`norm()`), e ela é
única no app inteiro — é por isso que a segunda recusa. Para dois países terem
"Santiago", a chave precisa carregar o país. Isso toca **toda tela que escreve
cidade** e os dados que já existem.

### Apagar cidade

> *"Quando eu crio uma cidade, ela não pode aparecer 'apagar esta cidade' assim
> destacado, não importa se ela é criada depois ou se já veio com o sistema,
> elas tem que ser padrão. Todas tem que ter uma lixeira e uma confirmação muito
> segura de se quer apagar. (Tem que digitar algo tipo CONFIRMAR)"*

Duas coisas, e as duas são claras:

1. **Cidade criada por ele e cidade que veio no sistema têm que parecer a mesma
   coisa.** Hoje a criada mostra um link vermelho *"apagar esta cidade"* no
   cabeçalho, e a fixa não mostra nada.
2. **Todas ganham lixeira**, com **confirmação por digitação** (escrever
   `CONFIRMAR`).

**[a debater]** Apagar uma cidade **fixa** é outra história: ela está no arquivo
de conteúdo e pode ser base do roteiro. O que acontece com as atrações, as dicas
e os dias que apontam para ela?

---

## O que eu já enxergo, e ele vai querer saber

**Quatro itens desta lista provavelmente precisam de SQL** (coluna nova no
banco), e ele é quem roda:

1. "comprar antes" vs "pagar lá" — atravessa várias tabelas;
2. a tag "comprar com antecedência" e o "tempo que precisa", em atração;
3. o texto do bate-volta virando editável;
4. ~~os dias de cada base saindo do arquivo para o banco~~ — **não precisa**
   (corrigido em 09/09).

**Dois são grandes o bastante para virar etapa própria:** o dinheiro do Painel
(o 1) e a edição do roteiro (o 4).

**A ordem que eu sugeriria**, e é conversa: começar pelos que são só tela e não
mexem em dado — tirar textos, a legenda, o bloco de blocos, a Tabela 5, o
destaque do "apagar esta cidade". São rápidos, aparecem na hora, e não travam
nada. Depois os que precisam de decisão de modelagem, um por vez.
