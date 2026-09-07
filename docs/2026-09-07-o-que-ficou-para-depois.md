# O que ficou para depois — 07/09/2026

A etapa 1 do Roteiro está no ar. Ao longo dela apareceram treze coisas que
não entraram, de propósito. Nenhuma bloqueia nada hoje. Este arquivo existe
para elas não se perderem.

**Três eram decisão sua** e estão no fim — a primeira já foi resolvida. As outras dez são
técnicas, e a revisão final do branch triou cada uma: o que vira tarefa e o
que é para nunca mexer.

Nada aqui começou.

---

## A que precisava acontecer antes da etapa 2 — RESOLVIDA em 07/09

### `DiaTags` era uma segunda implementacao do dia

Era a tira de etiquetas embaixo de cada dia na lista de blocos. Ela montava e
ordenava as quatro origens por conta propria, e discordava do `src/lib/dia.ts`
em duas coisas: comida e item livre trocados, e a ordem dentro de cada tipo.
Recalculava tambem o total do dia por outro caminho.

**Hoje ela consome `D.itensDoDia` e `D.totalDoDia`.** O `Roteiro.tsx` encolheu
64 linhas e perdeu seis imports que ficaram órfãos.

A correção não era trocar a fonte e pronto, como parecia: as etiquetas são
coloridas **por tipo** — `tk-trem`, `fk-rest`, e `pgo` no trecho comprado — e o
`ItemDoDia` não carregava nem `kind` nem `bought`. Consumir a lista como
estava teria apagado todas as cores. Então o `ItemDoDia` ganhou um campo
`classe`, resolvido por origem no `dia.ts` — pelo mesmo motivo que ele já
resolve o emoji e a linha miúda: é escolha de exibição por tipo, e o tipo só
existe lá dentro.

Ficaram dois testes: um prende a classe das quatro origens e o caso do trecho
comprado; o outro **proíbe o `Roteiro.tsx` de voltar a buscar o dia sozinho**.
O segundo foi sabotado com o código antigo e falhou, como devia. Ele ignora
comentários — os comentários citam os nomes proibidos de propósito, ao contar
a história.

**O que mudou na sua tela:** a ordem da tira. Comida e item livre trocaram, e
dentro de cada tipo a ordem passou a ser a mesma da visualização do dia. Era o
preço combinado, e a etapa 2 dá a palavra final às setas nas duas telas.

Isso resolve também o item 8 desta lista.

---

## As nove técnicas, com a triagem da revisão final

### 1. Seis símbolos mortos que nada no projeto detecta

`coOf` e `Status` (`calc.ts`), `Settings` (`load.ts`), `insert`
(`Reservas.tsx`), `CO` e `CT` (`Sugestoes.tsx`). Todos anteriores a esta
etapa. Achados com:

```bash
npx tsc --noEmit --noUnusedLocals --incremental false
```

que o projeto não roda, porque o `tsconfig.json` não liga `noUnusedLocals` e
não há eslint instalado.

**Vira tarefa.** A sugestão da revisão: ligar `noUnusedLocals` no `tsconfig`
fecha a classe inteira numa linha. Faça como tarefa própria, para as
deleções resultantes serem revisáveis de uma vez.

### 2. Um `.catch` morto sobrou no `check.mjs`

`scripts/check.mjs:53` — `const cidades = await g('city').catch(() => []);`

É a mesma forma que esta etapa corrigiu para o `day_item`: o `g` usa o
`precisa`, que faz `process.exit(1)` em qualquer erro, então o `catch` nunca
roda. É código morto que se descreve como proteção.

**Vira tarefa, e é uma linha** — apagar o `.catch`. Não há comportamento a
preservar. Junte com o item 1.

### 3. A `ESPECIFICACAO.md` é uma quarta cópia do esquema que nenhum teste vigia

O teste desta etapa compara três arquivos SQL entre si. A seção de DDL da
especificação não entra na comparação, e está atrás: faltam as tabelas
`adopted`, `aviso`, `city` e `stay_option`.

**Vira tarefa.** A etapa 1 acrescentou o `day_item` e escreveu, na própria
seção, que ela está atrasada e que o `supabase/00-tudo.sql` é quem manda. A
revisão final considerou isso a mitigação correta para um documento que
nenhum teste consegue policiar barato.

### 4. Deriva de coluna dentro dessa mesma seção

As tabelas que **estão** na especificação também estão atrás:

| tabela | o que falta |
|---|---|
| `attraction` | `updated_by`; e o `check` de `kind` ainda diz `in ('passeio','tour')`, de antes do `09-tema-da-atracao.sql` |
| `food` | `updated_by`. O `check` de `kind` está certo |
| `leg` | `updated_by` **e** `created_at`; e o `check` de `kind` não tem `'metro'`, de antes do `07-metro.sql` |

**Vira tarefa, junto com o item 3** — a revisão sugeriu tratar os dois como
um só trabalho: "trazer a seção 6.2 para o `00-tudo.sql`". É mecânico.

### 5. O `02-politicas.sql` nunca cobriu três tabelas

`stay_option`, `city` e `day_item`. Anterior a esta etapa. O `00-tudo.sql`
cobre, e é o que você usa; o caminho `01-schema.sql` + `02-politicas.sql`
ficou marcado como **aposentado** nesta etapa, com um cabeçalho dizendo o
que aconteceria se alguém o usasse.

