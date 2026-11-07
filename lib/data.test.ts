import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCalendar, parseMacro, safeUrl } from "./data";
test("Les liens d’actualité acceptent uniquement HTTPS", () => {
  assert.equal(safeUrl("javascript:alert(1)"), "");
  assert.equal(safeUrl("http://example.com"), "");
  assert.equal(safeUrl("https://example.com/news"), "https://example.com/news");
});
test("Le calendrier préserve le fuseau et ne fabrique aucun résultat", () => {
  const e = parseCalendar([
    {
      title: "CPI",
      country: "USD",
      date: "2026-11-09T08:30:00-05:00",
      impact: "High",
      forecast: "2.5%",
    },
    { title: "Invalid", date: "invalid" },
  ]);
  assert.equal(e.length, 1);
  assert.equal(e[0].actual, "");
  assert.equal(new Date(e[0].date).toISOString(), "2026-11-09T13:30:00.000Z");
  assert.throws(() => parseCalendar({}));
});
test("La macro sélectionne la dernière observation non nulle et préserve zéro", () => {
  const row = (value: number | null, date: string) => ({
    value,
    date,
    indicator: { id: "NY.GDP.MKTP.KD.ZG" },
    countryiso3code: "USA",
  });
  const m = parseMacro([
    {},
    [row(2.5, "2022"), row(null, "2025"), row(0, "2024"), row(3, "2021")],
  ]);
  assert.equal(m.USA.growth.value, 0);
  assert.equal(m.USA.growth.year, "2024");
  assert.deepEqual(
    m.USA.growth.history?.map((p) => p.year),
    ["2021", "2022", "2024"],
  );
  assert.throws(() => parseMacro([{}, null]));
});
test("Les taux invalides, nuls et négatifs sont exclus", async () => {
  const { normalizeRates } = await import("./data");
  assert.deepEqual(
    normalizeRates({
      EUR: 0.92,
      USD: 1,
      GBP: 0,
      JPY: -1,
      CHF: "0.9",
      AUD: Infinity,
    }),
    { EUR: 0.92, USD: 1 },
  );
  assert.throws(() => normalizeRates({ USD: 0 }));
});
