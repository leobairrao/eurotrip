# A lista do Leo — 06/09/2026

Ele checou o sistema inteiro e mandou sete coisas. A regra que ele deu: **uma de cada
vez**, não tudo de uma vez. Nada aqui começou.

Antes dela, o que já saiu hoje: a cidade nova não derruba mais o app, e agora existe uma
rede embaixo dele (`error.tsx`). Está no ar e provado no site.

---

## 1. Comidas: um campo só, com etiqueta — **FEITO em 06/09, esperando publicar**

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

## 2. Roteiro: "vou usar transporte neste dia?"

**Ele disse:** *"deve ter um on/off assim: vou usar transporte esse dia? Se eu ativar, abre
a seleção e eu coloco qual transporte vou usar"*

No cartão "Como eu me movo neste dia", hoje a lista de trechos já vem aberta com os
quatro grupos. Passa a vir fechada, com um liga/desliga em cima; ligou, abre a seleção.

- **Banco:** nada.
- **Tamanho:** pequeno.

## 3. A aba Sugestões

**Ele disse:** *"coloque todas as suas sugestões em uma aba chamada Sugestões e separe por
seguimento (comida, atração...), quando eu te pedir ajuda você coloca por lá, pode fazer
sub-abas lá dentro"*

Tudo que eu pesquisei sai de dentro das abas dele e vai para uma aba própria, com sub-abas
por segmento. Vira também o lugar onde eu ponho o que ele me pedir daqui pra frente — a
pesquisa nova de Madrid e Lisboa, por exemplo.

- **Banco:** nada. O que é meu já se distingue pelo `status = 'sugerida'`.
- **Atenção:** é a 11ª aba, e mexe em Atrações, Comidas e Reservas ao mesmo tempo.
- **Tamanho:** grande. É o maior da lista.

## 4. Atrações: os números no topo

**Ele disse:** *"as infos da viagem devem aparecer no topo da aba logo abaixo das bandeiras
dos países"*

A faixa com "Portugal no roteiro · no roteiro na viagem · em reais · fora do roteiro
somaria" hoje fica no rodapé da aba, depois de todos os cartões. Sobe para logo abaixo das
bandeiras.

- **Banco:** nada.
- **Tamanho:** pequeno.

## 5. Transporte: a opção metrô

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

## 6 (novo). A contabilização toda em reais

**Ele disse, ao cancelar o item de cima:** *"mas deixa em real, a contabilização vai ser
toda feita em reais"*

- **PERGUNTA ANTES DE FAZER:** isso vale só para o campo de valor do Transporte (que hoje
  nasce em €, com o seletor € / R$ ao lado), ou para o app inteiro? Hoje atração e
  hospedagem são em euro, a burocracia em real, e a aba Custos junta os dois pelo câmbio
  que ele digita. "Tudo em reais" pode significar três coisas bem diferentes: (a) só o
  transporte nasce em R$; (b) todo campo de valor novo nasce em R$; (c) o app deixa de ter
  euro e converte tudo — o que muda Painel, Custos, Caixa e as contas da seção 11.
- **Tamanho:** (a) é pequeno. (c) é grande.

---

## A ordem que eu sugiro

**1 (feito) → 4 → 2 → 6 (depois de ele responder) → 5 → 3.**

Comidas primeiro porque é o que ele mais usa e o que mais atrapalha; a aba Sugestões por
último porque é a única que exige uma sessão inteira.

**Ele ainda não decidiu:** quantas atrações novas quer em Madrid e Lisboa, e com que
critério. Isso continua parado esperando ele — e o destino natural agora é a aba Sugestões
do item 3.
