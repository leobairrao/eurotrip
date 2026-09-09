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

**O QUE JÁ SAIU, em 09/09/2026** — o bloco de limpeza de tela, que era a ordem
que eu sugeri e ele aprovou (*"comece por onde achar melhor"*):

| Item | Onde ele pediu |
|---|---|
| as frases miúdas embaixo dos quatro números do Painel | Tabela 1 |
| a Tabela 1 com **três** números, e o terceiro é **Cidades visitadas** | Tabela 1 |
| o texto *"A tabela sai do calendário…"* | Tabela "roteiro" |
| o cartão **Decisões de roteiro**, e a constante `DECISOES` | Tabela 5 |
| os cinco contadores escritos da legenda do Roteiro | Aba Roteiro |
| o bloco *"10 blocos · 34 dias com base de 34"* | Aba Roteiro |
| o **destaque** do "apagar esta cidade" | Aba Atrações |
| **e uma que ele acrescentou na conversa:** as frases GRANDES de abertura das 11 abas | — |

**Cidades visitadas, a regra que ele deu na conversa de 09/09** — e ela é a coisa
mais importante desta seção, porque ele reformulou o pedido:

> *"quando o roteiro tiver pronto e eu visitar a cidade, eu assinalar que visitei
> 50% dos itens da lista da cidade, mas tem um problema, em roteiro só tem as
> cidades que vou dormir, por exemplo, metz vou dormir mas de lá vou pra
> estrasburgo, luxemburgo e colônia, assim não vai funcionar, vamos ter que
> repensar na lógica"* · *"vou dormir em 7 mas passar por umas 15"*

A conta **não sai da base do dia**: sai da **atração**, a única linha do banco com
cidade e dia ao mesmo tempo (comida guarda país; transporte não guarda lugar).
Visitada = **metade ou mais** das atrações daquela cidade **que estão num dia**
marcadas como feitas. O total são as cidades **que têm atração num dia** — decisão
dele: *"só as que estão num dia de roteiro, afinal são as que vou me propor a
visitar"*. Está em `cidadesVisitadas`, em `src/lib/calc.ts`, com cinco testes e o
número espelhado no `npm run check`.

**O que ele nomeou e ainda não existe: o app confunde "onde durmo" com "onde
passo".** Trier entra como *"um dos dias que estaremos hospedados em Metz"*. Hoje o
dia só tem `base`. É a próxima conversa, e ela atravessa os itens do Roteiro desta
mesma lista.

**O resto não começou.** As perguntas em aberto que eu já enxergo estão marcadas
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

**[a debater] — este é o segundo item mais pesado.** Hoje as 8 bases e os 34
dias vêm de **arquivo**, não do banco: `STAYS` em `src/content`. Editar quantos
dias fica em cada cidade muda a espinha do app — o calendário, as noites, as
contas de hospedagem e o rodapé "32 dias em terra + 2 de voo = 34". Arrastar
dias de uma cidade para outra também **move as datas de tudo que está depois**.

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
4. os dias de cada base saindo do arquivo para o banco.

**Dois são grandes o bastante para virar etapa própria:** o dinheiro do Painel
(o 1) e a edição do roteiro (o 4).

**A ordem que eu sugeriria**, e é conversa: começar pelos que são só tela e não
mexem em dado — tirar textos, a legenda, o bloco de blocos, a Tabela 5, o
destaque do "apagar esta cidade". São rápidos, aparecem na hora, e não travam
nada. Depois os que precisam de decisão de modelagem, um por vez.
