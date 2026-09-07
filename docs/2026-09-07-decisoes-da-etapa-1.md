# As decisões da etapa 1 do Roteiro — 07/09/2026

A etapa 1 foi executada por subagentes, tarefa a tarefa, com uma revisão
depois de cada uma e uma revisão do branch inteiro no fim. Ao longo dela eu
tomei **33 decisões no seu lugar**, porque o processo manda decidir e seguir
em vez de parar e perguntar a cada dúvida.

Este arquivo é para você poder desfazer o que discordar. A primeira parte são
as sete que **mudaram o produto**. A segunda é o que foi provado na tela. O
anexo tem as 33, na ordem em que aconteceram, cada uma com o que custa se eu
estiver errado.

O que ficou pendente está no arquivo ao lado:
[`2026-09-07-o-que-ficou-para-depois.md`](2026-09-07-o-que-ficou-para-depois.md).

---

## As sete que mudaram o produto

### 1. A visualização virou só-leitura de verdade

O plano mandava desenhar o componente `Avisos` dentro da visualização. Ele
traz um botão `mexer`, e dentro do `mexer` há um `×` que **apaga a linha na
hora, sem confirmação**. Dois toques a partir da tela de leitura destruíam um
aviso.

Enquanto isso o cabeçalho do próprio arquivo jurava: *"a caixinha e o
[editar] são as únicas coisas clicáveis. Nenhum campo de texto, nenhum `x`,
nenhum seletor"*. O arquivo se contradizia.

Dei um modo só-leitura ao `Avisos` — prop opcional, padrão igual ao de hoje,
que esconde o `mexer` e o `+ aviso`. Os outros dez lugares que usam o
componente não mudaram. Nada se perdeu: o editor renderiza o mesmo `Avisos`
com os controles inteiros, então editar aviso do dia só passou a ficar atrás
do botão — que é o princípio da etapa.

**Custa se errado:** você ganha um toque a mais para criar um aviso do dia.

### 2. O estado de edição subiu para o `useUi`

O plano guardava em `Roteiro.tsx` qual dia está sendo editado. Na tela isso
falhava de dois jeitos: voltar a um dia que você já tinha editado **reabria o
editor**, e tocar no dia em que você já está não fechava nada.

Movi o estado para o `useUi` e o limpo dentro do `irParaDia`, junto das três
linhas que já estavam lá — o arquivo já fazia exatamente isso com outros três
estados, sob o comentário *"Trocar de dia zera os chips de escolha"*.

**Custa se errado:** vira estado global de UI; se um dia outra tela precisar
de um "editando" diferente, colide.

### 3. A Tarefa 4 consertou sete usos fora do que foi pedido

O teste novo dos emojis pegou usos crus pré-existentes em `Comidas.tsx`,
`Transporte.tsx` e `Sugestoes.tsx`. Deixá-los quebrados daria um teste
vermelho permanente ou uma exceção no teste.

**Custa se errado:** o diff daquela tarefa tocou quatro telas em vez de uma.

### 4. O item livre passou a aparecer no resumo do dia

O `DiaTags` ignorava o `day_item`: não somava o dinheiro dele, não desenhava
etiqueta, e escondia o dia inteiro se só houvesse um item livre.

O que decidiu foi o comentário que **já estava naquele bloco**, escrito em
06/09: ele conta que a etiqueta antes somava só euros e que *"um trem de
R$ 800 no mesmo dia de uma atração de EUR 20 desaparecia do resumo (…) Não
contava errado; **escondia**"*. Omitir o item livre é o mesmo defeito, no
mesmo lugar.

**Custa se errado:** o diff daquela tarefa cresceu.

### 5. Um defeito antigo saiu de carona

`tests/calc.test.mjs` tinha `avisos: []` duas vezes no mesmo objeto, a segunda
mal indentada — colagem acidental que nenhum lint pega, porque não há lint.
Mandei apagar na mesma passada, já que a tarefa editava aquelas linhas.

