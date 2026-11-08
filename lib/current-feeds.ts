import { type Feed, countries } from "./data";
import { cadence } from "./cadence";
import {
  type Release,
  type PolicyRate,
  type ReleaseData,
  parseBis,
  fredDefinitions,
  toRelease,
  fredPoints,
} from "./releases";
async function request(url: string, format: "csv" | "json", ttl: number) {
  const response = await fetch(url, {
    next: { revalidate: ttl },
    signal: AbortSignal.timeout(10000),
    headers: { Accept: format === "csv" ? "text/csv" : "application/json" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return format === "csv" ? response.text() : response.json();
}
const since = () => `${new Date().getUTCFullYear() - 6}-01-01`;
const fredUrl = (ids: string[]) =>
  `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${ids.join(",")}&cosd=${since()}&coed=${new Date().toISOString().slice(0, 10)}`;
export async function getPolicyRates(): Promise<
  Feed<Record<string, PolicyRate>>
> {
  const data: Record<string, PolicyRate> = {};
  const problems: string[] = [];
  await Promise.all([
    (async () => {
      try {
        const text = await request(
          `https://stats.bis.org/api/v1/data/WS_CBPOL/D.US+XM+GB+JP+CN+CA+AU+CH+NZ+IN+BR+ZA?startPeriod=${since()}&format=csv`,
          "csv",
          cadence.rates.ttl,
        );
        for (const row of parseBis(text))
          if (data[row.country]?.source !== "Federal Reserve · FRED")
            data[row.country] = row;
      } catch (error) {
        problems.push(
          `BRI : ${error instanceof Error ? error.message : "indisponible"}`,
        );
      }
    })(),
    (async () => {
      try {
        const csv = await request(
          fredUrl(["DFEDTARU", "DFEDTARL"]),
          "csv",
          cadence.rates.ttl,
        );
        const upper = fredPoints(csv, "DFEDTARU"),
          lower = fredPoints(csv, "DFEDTARL");
        const last = upper.at(-1),
          low = lower.find((p) => p.date === last?.date);
        if (!last || !low || low.value > last.value)
          throw new Error("Fourchette Fed incohérente");
        const change = upper.findLast(
          (p, i) =>
            i > 0 &&
            (p.value !== upper[i - 1].value ||
              lower.find((l) => l.date === p.date)?.value !==
                lower.find((l) => l.date === upper[i - 1].date)?.value),
        );
        const row: PolicyRate = {
          country: "USA",
          ...last,
          lower: low.value,
          history: upper,
          lastChange: change?.date,
          source: "Federal Reserve · FRED",
          url: "https://fred.stlouisfed.org/series/DFEDTARU",
          definition:
            "Fourchette cible des federal funds : borne inférieure et borne supérieure. Le graphique trace la borne supérieure.",
        };
        return row;
      } catch (error) {
        problems.push(
          `Fed : ${error instanceof Error ? error.message : "indisponible"}`,
        );
        return null;
      }
    })().then((row) => {
      if (row) data.USA = row;
    }),
  ]);
  // Give the directly published Fed target precedence even when the BRI request resolves later.
  // US uses the BRI reference when the direct target could not be fetched.
  return {
    status: Object.keys(data).length ? "ok" : "error",
    data,
    fetchedAt: new Date().toISOString(),
    ...(problems.length ? { error: problems.join(" · ") } : {}),
  };
}
export function parseEurostat(
  body: unknown,
  definition: {
    key: string;
    label: string;
    frequency: "M" | "Q";
    definition: string;
    url: string;
  },
): Release {
  const json = body as {
    id?: string[];
    size?: number[];
    value?: Record<string, number> | number[];
    dimension?: Record<
      string,
      {
        category: {
          index: Record<string, number> | string[];
          label?: Record<string, string>;
        };
      }
    >;
  };
  if (!json.id || !json.size || !json.dimension?.time || !json.value)
    throw new Error("Réponse Eurostat invalide");
  if (json.id.some((id, i) => id !== "time" && json.size![i] !== 1))
    throw new Error("Réponse Eurostat ambiguë");
  const index = json.dimension.time.category.index;
  const entries = Array.isArray(index)
    ? index.map((key, i) => [key, i] as const)
    : Object.entries(index);
  const today = new Date().toISOString().slice(0, 10);
  const history = entries
    .flatMap(([period, i]) => {
      let date = "";
      if (/^\d{4}-\d{2}$/.test(period)) date = period + "-01";
      else if (/^\d{4}-Q[1-4]$/.test(period))
        date =
          period.slice(0, 4) +
          "-" +
          String((Number(period.at(-1)) - 1) * 3 + 1).padStart(2, "0") +
          "-01";
      const value = Array.isArray(json.value)
        ? json.value[Number(i)]
        : json.value![String(i)];
      return date &&
        date <= today &&
        typeof value === "number" &&
        Number.isFinite(value)
        ? [{ date, value }]
        : [];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const last = history.at(-1);
  if (!last) throw new Error("Pas d’observation Eurostat");
  const coverage = Object.values(json.dimension.geo?.category.label ?? {}).join(
    ", ",
  );
  return {
    country: "EMU",
    key: definition.key,
    label: definition.label,
    frequency: definition.frequency,
    unit: "%",
    ...last,
    history,
    source: "Eurostat",
    url: definition.url,
    definition:
      definition.definition + (coverage ? ` Couverture : ${coverage}.` : ""),
  };
}
const europeanDefinitions = [
  {
    key: "inflation",
    label: "Inflation IPCH · glissement annuel",
    frequency: "M" as const,
    dataset: "prc_hicp_manr",
    params: "coicop=CP00&unit=RCH_A",
    definition:
      "Indice harmonisé des prix à la consommation, tous postes, variation sur un an ; différent de l’IPC national américain.",
  },
  {
    key: "unemployment",
    label: "Taux de chômage harmonisé",
    frequency: "M" as const,
    dataset: "une_rt_m",
    params: "sex=T&age=Y15-74&unit=PC_ACT&s_adj=SA",
    definition: "Taux de chômage harmonisé 15–74 ans, désaisonnalisé.",
  },
  {
    key: "growth",
    label: "Croissance réelle du PIB · glissement annuel",
    frequency: "Q" as const,
    dataset: "namq_10_gdp",
    params: "na_item=B1GQ&unit=CLV_PCH_SM&s_adj=SCA",
    definition:
      "PIB réel, variation par rapport au même trimestre de l’année précédente, corrigée des variations saisonnières et calendaires.",
  },
];
export async function getRecent(): Promise<Feed<ReleaseData>> {
  const data: ReleaseData = { series: [], errors: [] };
  const tasks: (() => Promise<void>)[] = [];
  for (const country of countries.filter((c) => c.code !== "EMU"))
    tasks.push(async () => {
      const definitions = fredDefinitions.filter(
        (d) => d.country === country.code,
      );
      let csv: string | undefined;
      try {
        csv = await request(
          fredUrl(definitions.map((d) => d.id)),
          "csv",
          cadence.recent.ttl,
        );
      } catch {}
      await Promise.all(
        definitions.map(async (d) => {
          try {
            let row: Release;
            try {
              if (!csv) throw new Error();
              row = toRelease(csv, d);
            } catch {
              row = toRelease(
                await request(fredUrl([d.id]), "csv", cadence.recent.ttl),
                d,
              );
            }
            data.series.push(row);
          } catch (error) {
            data.errors.push({
              country: d.country,
              key: d.key,
              message:
                error instanceof Error ? error.message : "Source indisponible",
            });
          }
        }),
      );
    });
  for (const d of europeanDefinitions)
    tasks.push(async () => {
      let errorMessage = "Source indisponible";
      for (const geo of ["EA21", "EA20"])
        try {
          const url = `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/${d.dataset}?geo=${geo}&freq=${d.frequency}&${d.params}&sinceTimePeriod=${new Date().getUTCFullYear() - 6}${d.frequency === "Q" ? "-Q1" : "-01"}&lang=en`;
          const body = await request(url, "json", cadence.recent.ttl);
          data.series.push(
            parseEurostat(body, {
              ...d,
              url: `https://ec.europa.eu/eurostat/databrowser/view/${d.dataset}/default/table`,
            }),
          );
          return;
        } catch (error) {
          errorMessage =
            error instanceof Error ? error.message : "Source indisponible";
        }
      data.errors.push({ country: "EMU", key: d.key, message: errorMessage });
    });
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 7 }, async () => {
      while (cursor < tasks.length) await tasks[cursor++]();
    }),
  );
  return {
    status: data.series.length ? "ok" : "error",
    data,
    fetchedAt: new Date().toISOString(),
    ...(data.errors.length
      ? { error: `${data.errors.length} séries conjoncturelles non reçues` }
      : {}),
  };
}
