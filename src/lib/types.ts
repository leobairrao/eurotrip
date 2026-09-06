// Uma linha por coisa editavel (secao 6.1). Espelha o esquema do Postgres.
export type Currency = 'eur' | 'brl';
export type Status = 'escolhida' | 'backlog' | 'sugerida';
/**
 * O TEMA da atracao. Era `'passeio' | 'tour'`; virou texto livre em 06/09,
 * a pedido dele: "eu devo poder escolher logo no registro se e passeio ou
 * tour ou outro tema que pode ser escrita livre".
 *
 * Continua sendo `string` e nao um union porque QUALQUER palavra vale — os
 * dois de sempre sao so os que ja vem prontos no menu (`AK` em content). O
 * limite de 24 caracteres mora na tela e na trava do banco
 * (supabase/09-tema-da-atracao.sql), nao aqui.
 *
 * Quem for desenhar tema na tela usa `akEmoji(kind)`, nunca `AKE[kind]`
 * cru: tema inventado nao tem emoji, e `AKE['museu']` e `undefined`.
 */
export type AttrKind = string;
/** Os dois que ja vem no menu. O resto ele escreve. */
export const AK_PADRAO: readonly AttrKind[] = ['passeio', 'tour'];
/** Trava de tamanho, a mesma da tela e da do banco. */
export const AK_MAX = 24;
export type FoodKind = 'prato' | 'restaurante' | 'cafe';
/** 'metro' entrou em 06/09, a pedido dele. Ver o teste em tests/telas.test.mjs:
 *  uma opcao de transporte nova precisa de OITO lugares, nao um. */
export type LegKind = 'trem' | 'aviao' | 'onibus' | 'carro' | 'metro';
export type Who = 'leo' | 'lu';
/** A cor da barra de um aviso: verde, ambar, vermelho. */
export type Tone = 'free' | 'warn' | 'alert';

export interface Day {
  iso: string;
  base: string;
  plan: string;
  updated_at?: string;
  updated_by?: string | null;
}
export interface Attraction {
  id: string;
  city: string;
  name: string;
  price_eur: number;
  note: string;
  /**
   * A ORIGEM da linha, desde 05/09 — nao mais a situacao (5.2 revista).
   * 'sugerida' = a camada que eu pesquisei; o resto = a lista dele.
   * Quem decide dinheiro e etiqueta agora e `day_iso`.
   */
  status: Status;
  kind: AttrKind;
  day_iso: string | null;
  /**
   * OBRIGATORIO de proposito, nao opcional.
   *
   * `load.ts` normaliza cada linha por LISTA BRANCA: campo que o
   * normalizador nao conhece nao e copiado. Uma coluna nova declarada
   * como `paid?: boolean` falharia do pior jeito possivel — a caixinha
   * marcaria, gravaria no banco, apareceria marcada no outro navegador,
   * e sumiria no primeiro F5. Sendo obrigatorio, o `tsc` acusa sozinho
   * todo lugar que esqueceu de preencher.
   */
  paid: boolean;
  seed_id: string | null;
}

/**
 * Uma opcao de hospedagem numa cidade (Fase 6, 05/09/2026).
 *
 * A tabela `stay` tem `city` como chave primaria: so cabia UMA por
 * cidade. Esta nasceu ao lado em vez de trocar a chave da outra, o que
 * arrastaria `Snapshot.stays` de dicionario para lista e com ele
 * load.ts, calc.ts, Painel, Custos, Caixa, check.mjs e dois testes.
 * A `stay` ficou aposentada: continua no banco, ninguem a le.
 *
 * SEM CAMPO DE PAIS: o pais sai da cidade (`CT[city].co`), como em
 * Atracoes. Guardar aqui duplicaria a verdade.
 */
export interface StayOption {
  id: string;
  city: string;
  name: string;
  note: string;
  /** A diaria CHEIA do anuncio, nao a parte dele (regra 5.7). */
  nightly_eur: number | null;
  nights: number | null;
  /** Se > 0, ignora diaria x noites. */
  total_eur: number | null;
  address: string;
  check_in: string;
  check_out: string;
  link: string;
  /** "e essa". SO a marcada entra no custo da viagem. */
  chosen: boolean;
  paid: boolean;
  position: number;
  seed_id: string | null;
}
export interface Food {
  id: string;
  country: string;
  name: string;
  note: string;
  kind: FoodKind;
  day_iso: string | null;
  seed_id: string | null;
}
export interface Leg {
  id: string;
  position: number;
  name: string;
  note: string;
  kind: LegKind;
  amount: number | null;
  currency: Currency;
  bought: boolean;
  day_iso: string | null;
  seed_id: string | null;
}
export interface Booking {
  id: string;
  position: number;
  name: string;
  note: string;
  amount: number | null;
  currency: Currency;
  done: boolean;
  seed_id: string | null;
}
export interface Stay {
  city: string;
  address: string;
  check_in: string;
  check_out: string;
  nightly_eur: number | null;
  nights: number | null;
  total_eur: number | null;
  link: string;
  notes: string;
}
/**
 * Uma cidade que ELE criou (05/09/2026).
 *
 * As 11 de sempre continuam sendo conteudo fixo, no arquivo. Aqui so
 * moram as que ele acrescentar — e a tabela nasce vazia, entao enquanto
 * ele nao criar nada todo numero da tela e o mesmo, byte a byte.
 *
 * Sem `seed_id`: nada semeia cidade. E sem chave estrangeira ligando
 * `attraction.city` aqui, de proposito — e isso que faz a tabela ausente
 * degradar para "o app de hoje" em vez de recusar escrita em atracao.
 */
