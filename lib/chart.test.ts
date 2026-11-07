import { test } from "node:test";
import assert from "node:assert/strict";
import {
  datePositions,
  nearestPoint,
  visibleWindow,
  axisPrecision,
} from "./chart";
import { comparisonPoints } from "./comparison";
import { retainLastGood, retainMacroSeries } from "./feed-state";
import type { Macro, Feed } from "./data";
test("Chaque abscisse sélectionne son observation, y compris le dernier point", () => {
  for (const width of [220, 350, 800, 1400]) {
    const dates = Array.from({ length: 21 }, (_, i) => String(2005 + i));
    const xs = datePositions(dates, 18, width - 76);
    xs.forEach((x, i) => assert.equal(nearestPoint(xs, x), i));
    assert.equal(nearestPoint(xs, xs.at(-1)! - 1), 20);
    assert.equal(nearestPoint(xs, -20), 0);
    assert.equal(nearestPoint(xs, width), 20);
  }
});
test("L’axe temporel préserve les années et jours manquants", () => {
  const xs = datePositions(["2020", "2021", "2024"], 0, 400);
  assert.ok(xs[1] < 102 && xs[1] > 99);
  assert.equal(nearestPoint(xs, 290), 2);
  assert.deepEqual(datePositions(["2024"], 10, 110), [60]);
  assert.equal(nearestPoint([], 40), null);
});
test("La fenêtre reste valide après une réduction de période", () => {
  assert.deepEqual(visibleWindow(5, 20, 12), { start: 0, size: 5, end: 5 });
  assert.deepEqual(visibleWindow(20, 8, 18), { start: 12, size: 8, end: 20 });
  assert.deepEqual(visibleWindow(0, 0, 0), { start: 0, size: 0, end: 0 });
  assert.ok(axisPrecision(0.91234, 0.91255) >= 4);
});
const macro: Macro = {
  USA: {
    gdp: {
      value: 200,
      year: "2024",
      history: [
        { value: 50, year: "2019" },
        { value: 100, year: "2022" },
        { value: 200, year: "2024" },
      ],
    },
  },
  EMU: {
    gdp: {
      value: 80,
      year: "2024",
      history: [
        { value: 20, year: "2021" },
        { value: 40, year: "2022" },
        { value: 80, year: "2024" },
      ],
    },
  },
};
test("L’indexation utilise la même année de référence et une fenêtre liée aux observations", () => {
  const result = comparisonPoints(macro, ["USA", "EMU"], "gdp", 5, true);
  assert.equal(result.baseYear, "2022");
  assert.deepEqual(
    result.series.map((s) => s.points),
    [
      [
        { value: 100, year: "2022" },
        { value: 200, year: "2024" },
      ],
      [
        { value: 100, year: "2022" },
        { value: 200, year: "2024" },
      ],
    ],
  );
});
test("Une base nulle ne crée ni Infinity ni faux indice", () => {
  const result = comparisonPoints(
    {
      USA: {
        gdp: { value: 0, year: "2024", history: [{ value: 0, year: "2024" }] },
      },
    },
    ["USA"],
    "gdp",
    5,
    true,
  );
  assert.equal(result.baseYear, undefined);
  assert.deepEqual(result.series[0].points, []);
});
test("Les échecs d’actualisation conservent les valeurs et leur date de récupération", () => {
  const old: Feed<number[]> = {
    status: "ok",
    data: [1],
    fetchedAt: "2024-01-01",
  };
  assert.deepEqual(
    retainLastGood(old, { status: "error", data: [], fetchedAt: "2024-01-02" }),
    { ...old, stale: true, error: "Actualisation indisponible" },
  );
});
test("Une erreur isolée conserve seulement la série concernée, une réponse vide valide la retire", () => {
  const previous: Feed<Macro> = { status: "ok", data: macro, fetchedAt: "old" };
  const current: Feed<Macro> = {
    status: "ok",
    data: { USA: { inflation: { value: 2, year: "2024" } } },
    fetchedAt: "new",
    diagnostics: [
      {
        key: "gdp",
        code: "NY.GDP.MKTP.CD",
        status: "error",
        countries: [],
        observations: 0,
      },
    ],
  };
  assert.equal(retainMacroSeries(previous, current).data.USA.gdp.value, 200);
  assert.equal(retainMacroSeries(previous, current).stale, true);
  current.diagnostics![0].status = "empty";
  assert.equal(retainMacroSeries(previous, current).data.USA.gdp, undefined);
});
