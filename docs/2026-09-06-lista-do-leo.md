# A lista do Leo — 06/09/2026

Ele checou o sistema inteiro e mandou sete coisas. A regra que ele deu: **uma de cada
vez**, não tudo de uma vez. Nada aqui começou.

Antes dela, o que já saiu hoje: a cidade nova não derruba mais o app, e agora existe uma
rede embaixo dele (`error.tsx`). Está no ar e provado no site.

---

## 1. Comidas: um campo só, com etiqueta — ✅ **NO AR**

**Ele disse:** *"em comidas não precisa de três inputs (comida, café e restaurante: temos
que ter um input e lá colocamos o nome e uma tag de qual das 3 opções é)"*

Hoje a aba tem três cartões e **três formulários** — "pôr em pratos", "pôr em
restaurantes", "pôr em cafés". Vira um formulário: nome, nota, e a etiqueta escolhendo
qual dos três.

- **Banco:** nada. A coluna `kind` já existe com os três valores.
- **Como ficou:** um cartão "Acrescentar em <país>" no topo, com nome, nota, a etiqueta
  (prato · restaurante · café) e o botão, que muda de texto conforme a etiqueta. Os três
  cartões continuam existindo como listas — só o formulário virou um.
- **Provado no navegador:** escrevi "Pastelaria de teste", troquei a etiqueta para café,
  e a linha caiu em "Cafés e padarias" com o contador em 1. A linha de teste foi apagada.
- **Uma armadilha nova que apareceu aqui:** `input` herda a cor do texto, **`select` não** —
  usa o preto padrão do navegador. Como este é o primeiro `select` dentro de um formulário
  de acrescentar do app, ele nasceu preto sobre preto: a palavra existia e sumia, e só o
  emoji aparecia. Corrigido em `extras.css`, com o comentário explicando para o próximo.

## 2. Roteiro: "vou usar transporte neste dia?" — ✅ **NO AR**

**Ele disse:** *"deve ter um on/off assim: vou usar transporte esse dia? Se eu ativar, abre
a seleção e eu coloco qual transporte vou usar"*

No cartão "Como eu me movo neste dia", hoje a lista de trechos já vem aberta com os
quatro grupos. Passa a vir fechada, com um liga/desliga em cima; ligou, abre a seleção.

- **Banco:** nada.
- **Tamanho:** pequeno.

## 3. A aba Sugestões — ✅ **PRONTA em 06/09, esperando ele olhar** (localhost:3000)

**Ele disse:** *"coloque todas as suas sugestões em uma aba chamada Sugestões e separe por
seguimento (comida, atração...), quando eu te pedir ajuda você coloca por lá, pode fazer
sub-abas lá dentro"*

Tudo que eu pesquisei sai de dentro das abas dele e vai para uma aba própria, com sub-abas
por segmento. Vira também o lugar onde eu ponho o que ele me pedir daqui pra frente — a
pesquisa nova de Madrid e Lisboa, por exemplo.

### A regra que ele deu em 06/09, e que vale para o app inteiro

> *"tudo que for sugerido por você, absolutamente tudo. As minhas abas devem ficar apenas
> com os meus dados"*

Antes disso ele já tinha corrigido o erro de origem: *"as opções de hospedagem eram bairros
sugeridos por você, não deve restaurar isso"*. Eu havia SEMEADO pesquisa minha dentro das
tabelas dele — e é por isso que apagar uma sugestão custava caro: ia para `killed_seed`, de
onde nem `npm run seed` traz de volta. Ele perdeu 17 hospedagens e 35 atrações assim.

**Sugestão minha passa a viver em ARQUIVO, não em linha da tabela dele.** O `+` lê do
arquivo e cria a linha. Apagar da lista dele deixa de ser definitivo — a sugestão continua
em Sugestões, para puxar de novo.

### O que muda em cada aba

| aba | hoje | depois |
|---|---|---|
| Atrações | 35 dele + 69 minhas | **35 dele** (Lisboa e Madrid — as duas cidades do arquivo dele) |
| Comidas | 2 dele | **2 dele** |
| Reservas | 7 dele | **7 dele** |
| Transporte | 12, todos meus | **vazia** |
| Hospedagem | 2, minhas | **vazia** |
| Dicas | 13, minhas | **vazia**, para o campo novo do item 7 |
| Roteiro | 3 alertas vermelhos meus nos dias | **dias limpos** |

