import { countries, type Feed } from "./data";
import { type Frequency } from "./cadence";
export type TimedPoint = { date: string; value: number };
export type Release = {
  country: string;
  key: string;
  label: string;
  frequency: Frequency;
  unit: string;
  value: number;
  date: string;
  history: TimedPoint[];
  source: string;
  url: string;
  definition: string;
  aggregation?: string;
};
export type PolicyRate = {
  country: string;
  value: number;
  lower?: number;
  date: string;
  lastChange?: string;
  history: TimedPoint[];
  source: string;
  url: string;
  definition: string;
};
export type ReleaseData = {
  series: Release[];
  errors: { country: string; key: string; message: string }[];
};
export const bisCodes: Record<string, string> = {
  US: "USA",
  XM: "EMU",
  GB: "GBR",
  JP: "JPN",
  CN: "CHN",
  CA: "CAN",
  AU: "AUS",
  CH: "CHE",
  NZ: "NZL",
  IN: "IND",
  BR: "BRA",
  ZA: "ZAF",
};
/** Strict CSV reader: quoted commas, escaped quotes and CRLF are supported. */
export function csvRows(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  if (quoted) throw new Error("CSV incomplet");
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const header = rows.shift()?.map((s) => s.replace(/^\uFEFF/, "").trim());
  if (!header?.length) throw new Error("CSV vide");
  return rows.map((values) =>
    Object.fromEntries(header.map((key, i) => [key, values[i]?.trim() ?? ""])),
  );
}
function numeric(text: string | undefined) {
  return text !== undefined &&
    text !== "" &&
    text !== "." &&
    Number.isFinite(Number(text))
    ? Number(text)
    : null;
}
export function parseBis(
  text: string,
  today = new Date().toISOString().slice(0, 10),
): PolicyRate[] {
  const rows = csvRows(text);
  if (
    (rows.length && !("REF_AREA" in rows[0])) ||
    (rows.length && !("OBS_VALUE" in rows[0]))
  )
    throw new Error("Schéma BRI invalide");
  const all: Record<string, TimedPoint[]> = {};
  for (const row of rows) {
    const country = bisCodes[row.REF_AREA],
      value = numeric(row.OBS_VALUE),
      date = row.TIME_PERIOD;
    if (
      !country ||
      value === null ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      date > today ||
      (row.FREQ && row.FREQ !== "D")
    )
      continue;
    if (row.UNIT_MULT && Number(row.UNIT_MULT) !== 0)
      throw new Error("Échelle BRI non prise en charge");
    all[country] ??= [];
    all[country].push({ date, value });
  }
  return Object.entries(all).map(([country, points]) => {
    const history = [...new Map(points.map((p) => [p.date, p])).values()].sort(
      (a, b) => a.date.localeCompare(b.date),
    );
    const last = history.at(-1)!;
    const change = history.findLast(
      (p, i) => i > 0 && p.value !== history[i - 1].value,
    );
    return {
      country,
      ...last,
      history,
      lastChange: change?.date,
      source: "BRI · taux directeur de référence",
      url: "https://data.bis.org/topics/CBPOL",
      definition:
        "Taux de référence de politique monétaire selon la définition nationale harmonisée par la BRI ; pas un taux de prêt réel.",
    };
  });
}
export type FredDefinition = {
  country: string;
  key: string;
  id: string;
  frequency: "M" | "Q" | "D";
  unit: string;
  label: string;
  transform?: "yoy" | "difference";
  factor?: number;
  definition: string;
};
const isoByCode = Object.fromEntries(countries.map((c) => [c.code, c.iso]));
export const fredDefinitions: FredDefinition[] = [
  {
    country: "USA",
    key: "inflation",
    id: "CPIAUCSL",
    frequency: "M",
    unit: "%",
    label: "Inflation IPC · glissement annuel",
    transform: "yoy",
    definition:
      "IPC désaisonnalisé BLS, variation par rapport au même mois de l’année précédente.",
  },
  {
    country: "USA",
    key: "unemployment",
    id: "UNRATE",
    frequency: "M",
    unit: "%",
    label: "Taux de chômage",
    definition: "Taux de chômage U-3 BLS, désaisonnalisé.",
  },
  {
    country: "USA",
    key: "growth",
    id: "GDPC1",
    frequency: "Q",
    unit: "%",
    label: "Croissance réelle du PIB · glissement annuel",
    transform: "yoy",
    definition:
      "PIB réel BEA désaisonnalisé, variation par rapport au même trimestre de l’année précédente.",
  },
  {
    country: "USA",
    key: "payrolls",
    id: "PAYEMS",
    frequency: "M",
    unit: "milliers",
    label: "Créations d’emplois non agricoles",
    transform: "difference",
    definition:
      "Variation mensuelle de l’emploi salarié non agricole BLS, désaisonnalisé, en milliers.",
  },
  {
    country: "USA",
    key: "retail",
    id: "RSAFS",
    frequency: "M",
    unit: "%",
    label: "Ventes au détail · glissement annuel",
    transform: "yoy",
    definition:
      "Ventes nominales du Census Bureau désaisonnalisées ; variation sur un an, pas corrigée de l’inflation.",
  },
  {
    country: "USA",
    key: "industrial",
    id: "INDPRO",
    frequency: "M",
    unit: "%",
    label: "Production industrielle · glissement annuel",
    transform: "yoy",
    definition:
      "Indice de production industrielle de la Réserve fédérale désaisonnalisé ; variation sur un an.",
  },
  {
    country: "USA",
    key: "yield2",
    id: "DGS2",
    frequency: "D",
    unit: "%",
    label: "Rendement du Trésor à 2 ans",
    definition:
      "Taux nominal de maturité constante du Trésor américain ; observation quotidienne publiée, pas une cotation intrajournalière.",
  },
  {
    country: "USA",
    key: "yield10",
    id: "DGS10",
    frequency: "D",
    unit: "%",
    label: "Rendement du Trésor à 10 ans",
    definition:
      "Taux nominal de maturité constante du Trésor américain ; observation quotidienne publiée, pas une cotation intrajournalière.",
  },
  ...countries
    .filter((c) => !["USA", "EMU"].includes(c.code))
    .map((c) => ({
      country: c.code,
      key: "inflation",
      id: `CPALTT01${isoByCode[c.code]}${["AUS", "NZL"].includes(c.code) ? "Q" : "M"}659N`,
      frequency: ["AUS", "NZL"].includes(c.code)
        ? ("Q" as const)
        : ("M" as const),
      unit: "%",
      label: "Inflation IPC · glissement annuel",
      definition:
        "IPC tous postes OCDE via FRED ; variation par rapport à la même période de l’année précédente.",
    })),
  ...countries
    .filter((c) => !["USA", "EMU"].includes(c.code))
    .map((c) => ({
      country: c.code,
      key: "growth",
      id: `NAEXKP01${isoByCode[c.code]}Q189S`,
      frequency: "Q" as const,
      unit: "%",
      label: "Croissance réelle du PIB · glissement annuel",
      transform: "yoy" as const,
      definition:
        "PIB réel OCDE désaisonnalisé via FRED ; variation par rapport au même trimestre de l’année précédente.",
    })),
  ...countries
    .filter((c) => ["GBR", "JPN", "CAN", "AUS", "CHE", "NZL"].includes(c.code))
    .map((c) => ({
      country: c.code,
      key: "unemployment",
      id: `LRHUTTTT${isoByCode[c.code]}${c.code === "NZL" ? "Q" : "M"}156S`,
      frequency: c.code === "NZL" ? ("Q" as const) : ("M" as const),
      unit: "%",
      label: "Taux de chômage harmonisé",
      definition:
        "Taux de chômage harmonisé OCDE via FRED, désaisonnalisé ; couverture harmonisée différente de l’estimation annuelle OIT.",
    })),
];
export function fredPoints(
  text: string,
  id: string,
  today = new Date().toISOString().slice(0, 10),
): TimedPoint[] {
  const rows = csvRows(text);
  if (!rows.length || !(id in rows[0]))
    throw new Error(`Série ${id} absente de la réponse FRED`);
  return rows
    .flatMap((row) => {
      const date = row.observation_date ?? row.DATE;
      const value = numeric(row[id]);
      return value === null || !/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today
        ? []
        : [{ date, value }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
function lagDate(date: string, months: number) {
  const [year, month] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 - months, 1))
    .toISOString()
    .slice(0, 10);
}
export function toRelease(text: string, d: FredDefinition): Release {
  const raw = fredPoints(text, d.id);
  const byDate = new Map(raw.map((p) => [p.date, p.value]));
  const history = raw.flatMap((p) => {
    if (!d.transform) return [{ ...p, value: p.value * (d.factor ?? 1) }];
    const old = byDate.get(
      lagDate(p.date, d.transform === "yoy" ? 12 : d.frequency === "Q" ? 3 : 1),
    );
    return old === undefined || (d.transform === "yoy" && old === 0)
      ? []
      : [
          {
            date: p.date,
            value:
              d.transform === "yoy" ? (p.value / old - 1) * 100 : p.value - old,
          },
        ];
  });
  const latest = history.at(-1);
  if (!latest) throw new Error(`Pas assez d’observations pour ${d.id}`);
  return {
    country: d.country,
    key: d.key,
    label: d.label,
    unit: d.unit,
    frequency: d.frequency,
    ...latest,
    history,
    source:
      "FRED · " +
      (["CPIAUCSL", "UNRATE", "PAYEMS"].includes(d.id)
        ? "BLS"
        : d.id === "GDPC1"
          ? "BEA"
          : d.id.startsWith("DGS")
            ? "US Treasury"
            : d.id === "RSAFS"
              ? "US Census"
              : d.id === "INDPRO"
                ? "Federal Reserve"
                : "OCDE"),
    url: `https://fred.stlouisfed.org/series/${d.id}`,
    definition: d.definition,
  };
}
export function aggregateRelease(
  series: Release,
  frequency: Frequency,
): Release | null {
  if (series.frequency === frequency) return series;
  const required =
    series.frequency === "M"
      ? frequency === "Q"
        ? 3
        : frequency === "S"
          ? 6
          : 0
      : series.frequency === "Q" && frequency === "S"
        ? 2
        : 0;
  if (!required) return null;
  const groups = new Map<string, TimedPoint[]>();
  for (const p of series.history) {
    const year = p.date.slice(0, 4),
      month = +p.date.slice(5, 7);
    const start =
      frequency === "Q"
        ? Math.floor((month - 1) / 3) * 3 + 1
        : month <= 6
          ? 1
          : 7;
    const key = `${year}-${String(start).padStart(2, "0")}-01`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const history = [...groups].flatMap(([date, points]) =>
    new Set(
      points.map((p) =>
        series.frequency === "M"
          ? p.date.slice(0, 7)
          : `${p.date.slice(0, 4)}-Q${Math.floor((+p.date.slice(5, 7) - 1) / 3)}`,
      ),
    ).size === required
      ? [
          {
            date,
            value: points.reduce((sum, p) => sum + p.value, 0) / required,
          },
        ]
      : [],
  );
  const last = history.at(-1);
  return last
    ? {
        ...series,
        ...last,
        frequency,
        history,
        aggregation:
          frequency === "S"
            ? "Moyenne semestrielle calculée sur des périodes complètes"
            : "Moyenne trimestrielle calculée sur trois mois complets",
      }
    : null;
}
