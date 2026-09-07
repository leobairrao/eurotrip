# O que ficou para depois — 07/09/2026

A etapa 1 do Roteiro está no ar. Ao longo dela apareceram treze coisas que
não entraram, de propósito. Nenhuma bloqueia nada hoje. Este arquivo existe
para elas não se perderem.

**Três são decisão sua** e estão no fim, separadas. As outras dez são
técnicas, e a revisão final do branch triou cada uma: o que vira tarefa e o
que é para nunca mexer.

Nada aqui começou.

---

## A que precisa acontecer antes da etapa 2

### `DiaTags` é uma segunda implementação do dia

`src/screens/Roteiro.tsx`. É a tira de etiquetas embaixo de cada dia na lista
de blocos. Ela monta e ordena as quatro origens **por conta própria**, e
discorda do `src/lib/dia.ts` em duas coisas:

- **Ordem entre tipos.** Ela desenha transporte → atração → **comida → item
  livre**. O `dia.ts` ordena transporte → atração → **item livre → comida**.
  Comida e item livre estão trocados.
- **Ordem dentro do tipo.** Ela usa `C.legsOfDay`/`C.attrsOfDay`/
  `C.foodsOfDay`, que ordenam por tipo de transporte, por situação e por
  tipo de comida. O `dia.ts` ordena por `day_pos` e depois por id. Dois
  trens no mesmo dia já saem numa ordem na tira e noutra na visualização.

Ela também recalcula o total do dia por outro caminho, com um filtro de
`day_item` próprio — a mesma forma das duas cópias desatualizadas da fórmula
do total que esta etapa teve que consertar, um nível abaixo.

**Hoje o custo é baixo:** a tira é um resumo, e você nunca vê as duas ao
mesmo tempo. **A partir da etapa 2 não é:** no momento em que você ordenar o
dia com as setas, a lista de blocos vai mostrar aquele dia numa ordem que
você não escolheu, e a tira vai ignorar o `day_pos` de três das quatro
origens.

**O conserto:** fazer o `DiaTags` consumir `D.itensDoDia(s, iso)` e
`D.totalDoDia(s, iso)`, mantendo a classe CSS de cada etiqueta pelo
`x.tabela`. Isso apaga a ordem divergente, apaga o total duplicado, e de
quebra resolve o item 8 desta lista.

Não entrou na etapa 1 porque **muda a ordem visível** da lista de blocos, e
uma mudança visível precisa de prova na tela e de revisão própria — a rodada
final não tinha uma segunda chance.

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

### 8. O `dia.ts` filtra `day_item` na mão

`src/lib/dia.ts`, enquanto as outras três origens passam por `C.*OfDay`.

Recusei criar um `C.dayItemsOfDay` duas vezes durante a etapa, porque não
havia duplicação real para evitar. A revisão final concordou e disse para
recusar uma terceira: **o conserto certo é o do `DiaTags` lá em cima**, que
faz o segundo filtro desaparecer em vez de virar abstração.

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

## As três que são decisão sua

Não são falhas. São escolhas que eu não podia fazer no seu lugar.

### A. A aba Custos parou de fechar consigo mesma

O rodapé "Total" da tabela imprime o total real da viagem, que agora inclui o
item livre do dia. As linhas da tabela **não** o incluem — e corretamente,
porque a spec diz que o item livre não entra em Custos: *"aparecer nos dois
lugares seria dois lugares para mexer no mesmo dinheiro"*.

Antes desta etapa o rodapé fechava exatamente com a soma das linhas visíveis.
A partir do primeiro item livre com valor, não fecha mais.

**Hoje a diferença é provadamente zero** — nenhuma tela cria item livre
ainda, e o `npm run check` imprime a contagem viva. Precisa estar resolvido
**antes de a etapa 2 ligar o formulário**, não antes de qualquer outra coisa.

As três saídas, sem eu escolher nenhuma:

1. uma nota de rodapé na tabela explicando a diferença;
2. uma linha só de leitura, que mostra sem deixar editar ali;
3. um total separado, deixando o da tabela fechar com as linhas dela.

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
