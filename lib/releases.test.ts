import { test } from "node:test";
import assert from "node:assert/strict";
import {
  csvRows,
  parseBis,
  toRelease,
  fredPoints,
  aggregateRelease,
  type Release,
} from "./releases";
import { parseEurostat, getPolicyRates, getRecent } from "./current-feeds";
import { periodLabel, delayed, cadence } from "./cadence";
test("Le CSV respecte les guillemets, les virgules et la valeur zéro", () => {
  assert.deepEqual(
    csvRows('\uFEFFDATE,VALUE,NAME\r\n2026-01-01,0,"Nom, complet"\r\n'),
    [{ DATE: "2026-01-01", VALUE: "0", NAME: "Nom, complet" }],
  );
  assert.throws(() => csvRows('a,b\n"incomplete'));
});
test("Les taux directeurs BRI conservent les valeurs négatives, dates et changements", () => {
  const text =
    "FREQ,REF_AREA,TIME_PERIOD,OBS_VALUE,UNIT_MULT\nD,CH,2025-01-01,-0.25,0\nD,CH,2025-01-02,0,0\nD,CH,2025-01-03,0,0\nD,CH,2099-01-01,99,0\n";
  const result = parseBis(text, "2026-01-01");
  assert.equal(result[0].country, "CHE");
  assert.equal(result[0].value, 0);
  assert.equal(result[0].lastChange, "2025-01-02");
  assert.equal(result[0].history.length, 3);
  assert.throws(() => parseBis("FREQ,WRONG\nD,1"));
});
test("Les croissances utilisent la même période de l’année précédente, pas le point précédent", () => {
  const d = {
    country: "USA",
    key: "growth",
    label: "GDP",
    id: "GDPTEST",
    frequency: "Q" as const,
    unit: "%",
    transform: "yoy" as const,
    definition: "test",
  };
  const r = toRelease(
    "observation_date,GDPTEST\n2024-01-01,100\n2024-04-01,101\n2025-01-01,105\n2025-04-01,106.05\n",
    d,
  );
  assert.equal(r.history.length, 2);
  assert.ok(Math.abs(r.value - 5) < 1e-9);
  assert.equal(r.date, "2025-04-01");
});
test("Un mois manquant ne produit pas une variation mensuelle trompeuse", () => {
  const d = {
    country: "USA",
    key: "payrolls",
    label: "Employment",
    id: "PAYEMS",
    frequency: "M" as const,
    unit: "milliers",
    transform: "difference" as const,
    definition: "test",
  };
  const r = toRelease(
    "observation_date,PAYEMS\n2025-01-01,100\n2025-02-01,104\n2025-04-01,120\n",
    d,
  );
  assert.equal(r.history.length, 1);
  assert.equal(r.value, 4);
  assert.equal(r.date, "2025-02-01");
  assert.throws(() =>
    fredPoints("observation_date,OTHER\n2025-01-01,1\n", "PAYEMS"),
  );
});
const monthly: Release = {
  country: "USA",
  key: "inflation",
  label: "CPI",
  frequency: "M",
  unit: "%",
  value: 6,
  date: "2025-06-01",
  source: "test",
  url: "",
  definition: "test",
  history: Array.from({ length: 8 }, (_, i) => ({
    date: `2025-${String(i + 1).padStart(2, "0")}-01`,
    value: i + 1,
  })),
};
test("Trimestres et semestres calculés utilisent exclusivement des périodes complètes", () => {
  const q = aggregateRelease(monthly, "Q")!;
  assert.deepEqual(q.history, [
    { date: "2025-01-01", value: 2 },
    { date: "2025-04-01", value: 5 },
  ]);
  const s = aggregateRelease(monthly, "S")!;
  assert.deepEqual(s.history, [{ date: "2025-01-01", value: 3.5 }]);
  assert.equal(aggregateRelease({ ...monthly, frequency: "Q" }, "M"), null);
  assert.equal(periodLabel("2025-04-01", "Q"), "T2 2025");
  assert.equal(periodLabel("2025-07-01", "S"), "S2 2025");
});
test("Eurostat : une sélection ambiguë est rejetée, les valeurs zéro et les trimestres sont préservés", () => {
  const d = {
    key: "growth",
    label: "GDP",
    frequency: "Q" as const,
    definition: "test",
    url: "",
  };
  const body = {
    id: ["geo", "time"],
    size: [1, 2],
    dimension: {
      geo: {
        category: { index: { EA20: 0 }, label: { EA20: "Euro area 20" } },
      },
      time: { category: { index: { "2024-Q1": 0, "2024-Q2": 1 } } },
    },
    value: { 0: 1.2, 1: 0 },
  };
  const row = parseEurostat(body, d);
  assert.equal(row.value, 0);
  assert.equal(row.date, "2024-04-01");
  assert.match(row.definition, /Euro area 20/);
  assert.throws(() => parseEurostat({ ...body, size: [2, 2] }, d));
});
test("Un contrôle récent ne rend pas actuelle une observation ancienne", () => {
  assert.equal(delayed("2022-01-01", "M", new Date("2026-11-08")), true);
  assert.equal(delayed("2026-11-06", "D", new Date("2026-11-08")), false);
  assert.equal(cadence.rates.poll, 60000);
  assert.equal(cadence.macro.poll, 3600000);
});
test("La fourchette Fed a priorité sur la référence BRI, même si la BRI arrive plus tard", async () => {
  const old = global.fetch;
  try {
    global.fetch = async (input) => {
      if (String(input).includes("bis.org")) {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return new Response(
          "FREQ,REF_AREA,TIME_PERIOD,OBS_VALUE\nD,US,2025-01-01,4.5\nD,GB,2025-01-01,4\n",
        );
      }
      return new Response(
        "observation_date,DFEDTARU,DFEDTARL\n2025-01-01,4.25,4\n2025-02-01,4,3.75\n",
      );
    };
    const feed = await getPolicyRates();
    assert.equal(feed.data.USA.value, 4);
    assert.equal(feed.data.USA.lower, 3.75);
    assert.equal(feed.data.GBR.value, 4);
    assert.equal(feed.data.USA.lastChange, "2025-02-01");
  } finally {
    global.fetch = old;
  }
});
test("Une panne des sources récentes ne produit aucune fausse donnée annuelle ou taux directeur", async () => {
  const old = global.fetch;
  try {
    global.fetch = async () => new Response("offline", { status: 503 });
    const [rates, recent] = await Promise.all([getPolicyRates(), getRecent()]);
    assert.equal(rates.status, "error");
    assert.deepEqual(rates.data, {});
    assert.equal(recent.status, "error");
    assert.deepEqual(recent.data.series, []);
    assert.ok(recent.data.errors.length > 20);
  } finally {
    global.fetch = old;
  }
});
test("Une fenêtre 12M contient exactement douze mois, quatre trimestres ou deux semestres", async () => {
  const { recentCutoff } = await import("./cadence");
  assert.equal(recentCutoff("2026-10-01", "M", 1), "2025-11-01");
  assert.equal(recentCutoff("2026-07-01", "Q", 1), "2025-10-01");
  assert.equal(recentCutoff("2026-01-01", "S", 1), "2025-07-01");
});
