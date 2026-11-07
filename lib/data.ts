export type Country = {
  code: string;
  iso: string;
  name: string;
  flag: string;
  currency: string;
  bank: string;
  region: string;
  description: string;
};
export const countries: Country[] = [
  {
    code: "USA",
    iso: "US",
    name: "États-Unis",
    flag: "🇺🇸",
    currency: "USD",
    bank: "Réserve fédérale",
    region: "Amériques",
    description:
      "Première économie mondiale et émetteur de la principale monnaie de réserve. L’emploi, les prix à la consommation et les décisions du FOMC structurent les anticipations de marché.",
  },
  {
    code: "EMU",
    iso: "EU",
    name: "Zone euro",
    flag: "🇪🇺",
    currency: "EUR",
    bank: "Banque centrale européenne",
    region: "Europe",
    description:
      "Union monétaire européenne. La dynamique des prix, le crédit et la production industrielle sont au cœur de la politique de la BCE.",
  },
  {
    code: "GBR",
    iso: "GB",
    name: "Royaume-Uni",
    flag: "🇬🇧",
    currency: "GBP",
    bank: "Bank of England",
    region: "Europe",
    description:
      "Économie de services et place financière majeure. L’inflation des services, les salaires et les décisions de la BoE orientent la livre sterling.",
  },
  {
    code: "JPN",
    iso: "JP",
    name: "Japon",
    flag: "🇯🇵",
    currency: "JPY",
    bank: "Bank of Japan",
    region: "Asie-Pacifique",
    description:
      "Grande économie exportatrice. Les salaires, l’inflation et la normalisation de la politique de la BoJ sont déterminants pour le yen.",
  },
  {
    code: "CHN",
    iso: "CN",
    name: "Chine",
    flag: "🇨🇳",
    currency: "CNY",
    bank: "People’s Bank of China",
    region: "Asie-Pacifique",
    description:
      "Deuxième économie mondiale et centre manufacturier. Le crédit, l’immobilier, les exportations et les mesures de soutien déterminent le cycle domestique.",
  },
  {
    code: "CAN",
    iso: "CA",
    name: "Canada",
    flag: "🇨🇦",
    currency: "CAD",
    bank: "Bank of Canada",
    region: "Amériques",
    description:
      "Économie ouverte liée au commerce américain et aux matières premières. L’emploi, l’inflation et les prix de l’énergie influencent le dollar canadien.",
  },
  {
    code: "AUS",
    iso: "AU",
    name: "Australie",
    flag: "🇦🇺",
    currency: "AUD",
    bank: "Reserve Bank of Australia",
    region: "Asie-Pacifique",
    description:
      "Exportateur majeur de matières premières, sensible à la demande asiatique. L’emploi et l’inflation guident la politique de la RBA.",
  },
  {
    code: "CHE",
    iso: "CH",
    name: "Suisse",
    flag: "🇨🇭",
    currency: "CHF",
    bank: "Banque nationale suisse",
    region: "Europe",
    description:
      "Économie exportatrice à forte valeur ajoutée. Le franc suisse joue un rôle de valeur refuge ; la BNS surveille les prix et le taux de change.",
  },
  {
    code: "NZL",
    iso: "NZ",
    name: "Nouvelle-Zélande",
    flag: "🇳🇿",
    currency: "NZD",
    bank: "Reserve Bank of New Zealand",
    region: "Asie-Pacifique",
    description:
      "Économie ouverte portée par l’agriculture et les services. La demande extérieure, l’emploi et la politique de la RBNZ influencent le dollar néo-zélandais.",
  },
  {
    code: "IND",
    iso: "IN",
    name: "Inde",
    flag: "🇮🇳",
    currency: "INR",
    bank: "Reserve Bank of India",
    region: "Asie-Pacifique",
    description:
      "Grande économie émergente portée par la demande intérieure et les services. L’inflation, l’énergie importée et les flux de capitaux influencent la roupie.",
  },
  {
    code: "BRA",
    iso: "BR",
    name: "Brésil",
    flag: "🇧🇷",
    currency: "BRL",
    bank: "Banco Central do Brasil",
    region: "Amériques",
    description:
      "Principale économie sud-américaine et exportateur de matières premières. Le cycle des taux, les finances publiques et l’inflation influencent le réal.",
  },
  {
    code: "ZAF",
    iso: "ZA",
    name: "Afrique du Sud",
    flag: "🇿🇦",
    currency: "ZAR",
    bank: "South African Reserve Bank",
    region: "Afrique",
    description:
      "Économie industrialisée et minière sensible au cycle mondial. Le rand réagit aux flux de capitaux, aux métaux et aux décisions de la SARB.",
  },
];
export const indicators = [
  {
    id: "NY.GDP.MKTP.KD.ZG",
    key: "growth",
    label: "Croissance du PIB",
    unit: "%",
    detail: "Variation annuelle du PIB réel",
  },
  {
    id: "FP.CPI.TOTL.ZG",
    key: "inflation",
    label: "Inflation",
    unit: "%",
    detail: "Prix à la consommation · variation annuelle",
  },
  {
    id: "SL.UEM.TOTL.ZS",
    key: "unemployment",
    label: "Chômage",
    unit: "%",
    detail: "Estimation modélisée OIT · part de la population active",
  },
  {
    id: "NY.GDP.MKTP.CD",
    key: "gdp",
    label: "PIB nominal",
    unit: "$",
    detail: "Dollars américains courants",
  },
  {
    id: "BN.CAB.XOKA.GD.ZS",
    key: "balance",
    label: "Compte courant",
    unit: "%",
    detail: "Solde en pourcentage du PIB",
  },
  {
    id: "SP.POP.TOTL",
    key: "population",
    label: "Population",
    unit: "",
    detail: "Population totale",
  },
  {
    id: "NY.GDP.PCAP.CD",
    key: "gdpPerCapita",
    label: "PIB par habitant",
    unit: "$",
    detail: "Production par habitant · USD courants",
  },
  {
    id: "NY.GDP.PCAP.KD.ZG",
    key: "perCapitaGrowth",
    label: "Croissance par habitant",
    unit: "%",
    detail: "Variation annuelle du PIB réel par habitant",
  },
  {
    id: "NE.EXP.GNFS.ZS",
    key: "exports",
    label: "Exportations",
    unit: "%",
    detail: "Biens et services · part du PIB",
  },
  {
    id: "NE.IMP.GNFS.ZS",
    key: "imports",
    label: "Importations",
    unit: "%",
    detail: "Biens et services · part du PIB",
  },
  {
    id: "NE.TRD.GNFS.ZS",
    key: "trade",
    label: "Ouverture commerciale",
    unit: "%",
    detail: "Exportations + importations · part du PIB",
  },
  {
    id: "NE.GDI.TOTL.ZS",
    key: "investment",
    label: "Investissement",
    unit: "%",
    detail: "Formation brute de capital · part du PIB",
  },
  {
    id: "NE.CON.PRVT.ZS",
    key: "consumption",
    label: "Consommation des ménages",
    unit: "%",
    detail: "Dépenses de consommation des ménages · part du PIB",
  },
  {
    id: "NE.CON.GOVT.ZS",
    key: "government",
    label: "Consommation publique",
    unit: "%",
    detail: "Dépenses de consommation des administrations · part du PIB",
  },
  {
    id: "GC.DOD.TOTL.GD.ZS",
    key: "debt",
    label: "Dette publique centrale",
    unit: "%",
    detail:
      "Dette de l’administration centrale · part du PIB ; couverture variable selon pays",
  },
  {
    id: "GC.BAL.CASH.GD.ZS",
    key: "fiscal",
    label: "Solde budgétaire",
    unit: "%",
    detail: "Solde de trésorerie de l’administration centrale · part du PIB",
  },
  {
    id: "FR.INR.RINR",
    key: "realRate",
    label: "Taux d’intérêt réel",
    unit: "%",
    detail:
      "Taux débiteur ajusté du déflateur du PIB ; ce n’est pas le taux directeur",
  },
  {
    id: "FI.RES.TOTL.CD",
    key: "reserves",
    label: "Réserves internationales",
    unit: "$",
    detail: "Réserves totales, or compris · USD courants",
  },
  {
    id: "BX.KLT.DINV.WD.GD.ZS",
    key: "fdi",
    label: "Investissement direct étranger",
    unit: "%",
    detail: "Entrées nettes d’IDE · part du PIB",
  },
  {
    id: "SL.TLF.CACT.ZS",
    key: "participation",
    label: "Participation au marché du travail",
    unit: "%",
    detail: "Population active · 15 ans et plus, estimation OIT",
  },
  {
    id: "NV.IND.TOTL.ZS",
    key: "industry",
    label: "Industrie",
    unit: "%",
    detail:
      "Valeur ajoutée de l’industrie, construction comprise · part du PIB",
  },
  {
    id: "NV.SRV.TOTL.ZS",
    key: "services",
    label: "Services",
    unit: "%",
    detail: "Valeur ajoutée des services · part du PIB",
  },
] as const;
export type Point = { value: number; year: string };
export type Observation = Point & { history?: Point[] };
export type Macro = Record<string, Record<string, Observation>>;
export type News = {
  title: string;
  url: string;
  source: string;
  date: string;
  category: string;
};
export type Event = {
  title: string;
  country: string;
  date: string;
  impact: string;
  forecast: string;
  previous: string;
  actual: string;
};
export type Fx = {
  date: string;
  base: string;
  rates: Record<string, number>;
  history: { date: string; rates: Record<string, number> }[];
};
export type Feed<T> = {
  status: "ok" | "error";
  data: T;
  fetchedAt: string;
  error?: string;
};
export type TerminalData = {
  news: Feed<News[]>;
  calendar: Feed<Event[]>;
  fx: Feed<Fx | null>;
  macro: Feed<Macro>;
};
export const currencyFlags: Record<string, string> = Object.fromEntries(
  countries.map((c) => [c.currency, c.flag]),
);
export function safeUrl(value: unknown): string {
  try {
    const u = new URL(String(value));
    return u.protocol === "https:" ? u.href : "";
  } catch {
    return "";
  }
}
export function parseCalendar(rows: unknown): Event[] {
  if (!Array.isArray(rows)) throw new Error("Calendrier invalide");
  return rows
    .filter(
      (r) =>
        r && typeof r.title === "string" && Number.isFinite(Date.parse(r.date)),
    )
    .map((r) => ({
      title: r.title,
      country: String(r.country || ""),
      date: r.date,
      impact: String(r.impact || "Low"),
      forecast: String(r.forecast ?? ""),
      previous: String(r.previous ?? ""),
      actual: String(r.actual ?? ""),
    }))
    .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
}
export function parseMacro(body: unknown): Macro {
  if (!Array.isArray(body) || !Array.isArray(body[1]))
    throw new Error("Données macro indisponibles");
  const result: Macro = {};
  for (const row of body[1]) {
    if (typeof row.value !== "number" || !Number.isFinite(row.value)) continue;
    const key = indicators.find((i) => i.id === row.indicator?.id)?.key;
    const country = row.countryiso3code;
    if (!key || !country) continue;
    result[country] ??= {};
    const history = result[country][key]?.history ?? [];
    if (!history.some((p) => p.year === String(row.date)))
      history.push({ value: row.value, year: String(row.date) });
    history.sort((a, b) => Number(a.year) - Number(b.year));
    if (result[country][key]) result[country][key].history = history;
    if (
      !result[country][key] ||
      Number(row.date) > Number(result[country][key].year)
    )
      result[country][key] = {
        value: row.value,
        year: String(row.date),
        history,
      };
  }
  return result;
}
