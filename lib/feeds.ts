import { XMLParser } from "fast-xml-parser";
import {
  countries,
  indicators,
  parseCalendar,
  parseMacro,
  normalizeRates,
  safeUrl,
  type Feed,
  type News,
  type Fx,
  type TerminalData,
} from "./data";
const parser = new XMLParser({ ignoreAttributes: false });
async function remote(url: string, ttl: number) {
  const res = await fetch(url, {
    next: { revalidate: ttl },
    signal: AbortSignal.timeout(12000),
    headers: {
      "User-Agent": "Macro/2.0 (economic dashboard)",
      Accept:
        "application/json, application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
    },
  });
  if (!res.ok) throw new Error(`Source HTTP ${res.status}`);
  return res;
}
async function feed<T>(task: () => Promise<T>, empty: T): Promise<Feed<T>> {
  try {
    return {
      status: "ok",
      data: await task(),
      fetchedAt: new Date().toISOString(),
    };
  } catch {
    return {
      status: "error",
      data: empty,
      fetchedAt: new Date().toISOString(),
      error:
        "Source temporairement indisponible. Nouvelle tentative automatique.",
    };
  }
}
export async function getNews(): Promise<Feed<News[]>> {
  return feed(async () => {
    const sources = [
      {
        url: "https://feeds.bbci.co.uk/news/business/rss.xml",
        name: "BBC Business",
        category: "Économie",
      },
      {
        url: "https://www.ecb.europa.eu/rss/press.html",
        name: "BCE",
        category: "Banques centrales",
      },
      {
        url: "https://www.federalreserve.gov/feeds/press_all.xml",
        name: "Federal Reserve",
        category: "Banques centrales",
      },
    ];
    const results = await Promise.allSettled(
      sources.map(async (source) => {
        const xml = parser.parse(await (await remote(source.url, 120)).text());
        let items = xml.rss?.channel?.item ?? xml.feed?.entry ?? [];
        if (!Array.isArray(items)) items = [items];
        return items
          .map((item: Record<string, unknown>) => {
            const link =
              typeof item.link === "string"
                ? item.link
                : (item.link as Record<string, string>)?.["@_href"];
            const title = typeof item.title === "string" ? item.title : "";
            return {
              title,
              url: safeUrl(link),
              source: source.name,
              date: String(
                item.pubDate ?? item.published ?? item.updated ?? "",
              ),
              category: source.category,
            };
          })
          .filter(
            (item: News) =>
              item.title && item.url && Number.isFinite(Date.parse(item.date)),
          );
      }),
    );
    const news = results.flatMap((r) =>
      r.status === "fulfilled" ? r.value : [],
    );
    if (!news.length) throw new Error("Aucun flux");
    return news
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
      .slice(0, 60);
  }, []);
}
export async function getFx(): Promise<Feed<Fx | null>> {
  return feed(async () => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 100);
    const base = "https://api.frankfurter.dev/v1";
    const [latest, historical] = await Promise.all([
      remote(`${base}/latest?base=USD`, 3600).then((r) => r.json()),
      remote(
        `${base}/${start.toISOString().slice(0, 10)}..${end.toISOString().slice(0, 10)}?base=USD`,
        3600,
      ).then((r) => r.json()),
    ]);
    if (
      !latest.rates ||
      !/^\d{4}-\d{2}-\d{2}$/.test(latest.date) ||
      !historical.rates
    )
      throw new Error("FX invalide");
    const latestRates = normalizeRates(latest.rates);
    historical.rates[latest.date] = latestRates;
    return {
      date: latest.date,
      base: "USD",
      rates: latestRates,
      history: Object.entries(
        historical.rates as Record<string, Record<string, number>>,
      )
        .filter(
          ([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= latest.date,
        )
        .map(([date, rates]) => ({ date, rates: normalizeRates(rates) }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }, null);
}
export async function getCalendar() {
  return feed(
    async () =>
      parseCalendar(
        await (
          await remote(
            "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
            300,
          )
        ).json(),
      ),
    [],
  );
}
export async function getMacro(): Promise<Feed<import("./data").Macro>> {
  const codes = countries.map((c) => c.code).join(";");
  const merged: import("./data").Macro = {};
  const diagnostics: import("./data").IndicatorDiagnostic[] = [];
  // Separate requests isolate unavailable series; concurrency limits upstream load.
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (cursor < indicators.length) {
        const indicator = indicators[cursor++];
        try {
          const url = `https://api.worldbank.org/v2/country/${codes}/indicator/${indicator.id}?source=2&format=json&per_page=1000&date=${new Date().getFullYear() - 20}:${new Date().getFullYear()}`;
          const body = await (await remote(url, 86400)).json();
          if (
            !Array.isArray(body) ||
            !body[0] ||
            body[0].message ||
            !(Array.isArray(body[1]) || body[1] === null)
          )
            throw new Error("Réponse de la Banque mondiale invalide");
          if (Number(body[0].pages) > 1) throw new Error("Réponse incomplète");
          const rows = body[1] ?? [];
          if (
            rows.some(
              (r: { indicator?: { id?: string } }) =>
                r.indicator?.id !== indicator.id,
            )
          )
            throw new Error("Code de série incohérent");
          const parsed = parseMacro([body[0], rows]);
          for (const [country, observations] of Object.entries(parsed))
            merged[country] = { ...merged[country], ...observations };
          diagnostics.push({
            key: indicator.key,
            code: indicator.id,
            status: Object.keys(parsed).length ? "ok" : "empty",
            countries: Object.keys(parsed),
            observations: Object.values(parsed).reduce(
              (sum, series) =>
                sum + (series[indicator.key]?.history?.length ?? 0),
              0,
            ),
            updatedAt: body[0].lastupdated,
          });
        } catch (error) {
          diagnostics.push({
            key: indicator.key,
            code: indicator.id,
            status: "error",
            countries: [],
            observations: 0,
            error:
              error instanceof Error ? error.message : "Erreur de chargement",
          });
        }
      }
    }),
  );
  diagnostics.sort(
    (a, b) =>
      indicators.findIndex((i) => i.key === a.key) -
      indicators.findIndex((i) => i.key === b.key),
  );
  return {
    status: diagnostics.some((d) => d.status !== "error") ? "ok" : "error",
    data: merged,
    diagnostics,
    fetchedAt: new Date().toISOString(),
    ...(diagnostics.some((d) => d.status !== "error")
      ? {}
      : { error: "Aucune série reçue de la Banque mondiale" }),
  };
}
export async function getTerminalData(): Promise<TerminalData> {
  const [news, calendar, fx, macro] = await Promise.all([
    getNews(),
    getCalendar(),
    getFx(),
    getMacro(),
  ]);
  return { news, calendar, fx, macro };
}

export async function getIndicatorCatalog(): Promise<
  Feed<import("./data").CatalogRow[]>
> {
  let cursor = 0;
  const rows: import("./data").CatalogRow[] = [];
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      while (cursor < indicators.length) {
        const indicator = indicators[cursor++];
        try {
          const body = await (
            await remote(
              `https://api.worldbank.org/v2/indicator/${indicator.id}?format=json`,
              86400,
            )
          ).json();
          const item = Array.isArray(body?.[1])
            ? body[1].find(
                (r: { id: string }) =>
                  r.id === indicator.id &&
                  String(
                    (r as unknown as { source: { id: string } }).source?.id,
                  ) === "2",
              )
            : null;
          if (!item) throw new Error("Code absent du catalogue WDI");
          rows.push({
            code: indicator.id,
            verified: true,
            name: item.name,
            definition: item.sourceNote,
            unit: item.unit,
          });
        } catch (error) {
          rows.push({
            code: indicator.id,
            verified: false,
            error:
              error instanceof Error
                ? error.message
                : "Vérification impossible",
          });
        }
      }
    }),
  );
  return {
    status: rows.some((r) => r.verified) ? "ok" : "error",
    data: rows,
    fetchedAt: new Date().toISOString(),
  };
}
