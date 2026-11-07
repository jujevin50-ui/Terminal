import { XMLParser } from "fast-xml-parser";
import {
  countries,
  indicators,
  parseCalendar,
  parseMacro,
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
    if (!latest.rates || !latest.date || !historical.rates)
      throw new Error("FX invalide");
    return {
      date: latest.date,
      base: "USD",
      rates: { ...latest.rates, USD: 1 },
      history: Object.entries(
        historical.rates as Record<string, Record<string, number>>,
      )
        .map(([date, rates]) => ({ date, rates: { ...rates, USD: 1 } }))
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
export async function getMacro() {
  return feed(async () => {
    const codes = countries.map((c) => c.code).join(";");
    const groups = Array.from(
      { length: Math.ceil(indicators.length / 6) },
      (_, i) => indicators.slice(i * 6, i * 6 + 6),
    );
    const results = await Promise.allSettled(
      groups.map(async (group) => {
        const ids = group.map((i) => i.id).join(";");
        const body = await (
          await remote(
            `https://api.worldbank.org/v2/country/${codes}/indicator/${ids}?source=2&format=json&per_page=20000&date=${new Date().getFullYear() - 20}:${new Date().getFullYear()}`,
            86400,
          )
        ).json();
        if (body?.[0]?.pages > 1) throw new Error("Réponse tronquée");
        return parseMacro(body);
      }),
    );
    const merged: import("./data").Macro = {};
    for (const result of results)
      if (result.status === "fulfilled")
        for (const [country, observations] of Object.entries(result.value))
          merged[country] = { ...merged[country], ...observations };
    if (!Object.keys(merged).length) throw new Error("Macro indisponible");
    return merged;
  }, {});
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