export interface CityRow {
  id: string;
  /** A chave, como o resto do app escreve cidade: 'sevilha'. */
  k: string;
  /** O nome na tela: 'Sevilha'. */
  n: string;
  /** Um dos 7 paises. Ele escolheu nao poder criar pais novo. */
  co: string;
  position: number;
}

export interface Extra {
  id: string;
  name: string;
  amount: number | null;
  currency: Currency;
}
export interface Savings {
  who: Who;
  goal: number | null;
  currency: Currency;
}
/**
 * Um aporte: um bolo de dinheiro que entrou no caixa num dia.
 * Nao existe mais "o aporte de setembro" — existe "R$ 1.500 do 13o
 * salario, em 12 de setembro". Uma linha por aporte, com id proprio,
 * igual a `extra` e a `leg`.
 */
export interface Contribution {
  id: string;
  who: Who;
  /** 'aaaa-mm-dd': o dia em que o dinheiro entrou. */
  on_date: string;
  /** De onde veio. Pode ficar vazio. */
  label: string;
  amount: number | null;
  /**
   * A moeda EM QUE ESTE APORTE FOI FEITO (06/09/2026).
   *
   * OBRIGATORIO de proposito, como o `paid` da atracao: `load.ts`
   * normaliza por lista branca, e campo opcional que o normalizador
   * esquece funciona na tela, sincroniza para a outra pessoa e some no
   * primeiro F5. Sendo obrigatorio, o `tsc` acusa sozinho.
   *
   * Ate 06/09 esta coluna nao existia: a moeda de um aporte era lida do
   * SELETOR da pessoa na hora de mostrar. Trocar o seletor depois de
   * lancar reescrevia o passado — R$ 20.000 viravam EUR 20.000, que o
   * Painel mostra como R$ 124.000. Um aporte e um fato do dia em que
   * aconteceu; a moeda dele tambem.
   */
  currency: Currency;
  /** So para desempatar dois aportes do MESMO dia no acumulado. */
  created_at?: string;
}
/**
 * Um aviso: um cartao de recado numa tela.
 *
 * Ate 05/09/2026 eles eram meus e moravam em arquivo (regra 5.6). Agora
 * sao linhas, e ele edita e apaga. O `body` e TEXTO PURO: negrito se
 * escreve *assim*, e a tela converte com `marcado()`.
 */
export interface Aviso {
  id: string;
  /** onde aparece: 'atracoes:lisboa' | 'roteiro:2026-12-10' | 'comidas:pt' | 'comidas:pt:naovale' | 'transporte' */
  spot: string;
  tone: Tone;
  title: string;
  body: string;
  position: number;
  seed_id: string | null;
}
export interface Settings {
  id: number;
  eur_rate: number;
  flight_paid_brl: number;
}
export interface AppUser {
  id: string;
  email: string;
  who: Who;
}

/** Tudo o que o app tem em memoria. */
export interface Snapshot {
  days: Record<string, Day>;
  attractions: Attraction[];
  foods: Food[];
  legs: Leg[];
  bookings: Booking[];
  /**
   * APOSENTADA em 05/09 (Fase 6). Continua carregada do banco para nao
   * perder nada, mas nenhuma tela le e nenhuma conta soma. Quem manda e
   * `stayOptions`. Apagar a tabela e decisao de outra rodada.
   */
  stays: Record<string, Stay>;
  /** As opcoes de hospedagem de todas as cidades. Filtre com C.staysOf. */
  stayOptions: StayOption[];
  /** So as cidades que ELE criou. As 11 fixas estao em CT. Junte com C.cidadesDe. */
  cities: CityRow[];
  extras: Extra[];
  settings: Settings;
  killed: string[];
  adopted: string[];
  /**
   * As DUAS linhas da Caixa (meta e moeda de cada um), e os aportes.
   *
   * A secao 7 propunha deixar isto privado (cada um so a propria linha) e
   * mandava perguntar antes de abrir. Perguntado em 04/09: o Leo escolheu
   * abrir, igual ao artefato de hoje. Os dois leem e escrevem os dois.
   * Para fechar de novo, veja a nota no fim de supabase/02-politicas.sql.
   */
  savings: Record<Who, Savings>;
  /** Todos os aportes dos dois, sem ordem garantida. Ordene com C.cxLista. */
  contributions: Contribution[];
  /** Os avisos de todas as telas. Filtre com C.avisosDe(s, spot). */
  avisos: Aviso[];
  me: AppUser | null;
  /**
   * A data de hoje, fixada UMA vez no servidor (ISO 'aaaa-mm-dd').
   * Serve para "dias ate embarcar" e para a lista de meses da Caixa
   * baterem no servidor e no cliente — senao o React reclama de
   * hidratacao quando os dois estao em fusos diferentes.
   */
  hoje: string;
}

export const EMPTY_STAY = (city: string): Stay => ({
  city,
  address: '',
  check_in: '',
  check_out: '',
  nightly_eur: null,
  nights: null,
  total_eur: null,
  link: '',
  notes: '',
});