**Custa se errado:** uma linha a mais no diff.

### 6. A especificação admite por escrito o que está atrasada

A seção de esquema dela é uma quarta cópia do banco que nenhum teste vigia, e
estava cinco tabelas atrás. Acrescentei só o que esta etapa criou, e uma linha
dizendo que ela segue atrás de outras quatro e que o `00-tudo.sql` é quem
manda.

Não backfillei as quatro: acrescentar só o `day_item` deixaria a seção
*parecendo* em dia enquanto ainda mentia sobre quatro tabelas.

**Custa se errado:** a especificação ganha uma linha de dívida em vez de
ganhar quatro tabelas que ninguém reviu.

### 7. A prova de tela foi minha, não dos subagentes

O plano manda "provar na tela" em três tarefas. Subagente não dirige
navegador com confiança, e subir o servidor durante um build corrompe o
`.next` neste projeto. Tirei o passo dos subagentes e fiz eu, com o Chrome, no
seu banco de verdade.

**Custa se errado:** se algo quebrasse de um jeito invisível para o
compilador e para os testes, só apareceria na minha passada — que é o que
acabou acontecendo, e foi assim que os dois defeitos da visualização
apareceram.

---

## O que foi provado na tela, e o que não foi

Rodei as oito conferências do plano contra o banco de produção, com o
`.next` limpo. **As oito passam.** As que valem número:

- **Sair do editor pela seta** abre o dia seguinte na visualização, não no
  editor — é o que prova a escolha de guardar o ISO em vez de um booleano.
- **F5 mantém a caixinha marcada**, o que prova que o `done` foi ao banco e
  voltou pelo normalizador.
- **Tempo real:** marquei numa instância e o item apareceu riscado na outra
  em menos de três segundos, sem recarregar. Fiz com um iframe da própria app
  dentro da página, que tem assinatura de tempo real própria.
- **A 356px** a caixinha mede 24×24 (o alvo da WCAG 2.2) e não há rolagem
  horizontal.
- A visualização tem **zero campos de texto** e exatamente dois clicáveis.

Depois do push, conferi de novo **no site publicado**: o cabeçalho computa
`display: grid` e o `editar` fica encostado na direita — a correção de
especificidade está valendo em produção.

**O que não deu para provar na tela, e por quê:**

- **O chip `hoje` desenhado e clicado.** Exigiria que hoje caísse dentro dos
  34 dias, e a data é fixada no servidor. Em vez disso fui na origem: o
  `hojeIso()` devolve `'aaaa-mm-dd'` com zero à esquerda, o mesmo formato dos
  `ISOS` — então a comparação vai casar em dezembro. O chip está ausente pelo
  motivo certo.
- **A etiqueta do item livre e a cor dela.** Seu banco não tem nenhuma linha
  de `day_item`, e eu não criei uma só para testar.
- **O cartão de aviso em modo leitura.** Mesmo motivo: não há aviso nos dias
  do roteiro.

Para testar a caixinha eu marquei o `done` de uma linha real de comida (o
Supermercado Pingo Doce, 12/12), desmarquei ao fim e recarreguei do banco
para conferir. Nenhuma outra linha foi tocada.

---

## Duas vezes em que eu estava errado

Vale registrar, porque o padrão é útil: nas duas eu conferi por `grep` e
supus, e quem estava certo conferiu o referente.

- Listei o `marcado` como "fica em `Roteiro.tsx`" porque a palavra aparecia
  duas vezes. As duas eram prosa — um texto de tela e um comentário. O
  implementador conferiu à mão e me corrigiu.
- Achei que a documentação errava ao dizer "350 linhas" e "oito testes".
  Minha medição era de antes da última tarefa, e "oito testes" falava dos
  testes *dentro* de um arquivo, não do número de arquivos. As duas
  afirmações estavam certas.

---

## Anexo — as 33 decisões, na ordem

O registro cru, como ficou no ledger da execução. Formato: o que decidi, por
que, e o que custa se eu estiver errado.

