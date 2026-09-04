# Como usar este pacote

Você tem em mãos a especificação completa do seu app de viagem, pronta para virar um site na
Vercel que você e a Lu editam juntos.

---

## 1. Antes de pedir para o Claude Code

Duas coisas que só você pode fazer:

**Crie uma conta no Supabase** (supabase.com, plano free serve). Guarde o link do projeto. (ja tenho conta, use o chrome para acessar)

**Decida os dois e-mails.** São os únicos que vão conseguir entrar no site. O seu e o da Lu —
e tem que ser um e-mail que ela acessa de verdade, porque o login é por link enviado no e-mail. (leobairrao05@gmail.com e luisaanadamelo@gmail.com)

---

## 2. O que pedir

Abra o Claude Code numa pasta vazia, ponha esta pasta dentro dela, e mande isto:

> Leia `ESPECIFICACAO.md` por inteiro antes de escrever qualquer código, e abra
> `referencia/artefato-v28.html` no navegador para ver como o app funciona hoje.
>
> Construa esse mesmo app como um site Next.js na Vercel, com Supabase de banco, login por
> link mágico e dois usuários que editam ao mesmo tempo — eu e a Lu. O visual tem que ficar
> igual ao de hoje; o CSS está em `referencia/estilo-atual.css`.
>
> Comece pelo banco e pela importação dos meus dados de `dados/estado-atual-do-leo.json`, e me
> mostre os três números de aceite da seção 12.3 antes de partir para as telas. Depois faça as
> telas na ordem: Roteiro, Atrações, Transporte, Comidas, Painel, Custos, Hospedagem, Reservas,
> Caixa.
>
> Não invente tela, campo nem cidade que não esteja na especificação.

Ele vai pedir a URL e a chave do Supabase em algum momento. **A chave de service role só entra
nos scripts que rodam na sua máquina, nunca no site.** A especificação diz isso, mas confirme.

---

## 3. A ordem que eu sugiro

| passo | por que nessa ordem |
|---|---|
| 1. banco + importar seus dados | se seus dados não sobreviverem, nada mais importa |
| 2. login com os dois e-mails | testar a dois exige as duas contas de pé |
| 3. Roteiro | é a tela que você mais usa, e a mais complexa |
| 4. Atrações e Transporte | alimentam o Roteiro |
| 5. Comidas | mesma mecânica, mais simples |
| 6. Painel e Custos | são só leitura, derivados de tudo acima |
| 7. Hospedagem e Reservas | formulários diretos |
| 8. Caixa | é a única com dado privado, deixe para quando o resto estiver firme |

**Peça para ele publicar na Vercel já no passo 2**, ainda feio e incompleto. É melhor descobrir
problema de deploy e de link mágico cedo do que no fim.

---

## 4. O teste que decide se deu certo

Não é uma tela bonita. É este:

> Você e a Lu, cada um num navegador, ao mesmo tempo. Você marca uma atração num dia; **aparece
> na tela dela sem ela recarregar**. Ela lança o aporte dela na Caixa; **o total geral na sua
> tela sobe**. Vocês dois digitam ao mesmo tempo em campos diferentes; **nenhum dos dois perde
> o que digitou.**

Se isso funcionar, o projeto entregou o que devia. A seção 15 da especificação tem a lista
inteira de aceite — passe por ela antes de considerar pronto.

---

## 5. O artefato de hoje continua existindo

Não apague. Ele é a sua referência visual e o seu backup do conteúdo enquanto o site novo não
estiver firme. Quando o site estiver funcionando com os dois, aí você para de usar o artefato.

**E o conteúdo que ainda falta** — as listas de atrações de Metz, Luxemburgo, Reims, Amsterdã e
Roma — pode ser acrescentado nos dois: eu ponho no artefato, e a especificação (seção 12.4)
explica como acrescentar nos JSONs sem quebrar nada.

---

## 6. O que tem nesta pasta

```
COMECE-AQUI.md                este arquivo
ESPECIFICACAO.md              a especificação completa — 16 seções
dados/                        13 arquivos JSON: o conteúdo e o SEU estado atual
referencia/estilo-atual.css   o CSS do app de hoje, inteiro
referencia/artefato-v28.html  o app de hoje, funcionando. Abre offline no navegador
```
