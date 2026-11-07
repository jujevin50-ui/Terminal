import { test } from "node:test";
import assert from "node:assert/strict";
import { getNews, getFx, getMacro, getCalendar } from "./feeds";
test("Une panne d’un éditeur ne supprime pas les autres actualités et les liens dangereux sont filtrés", async () => {
  const original = global.fetch;
  try {
    global.fetch = async (input) => {
      if (String(input).includes("ecb")) throw new Error("offline");
      return new Response(
        "<rss><channel><item><title>Economic release</title><link>https://example.org/release</link><pubDate>Fri, 06 Nov 2026 12:00:00 GMT</pubDate></item><item><title>Unsafe link</title><link>javascript:alert(1)</link><pubDate>Fri, 06 Nov 2026 12:00:00 GMT</pubDate></item></channel></rss>",
      );
    };
    const result = await getNews();
    assert.equal(result.status, "ok");
    assert.equal(result.data.length, 2);
    assert.ok(result.data.every((n) => n.url.startsWith("https://")));
  } finally {
    global.fetch = original;
  }
});
test("Les cours et l’historique conservent une base USD normalisée", async () => {
  const original = global.fetch;
  try {
    global.fetch = async (input) =>
      Response.json(
        String(input).includes("latest")
          ? { date: "2026-11-06", rates: { EUR: 0.92, JPY: 150 } }
          : {
              rates: {
                "2026-11-05": { EUR: 0.91, JPY: 149 },
                "2026-11-06": { EUR: 0.92, JPY: 150 },
              },
            },
      );
    const result = await getFx();
    assert.equal(result.status, "ok");
    assert.equal(result.data?.rates.USD, 1);
    assert.equal(result.data?.history[0].rates.USD, 1);
    assert.equal(result.data?.history[0].date, "2026-11-05");
  } finally {
    global.fetch = original;
  }
});
test("Une panne HTTP reste explicite dans chaque catégorie, sans données fictives", async () => {
  const original = global.fetch;
  try {
    global.fetch = async () => new Response("Unavailable", { status: 503 });
    const [fx, news, macro, calendar] = await Promise.all([
      getFx(),
      getNews(),
      getMacro(),
      getCalendar(),
    ]);
    for (const result of [fx, news, macro, calendar])
      assert.equal(result.status, "error");
    assert.equal(fx.data, null);
    assert.deepEqual(news.data, []);
    assert.deepEqual(calendar.data, []);
    assert.deepEqual(macro.data, {});
  } finally {
    global.fetch = original;
  }
});
test("La macro garde les lots réussis et leurs historiques en cas de panne partielle", async () => {
  const original = global.fetch;
  const urls: string[] = [];
  try {
    global.fetch = async (input) => {
      const url = String(input);
      urls.push(url);
      if (!url.includes("NY.GDP.MKTP.KD.ZG"))
        return new Response("offline", { status: 503 });
      return Response.json([
        { pages: 1 },
        [
          {
            countryiso3code: "USA",
            indicator: { id: "NY.GDP.MKTP.KD.ZG" },
            date: "2023",
            value: 2.1,
          },
          {
            countryiso3code: "USA",
            indicator: { id: "NY.GDP.MKTP.KD.ZG" },
            date: "2024",
            value: 0,
          },
        ],
      ]);
    };
    const result = await getMacro();
    assert.equal(urls.length, 4);
    assert.equal(result.status, "ok");
    assert.equal(result.data.USA.growth.value, 0);
    assert.deepEqual(result.data.USA.growth.history, [
      { year: "2023", value: 2.1 },
      { year: "2024", value: 0 },
    ]);
    assert.ok(urls.every((url) => url.includes("per_page=20000")));
  } finally {
    global.fetch = original;
  }
});