1. trabalhar em BRANCH no diretorio atual, e nao em git worktree — um

2. o teste da T9 fica como esta, e o plano ja o rotula ("Este teste tranca

3. T10 (`git push origin main`) NAO e executada por subagente. Push em

4. T1 passo 7 (ele rodar o SQL no Supabase) tambem para. Deixo colado e

5. o `scripts/task-brief` da skill procura cabecalho "Task N" e o plano

6. IMP#1 se resolve MARCANDO `01-schema.sql` e `02-politicas.sql` como aposentados em favor de `00-tudo.sql`, e nao sincronizando os dois. Sincronizar de verdade exigiria trazer stay_option, city, attraction.paid e todas as politicas — e outra tarefa, fora do que esta aqui. O caminho ja esta quebrado hoje (faltam duas tabelas inteiras), entao ninguem o usa; o perigo e o cabecalho dizer "rode depois de 01-schema". Custa se errado: os dois arquivos ficam so como historia e alguem que quisesse um banco novo usa o 00-tudo, que e o correto e o unico testado.

7. entram na rodada 1 tambem os Minor #5, #7 e #8, porque os tres corrompem o QUE ELE LE ao rodar o SQL — #5 diz "rls ok" com a RLS podendo estar desligada, #7 pode contar coluna de outro schema, #8 promete "tudo true" em duas colunas que sao contagem. O resto dos minors fica adiado. Custa se errado: uma rodada de revisao a mais.

8. CONSERTAR AGORA, nao adiar. Exportar os tres normalizadores e testa-los direto, com uma linha crua no formato do banco. O motivo de nao adiar: a T5 vai construir a ORDEM inteira sobre `day_pos`, e se ele estiver ligado na coluna errada tudo abaixo fica sutilmente errado — e certo no compilador. O revisor diz que a lacuna e pre-existente para TODOS os campos de todos os normalizadores; eu nao vou fechar tudo, so o caminho que esta tarefa criou, e o teste estabelece o padrao para quem quiser fechar o resto. Custa se errado: tres funcoes puras de load.ts passam a ser exportadas.

9. mantenho os 7 consertos fora do brief. Sao a MESMA classe de defeito (emoji indexado por valor que vem do banco), o teste novo os acusaria para sempre, e deixa-los quebrados seria um teste vermelho permanente ou uma excecao no teste. Custa se errado: o diff da T4 toca 4 telas em vez de 1, e a revisao tem mais superficie.

10. nao mudo o plano, troco a PROVA. O dispatch da T6 leva um procedimento verificavel no lugar da frase falsa: para cada simbolo movido (`Editor`, `CartaoDia`, `CartaoTransporte`, `CartaoAtracoes`, `CartaoComidas`, `TKROT`, `FKROT`, `TKS`, `ORIGEM`, `ORIGCLS`, `avisoDe`, `alertaDe`), grep em Roteiro.tsx tem que dar zero; e para cada import que sobrou em Roteiro.tsx, grep tem que dar pelo menos um uso no corpo. Eu reconfiro isso na revisao. Custa se errado: nada; e uma conferencia a mais, mecanica.

11. ELEVO o Minor #1 a rodada de correcao, contra a regra padrao de que minor nunca entra no ciclo. O achado: o mapeamento coluna->campo de `nome`, `nota` e `sub` (dia.ts:53-88) NAO TEM UM UNICO ASSERT. Trocar `nome: t.note` compila limpo (string dos dois lados) e passa os 7 testes. Por que elevo: (1) e LITERALMENTE a mesma classe de defeito que a revisao da T3 marcou como Important e que eu ja mandei consertar na hora, com o mesmo argumento — o compilador nao pega troca de campo do mesmo tipo; (2) a T7 renderiza os TRES campos direto na tela, entao um erro aqui vira a T7 "consertando" o sintoma em Vista.tsx em vez da causa em dia.ts; (3) o revisor entregou o assert pronto — o custo e uma linha. Custa se errado: uma rodada de revisao a mais numa tarefa ja aprovada.

12. mando a T8 apagar a linha 98 duplicada na mesma passada em que acrescenta `dayItems: []`, porque o implementador vai estar editando exatamente aquele literal. E o "melhore o codigo que voce esta tocando" que o proprio template do implementador autoriza, e nao inventa escopo novo. Custa se errado: uma linha a mais no diff da T8 para a revisao olhar.

13. o Passo 3 do plano ("provar na tela" com npm run dev) NAO vai para o implementador. Um subagente nao dirige navegador, e a T6 por definicao nao muda NADA visivel — o proprio plano a chama de mecanica. A prova real dela e outra: tsc + suite inteira + build, mais a conferencia por grep de que nada ficou para tras. A prova de TELA acontece UMA vez, na T7, que e onde a mudanca visivel nasce, e eu a faco com o Chrome. Custa se errado: se a T6 quebrasse algo visivel sem quebrar build nem teste, so descobririamos na T7 — e a T7 e a proxima tarefa.

14. o `git add -A` do Passo 5 (plano, linha 1489) NAO vai ser usado. Contradiz a regra que ficou de pe desde a T4, quando apareceram na arvore, sem ninguem pedir, um COMECE-AQUI.md apagado e um load.ts.bak largado. Um `add -A` teria levado os dois para dentro do commit. A T10 vai stagear arquivo por arquivo: COMO-MEXER.md, ESPECIFICACAO.md e docs/2026-09-06-lista-do-leo.md. Custa se errado: nada.

15. o `git push origin main` do Passo 5 NAO e executado por subagente nem por mim. Publica na Vercel na hora, e e efeito fora desta branch — e uma das quatro coisas que mandam parar e perguntar. Alem disso o plano assume que se esta trabalhando em main, e nos estamos na branch roteiro-vista-do-dia: o caminho certo no fim e a skill superpowers:finishing-a-development-branch, que apresenta as opcoes a ele. Eu levo o plano ate o fim da T10 MENOS o push. Custa se errado: nada; no maximo um passo manual que e dele por direito.

16. a T10 fecha SO a parte que este plano criou — acrescenta `day_item` e as colunas `day_pos`/`done` a secao de DDL da ESPECIFICACAO — e acrescenta UMA linha honesta dizendo que a secao esta atras de quatro outras tabelas de fases anteriores (`adopted`, `aviso`, `city`, `stay_option`), nomeando-as e apontando `supabase/00-tudo.sql` como a autoridade. NAO vou backfillar as quatro dentro deste plano: e trabalho de outra fase, incharia o diff da T10 e a superficie da revisao. O que eu nao aceito e o meio-termo silencioso — acrescentar so `day_item` deixaria a secao PARECENDO em dia enquanto ainda mente sobre quatro tabelas. Custa se errado: a ESPECIFICACAO ganha uma linha admitindo divida, em vez de ganhar quatro tabelas que ninguem reviu.

17. DEF#2 se conserta SUBINDO `editando` para o `useUi` e limpando dentro do `irParaDia`, e nao com useEffect local. Conferi a afirmacao do revisor no codigo: `ui.tsx:64-71` ja faz exatamente isso com tres outros estados (`selPick`, `selFPick`, `selTPick`), sob o comentario "Trocar de dia zera os chips de escolha, igual ao artefato". `editando` e a mesma classe de estado — "onde eu estava neste dia" — e limpar no handler mata os dois restos de uma vez: sem paint intermediario, e dispara mesmo quando o iso nao muda. Desvia do plano, que pos o estado em Roteiro.tsx. Custa se errado: `editando` vira estado global de UI; se um dia outra tela precisar de um "editando" diferente, colide. Risco baixo, e visivel.

18. IMP#1 (o `<Avisos>` dentro da vista) SE CONSERTA, nao se documenta. O achado: a vista renderiza `+ aviso do dia` (que abre dois input de texto e um select) e um `mexer` por aviso, e dentro do `mexer` ha um `x` que chama `useApagarLinha` — DELETE imediato, sem confirmacao. Dois toques deliberados a partir da tela de leitura apagam uma linha. O plano mandou o `<Avisos>` e ate comentou "o 'mexer' fica la dentro", ou seja, sabia. Mas o cabecalho do MESMO arquivo jura que "a caixinha e o [editar] sao as unicas coisas clicaveis. Nenhum campo de texto, nenhum `x`, nenhum seletor". O arquivo se contradiz; um dos dois tem que ceder. Escolho consertar o codigo, por tres razoes conferidas por mim: (1) a razao que ELE deu para a regra 1 e "celular na mao, no frio, no metro — qualquer coisa que se apague por encosto e um defeito", e um delete sem confirmacao dentro da tela de leitura e contra isso; (2) `Editor.tsx` renderiza o MESMO `<Avisos spot={roteiro:iso}>`, entao editar aviso do dia JA EXISTE atras do `editar` — a vista nao perde nada sendo so leitura, e isso e literalmente o principio do plano ("a edicao fica atras de um botao"); (3) `Avisos` tem 11 pontos de uso; um prop opcional com padrao igual ao de hoje nao toca nenhum dos outros 10. Custa se errado: se ele quiser acrescentar um aviso sem entrar no editor, passa a ter um toque a mais. Reversivel e visivel.

19. IMP#2 (o teste da constraint de especificidade) ENTRA. O argumento do revisor e o proprio idioma do projeto: `telas.test.mjs` ja tranca a constraint do CT (:48), a do AKE/TKE/FKE (:138) e a do par `.addrow` no @media (:107), esta ultima com o comentario "Este teste faz a obrigacao existir". A constraint de especificidade era a UNICA sem teste, e foi exatamente a que quebrou — e so um humano dirigindo o Chrome pegou. Escopo TRAVADO na forma crua que o revisor descreve (nenhum seletor de extras.css pode ser `.X .h` quando identidade.css governa `.h` via `.card > .h`; escreva `.card.X > .h`), para nao virar um parser de CSS. Custa se errado: um teste que pode dar falso positivo num seletor legitimo no futuro, e ai alguem afrouxa a regex.

20. os quatro Minor entram na mesma rodada, contra a regra de que minor nao entra no ciclo. Os quatro sao de UMA LINHA e estao exatamente nas linhas que a rodada ja vai tocar: o `import * as C` morto em Vista.tsx, o `accent-color`/`cursor` faltando na UNICA caixinha da tela (hoje ela sai no azul padrao do navegador em vez do verde do app — eu vi na captura), o `.dvvl { text-align: left }` morto no @media, e o `type="button"` faltando no `← pronto`. Deixa-los sairia mais caro: tocar as mesmas linhas duas vezes.

21. NAO peco o `C.dayItemsOfDay(s, iso)` que ficou adiado da T5. O motivo do adiamento era "quando a T8 puser day_item em calc.ts, o predicado `d.day_iso !== iso` vira duas copias". Reli o codigo da T8: ela adiciona `dayItemEur(s)`/`dayItemBrl(s)`, que somam TODOS os itens, sem filtro por dia. A duplicacao nao chega a existir. Criar a funcao agora seria refactor fora de escopo, sem duplicacao para evitar. Fica adiado para a revisao final. Custa se errado: nada; e simetria.

22. entram NESTA rodada de correcao o IMP#1 e o IMP#2, e so eles. Os dois sao mecanicos, cabem no escopo da tarefa (o arquivo e o check.mjs, que ela ja edita) e nao pedem decisao de produto nenhuma. Custa se errado: nada; sao dois consertos pequenos e conferiveis.

23. o IMP#3 (Custos.tsx) NAO entra, fica PARKED e sobe para ele. Motivo: a correcao certa exige uma decisao de produto que a spec nao resolve — a spec diz que o item livre "NAO entra na aba Custos" porque "aparecer nos dois lugares seria dois lugares para mexer no mesmo dinheiro". Uma linha SO DE LEITURA na tabela nao criaria segundo ponto de edicao, mas isso e interpretacao minha da spec, e a spec e a autoridade. As opcoes (nota de rodape / linha so-leitura / total separado) sao escolha DELE, do mesmo jeito que as seis decisoes da vista foram. Levo para a T10 documentar como armadilha e digo a ele no fim. Custa se errado: se ele nao ler, a tabela do Custos para de fechar quando a etapa 2 ligar o formulario. Por isso vai documentado E falado, nao so parked.

24. o Minor do `DiaTags` eu ELEVO, e mando para a T9. O achado: o `DiaTags` (Roteiro.tsx) nao soma day_item em `totE`/`totB`, nao desenha etiqueta de day_item, e tem um `return null` que esconde o dia inteiro se so houver day_item. O que decide: o comentario que JA ESTA dentro do DiaTags, escrito em 06/09, diz que a etiqueta antes somava so `dayAttrTotal + dayLegEur` e que "um trem de R$ 800 no mesmo dia de uma atracao de EUR 20 desaparecia do resumo (...) Nao contava errado; ESCONDIA." Omitir day_item e LITERALMENTE o mesmo defeito que aquele conserto fechou, no mesmo bloco de codigo. O arquivo ja tem o precedente escrito. Vai para a T9 porque a T9 e a tarefa que edita `Roteiro.tsx` e ja vai importar `@/lib/dia` — o conserto cai dentro do que ela toca. Custa se errado: o diff da T9 cresce, e a revisao dela tem mais superficie.

25. na rodada 2 o ramo morto SAI, em vez de passar a casar o `PGRST205`. Motivo: a razao de existir da tolerancia EXPIROU. Ela servia para "antes de ele rodar a migracao 10"; ele ja rodou, em 07/09, e conferiu na tela, e um banco novo nasce do `00-tudo.sql`, que ja traz o `day_item`. Hoje, `day_item` sumir do banco seria um problema DE VERDADE que ele quer ver — nao algo a tolerar. E a mensagem de erro ja diz qual e a tabela, entao nao se perde diagnostico. Custa se errado: se um dia alguem montar um banco so com `01-schema.sql`, o check reprova uma linha em vez de tolerar — e o `01-schema.sql` ja esta marcado como APOSENTADO desde a T1.

26. o Minor (`.dtg.di` sem cor propria) NAO entra. Toda outra etiqueta `.dtg.<x>` tem um `border-left-color`; a nova cai no cinza padrao e le como esquecimento. Mas escolher a cor e decisao DELE — e do mesmo tipo das seis que ele decidiu uma a uma na spec — e o proprio revisor calibrou como "pending design decision, not a defect". Parked, e sobe para ele no fim. Custa se errado: a etiqueta nasce cinza e ele troca em cinco segundos.

27. tipo sem cor. Ruling: e escolha DELE. Sobe no fim.

28. alem das DUAS armadilhas que o plano dita verbatim, a T10 documenta TRES que esta execucao descobriu e que custariam tempo ao proximo. Escolhi tres, nao dez, para nao diluir a secao: (a) o `tsc` NAO aponta import morto (sem `noUnusedLocals`, sem eslint no projeto). Mordeu na T6 e revelou SETE simbolos mortos no repo. (b) `extras.css` TERMINA dentro de um `@media (max-width: 700px)`. Colar regra "no fim do arquivo" a escopa para celular, em silencio. Quase mordeu na T7 e na T9; so nao mordeu porque eu avisei nos dois. (c) `precisa()` faz `process.exit(1)`, entao `.catch` depois de `g()` e codigo morto. Mordeu na T8, e AINDA HA UMA VIVA em check.mjs:53 (`cidades`), que a revisao final vai triar. A da especificidade nao entra como armadilha porque agora TEM teste, que se cobra sozinho; entra como linha do item 11. Custa se errado: a secao de armadilhas fica tres bullets maior.

29. ELEVO o segundo Minor, que o revisor marcou como "awareness only". `ESPECIFICACAO.md:1011-1018` tem a formula do `totalReal` SEM os termos do item livre. Conferi. Dois motivos para nao deixar: (1) o documento passa a se CONTRADIZER — o texto novo do item 11, escrito nesta mesma tarefa, afirma que o dinheiro do item livre ja entra no total real, e a formula tres secoes abaixo mostra que nao; (2) e a QUINTA copia da mesma formula (calc.ts, check.mjs, e esta), e a segunda cópia desatualizada que este branch encontra. Foi exatamente o defeito que a T8 corrigiu no check.mjs. Deixar a spec errada seria consertar o codigo e deixar o documento que o explica mentindo. Custa se errado: duas linhas a mais numa formula em prosa.

30. a leva unica de correcao leva SEIS itens, e NAO leva o refactor do DiaTags. O que entra: (1) os tres textos que mentem na tela; (2) o cabecalho obsoleto; (3) o teste de campo do `normDayItem`, o unico normalizador que este branch criou e o unico sem teste, num caminho de dinheiro; (4) `day_item` no `COM_AUTOR` do store; (5) o `av` morto no Editor.tsx novo; (6) os dois numeros velhos na documentacao. Por que o DiaTags NAO entra, sendo Important: a skill da UMA leva de correcao e UMA re-revisao, sem segunda chance. Os seis acima sao mecanicos ou aditivos e se verificam com certeza. O refactor do DiaTags MUDA A ORDEM VISIVEL da lista de blocos (comida e item livre trocam de lugar) e pediria prova de tela propria; apostar uma mudanca visivel numa rodada irrepetivel e o jeito errado de fecha-la. Vira tarefa nomeada, obrigatoria ANTES da etapa 2 — que e exatamente o prazo que a propria revisao deu. Custa se errado: a lista de blocos e a vista do dia seguem ordenando os mesmos itens de formas diferentes ate essa tarefa acontecer. Hoje ninguem ve as duas ao mesmo tempo; com as setas da etapa 2, veria.

31. vou fazer UMA correcao a mais, contra o padrao da skill de que a leva final e unica. O que entra: os dois numeros, e a troca da string. Por que eu me afasto do padrao: a regra existe para impedir churn aberto, e isto nao e churn — sao tres inteiros que eu verifico com `wc -l` e uma string que o proprio revisor ditou. Nao sobrou julgamento para revisar. Devolver a ele um branch cuja documentacao eu SEI que esta errada, na tabela que a leva anterior existiu para corrigir, seria trabalho malfeito. NAO vou despachar outra revisao depois: a conferencia e mecanica e eu a faco direto. Custa se errado: uma mudanca de texto entra sem olho de revisor. Mitigado por ser a redacao que o revisor pediu, palavra por palavra, e por eu conferir os numeros contra o `wc -l`.

32. NAO apago o workspace, embora a skill mande apagar quando a revisao final fecha. O motivo: a premissa dela e "o historico do git e o registro agora", e aqui isso NAO VALE para o `adiados-para-a-revisao-final.md` — a lista de treze pendencias com a triagem que a revisao final fez (o que bloqueia merge, o que vira tarefa, o que e "never") esta so nesse arquivo, e o `.superpowers/` e gitignored. Apagar destruiria a unica copia de um trabalho util. Deixo de pe e pergunto a ele se quer que vire um doc versionado ou se pode ir embora. Custa se errado: um diretorio de scratch fica no disco dele ate ele decidir.

33. NAO apaguei o branch `roteiro-vista-do-dia`, embora a skill mande apagar depois de um merge verde. Motivo: eu deixei um portao humano ANTES do push — ele ainda nao viu a tela. Enquanto a main nao foi publicada, o nome do branch e a ancora obvia para desfazer (um `git reset --hard c45abf0` na main, com o branch ainda apontando para o trabalho). Depois que ele publicar, o branch nao serve mais para nada e eu apago se ele quiser. Custa se errado: um nome de branch a mais na lista.