Nenhum número do Painel muda: transporte e hospedagem já somam € 0, porque nenhum tem valor.

- **Sub-abas:** Atrações · Comidas · Reservas · Hospedagem · Transporte · Dicas (seis).
- **Banco:** nada. Nenhuma coluna, nenhuma tabela, nenhum SQL para ele rodar.
- **Tamanho:** o maior da lista, e refaz o que a primeira versão da aba já tinha construído
  (aquela tinha três sub-abas e mantinha hospedagem, transporte e avisos fora).

## 4. Atrações: os números no topo — ✅ **NO AR**

**Ele disse:** *"as infos da viagem devem aparecer no topo da aba logo abaixo das bandeiras
dos países"*

A faixa com "Portugal no roteiro · no roteiro na viagem · em reais · fora do roteiro
somaria" hoje fica no rodapé da aba, depois de todos os cartões. Sobe para logo abaixo das
bandeiras.

- **Banco:** nada.
- **Como ficou:** a ordem da aba passou a ser bandeiras → números → filtros → cartões.
  O primeiro número continua acompanhando a bandeira escolhida ("Itália, no roteiro" vira
  "Espanha, no roteiro"); os outros três são da viagem toda.
- **Conferido:** nenhuma regra de CSS depende da posição desses blocos (não há seletor de
  irmão nem `:last-child` envolvendo `.bigsum`, `.filt` ou `.fita`), e a faixa aparece sem
  precisar rolar.

## 5. Transporte: a opção metrô — ✅ **NO AR** (ele rodou o SQL em 06/09)

**Ele disse:** *"adicione a opção de metro"*

Hoje o tipo só aceita trem, avião, ônibus e carro.

- **Banco: SIM — é o único da lista que precisa.** A coluna `kind` da tabela `leg` tem uma
  trava que lista os quatro tipos permitidos; o metrô é recusado pelo banco até essa trava
  ser trocada. **Se eu mudar só o código, o app parece aceitar e a gravação falha.**
  É um SQL curto, colado uma vez no Supabase — eu deixo pronto na tela para ele clicar.
- **Também:** o emoji, a cor da barrinha da linha e o grupo no Roteiro.
- **Tamanho:** pequeno no código, mas com uma ida ao Supabase.

## ~~6. Transporte: tirar o "quanto custa"~~ — CANCELADO por ele

Ele voltou atrás na mesma conversa: *"fui burro, esse campo do quanto custo é o dinheiro,
deixe ele exatamente assim, foi erro meu, ta certinho"*. **Não mexer.**

## ~~7. Reservas: tirar o "quanto custa"~~ — CANCELADO por ele

*"foi erro meu igual no outro, não faça nada, ta certinho"*. **Não mexer.**

## 6 (novo). A moeda: garantir que o seletor é contabilizado — ✅ **FEITO em 06/09**

**Ele disse, ao cancelar o item de cima:** *"mas deixa em real, a contabilização vai ser
toda feita em reais"*

- **PERGUNTA ANTES DE FAZER:** isso vale só para o campo de valor do Transporte (que hoje
  nasce em €, com o seletor € / R$ ao lado), ou para o app inteiro? Hoje atração e
  hospedagem são em euro, a burocracia em real, e a aba Custos junta os dois pelo câmbio
  que ele digita. "Tudo em reais" pode significar três coisas bem diferentes: (a) só o
  transporte nasce em R$; (b) todo campo de valor novo nasce em R$; (c) o app deixa de ter
  euro e converte tudo — o que muda Painel, Custos, Caixa e as contas da seção 11.
- **Tamanho:** (a) é pequeno. (c) é grande.

## 7 (novo). Dicas: um campo para escrever, com país ou "geral" — ✅ **FEITO em 06/09**

**Ele disse:** *"na aba dicas: vamos colocar um input onde eu coloco a dica, alguma
observação e posso selecionar o país ou geral, daí eu posso anotar dicas gerais da viagem"*

Hoje a aba Dicas só tem o `+ DICA` dentro do cartão de cada cidade — não há onde escrever
uma dica que valha para a viagem inteira. Vira um formulário no topo da aba: a dica, uma
observação, e um seletor de **país ou "geral"**.