**Vira tarefa, e a revisão deu um atalho melhor:** o `01-schema.sql` agora
*cria* o `day_item`, então acrescentar ali as três linhas de RLS, realtime e
replica identity custa cinco linhas e elimina a armadilha em vez de
documentá-la.

### 6. A comparação das cópias do esquema é posicional

Linha N contra linha N. Frágil se alguém reformatar um dos SQL.

**Vira tarefa, de baixa prioridade.** A revisão final olhou o extrator e o
considerou mais robusto do que parece: ele tira comentários, linhas em branco
e vírgulas finais antes de comparar, então só uma quebra real de uma coluna
em outro número de linhas o derruba.

### 7. Cinco normalizadores seguem sem teste de campo

`normCity`, `normStayOption`, `normBooking`, `normAporte` e `normAviso`.

Esta etapa fechou essa classe para `normAttr`, `normFood`, `normLeg` e
`normDayItem` — o teste existe porque trocar duas colunas do mesmo tipo
compila limpo e nenhum outro teste pega.

**Vira tarefa, e comece pelo `normStayOption`:** ele tem `position` e
`nights`, os dois `number`, que é exatamente a falha que a etapa provou ser
real.

### 8. — ✅ **RESOLVIDO junto com o `DiaTags`**

Era o `dia.ts` filtrar `day_item` na mão enquanto as outras três origens
passavam por `C.*OfDay`. Recusei criar um `C.dayItemsOfDay` três vezes, e a
revisão final concordou: o conserto certo era o do `DiaTags`, que fez o
segundo filtro desaparecer em vez de virar abstração. Foi o que aconteceu.

### 9. Miudezas do SQL da etapa

Um `raise exception` inalcançável no bloco de conferência; o bloco supõe que
`day` tem pelo menos uma linha; a conferência não exercita o `is_member()`;
rodar o SQL duas vezes com o app aberto transmite um item fantasma pelo
tempo real; e o teste apaga por nome, não por id.

**Vira tarefa, ou nunca.** A migração já rodou com sucesso e é idempotente.
A única que a revisão mudaria, se o arquivo for rodado de novo algum dia, é o
delete por nome — capturar o `id` do `returning` e apagar por ele, para uma
linha de verdade chamada `__teste do dia__` não ser pega junto.

### 10. Três funções reconstroem a lista do dia cada uma

`proximaPos`, `totalDoDia` e `feitasDoDia`. A visualização chama as três por
render.

**Nunca.** A revisão final foi explícita: a 34 dias e ~10 itens isto é de
graça, e três funções pequenas e corretas valem mais que uma memoizada. Se um
dia importar, o ponto quente é o `feitasDoDia` sendo chamado por linha da
lista de blocos — e o conserto do `DiaTags` já deixaria uma chamada só
alimentar a tira e a contagem.

---

## As que são decisão sua

Não são falhas. São escolhas que eu não podia fazer no seu lugar. A primeira
já foi resolvida por você em 07/09; ficam duas.

### A. A aba Custos — ✅ **RESOLVIDA em 07/09**

Você escolheu: a spec proíbe **editar** o item livre em dois lugares, não
mostrá-lo. Então ele virou **uma linha só de leitura**, igual às outras cinco
— toda linha daquela tabela já é dinheiro editado em outra tela, e a coluna
"de onde vem" existe para dizer isso. A dela manda de volta para o Roteiro.

A linha só aparece quando houver item livre, no molde das duas "Outras
linhas". Hoje ela não aparece, e a tabela fecha: R$ 5.080 do voo + R$ 257 de
burocracia = R$ 5.337, o mesmo do rodapé.

Ficaram **dois** testes, porque o primeiro sozinho não bastava:

- `calc.test.mjs` **11.9** tranca a aritmética — as categorias somadas dão o
  `totalBrl`.
- `telas.test.mjs` lê os dois arquivos e exige que **toda fonte de dinheiro do
  `totalBrl` seja citada no `Custos.tsx`**. Este é o que importa: sem ele, eu
  tirei o conserto da tela e a suíte passou verde. Com ele, falha dizendo qual
  fonte entrou no total e não virou linha.

**O que não deu para conferir na tela:** a linha desenhada. Seu banco não tem
nenhum item livre, e eu não crio um só para testar. A aritmética e a guarda
estão trancadas por teste; o visual da linha se vê no primeiro item que você
escrever.

### B. A cor da etiqueta do item livre

Toda etiqueta `.dtg` de tipo tem um `border-left-color` da sua paleta. A do
item livre é a única sem — hoje ela cai no cinza padrão, e lê como
esquecimento em vez de escolha.

Não existe regra `.dtg.di` em nenhum CSS: a classe está lá e é inerte. O
conserto é uma linha nova, quando você disser a cor.

### C. Se vale fechar a dívida do esquema de uma vez

Os itens 3, 4 e 5 são o mesmo assunto em três tamanhos: a especificação e o
`02-politicas.sql` descrevem um banco que não é mais o seu. Dá para tratar
como uma tarefa só, ou deixar cada um seguir seu caminho. A revisão final
sugeriu juntar 3 e 4; eu acrescento que o 5 é da mesma família.