- **Banco:** nada. Os avisos já são linhas com um `spot`; "geral" é um `spot` novo
  (`dicas:geral`), não uma coluna nova.
- **A decidir:** a dica "geral" aparece só na aba Dicas, ou também no topo das outras?
- **Tamanho:** médio.

## 8 (novo). Hospedagem: a estrutura de preencher de volta, e dois defeitos — ✅ **FEITO em 06/09**

**Ele disse:** *"na aba hospedagem eu quero a estrutura que tínhamos antes para preencher:
nome da cidade, localização do airbnb, link para a reserva, custo por noite, quantos
dias... do jeito que está agora está tudo jogado e mal formatado, olha esse botão de
acrescentar todo mal adicionado"*

**O que aconteceu com a estrutura:** os campos que ele quer EXISTEM no banco — endereço,
link, check-in, check-out, total. Mas a Fase 6 os escondeu atrás do "é esta": eles só
aparecem depois de marcar a opção fechada. Diária e noites ficaram na linha, endereço e
link sumiram até ele escolher. Ele quer os cinco visíveis para **preencher**, que é o
verbo que ele usou.

**Os dois defeitos, medidos no site publicado em 06/09:**

- **O botão "acrescentar opção" vaza.** O formulário tem TRÊS campos e usa a grade
  `.addrow.three`, que declara QUATRO colunas (`1fr 96px 62px auto`). O botão cai na faixa
  de **62px** e precisa de **177px** — por isso "ACRESCEN…" sai cortado para fora.
  Sobrou de quando havia um seletor de moeda ali. É trocar a classe.
- **A caixa de nota é BRANCA no tema escuro.** `estilo-atual.css:46` dá `color: inherit`
  a `input,textarea`, mas não dá fundo — e esta é a **única** `textarea` do app que vive
  dentro de uma `.mrow` (as outras estão em `.fld`, que tem fundo próprio). Medido:
  `background: rgb(255,255,255)` com texto cinza. É irmã da armadilha do `select` preto
  no preto que consertamos hoje: elemento que não herda o tema.

- **Banco:** nada.
- **Tamanho:** médio. Os dois defeitos são pequenos; a estrutura é o grosso.

---

## 9. Hospedagem, de tarde: "ali está apenas um campo"

> *"agora vamos ajsutar a aba de hospedagens deve ter campos suficientes para eu preencher
> os dados do airbnb (endereço, diaria, localização, observação....) ali está apenas um
> campo como que vou preencher isso"* — com a foto da aba de Madrid.

**O item 8 saiu de manhã e mesmo assim ele viu um campo só.** A explicação: o item 8 arrumou
a opção que EXISTE, e Madrid tem zero opções. Do lado dele, a aba Hospedagem era uma tirinha
com um campo de texto e um botão — os oito campos estavam do outro lado de um clique que
ninguém tinha como adivinhar.

**Nenhuma coluna nova.** Todos os campos que ele lista já existiam; o conserto foi trazer o
formulário inteiro para ANTES de salvar, e abri-lo por padrão numa base vazia. O detalhe
está na `Acrescentar` de `src/screens/Hospedagem.tsx` e na seção 0 do `COMO-MEXER.md`.

Junto foram: o `"quanto custa"` cortado em `"quanto cu"` (coluna de 96px), os rótulos
desencontrados entre as duas telas, o desalinhamento dos campos dentro do `.frow`, o alvo
de toque de 36px no celular, e o aviso que faltava — **opção guardada e não marcada soma
€0**, e nada dizia isso.

- **Banco:** nada.
- **Tamanho:** médio.

---

## A ordem que eu sugiro

**1 ✅ → 4 ✅ → 2 ✅ → 5 ✅ → 3 ✅ → 8 ✅ → 6 ✅ → 7 ✅ → 9 ✅** — a lista inteira saiu, mais o
item 9 que nasceu da foto que ele mandou depois.

Comidas primeiro porque é o que ele mais usa e o que mais atrapalha; a aba Sugestões por
último porque é a única que exige uma sessão inteira.

**Ele ainda não decidiu:** quantas atrações novas quer em Madrid e Lisboa, e com que
critério. Isso continua parado esperando ele — e o destino natural agora é a aba Sugestões
do item 3.
