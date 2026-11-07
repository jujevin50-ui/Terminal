import {
  indicators,
  countries,
  type Observation,
  type IndicatorDiagnostic,
} from "../lib/data";
import { writeFile } from "node:fs/promises";
async function json(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
type Result = {
  code: string;
  label: string;
  unit: string;
  catalog: "verified" | "unverified";
  name?: string;
  definition?: string;
  error?: string;
  diagnostic?: IndicatorDiagnostic;
  countries: Record<
    string,
    {
      status: string;
      site: Observation | null;
      reference: { value: number; year: string } | null;
    }
  >;
};
async function main() {
  const site =
    process.argv.find((a) => a.startsWith("--site="))?.slice(7) ??
    "http://localhost:3000";
  const payload = await json(
    `${site.replace(/\/$/, "")}/api/terminal?section=macro`,
  );
  const report: Result[] = [];
  let cursor = 0;
  await Promise.all(
    Array.from({ length: 6 }, async () => {
      while (cursor < indicators.length) {
        const i = indicators[cursor++];
        const row: Result = {
          code: i.id,
          label: i.label,
          unit: i.unit,
          catalog: "unverified",
          countries: {},
          diagnostic: payload.diagnostics?.find(
            (d: IndicatorDiagnostic) => d.key === i.key,
          ),
        };
        try {
          const [catalog, official] = await Promise.all([
            json(`https://api.worldbank.org/v2/indicator/${i.id}?format=json`),
            json(
              `https://api.worldbank.org/v2/country/${countries.map((c) => c.code).join(";")}/indicator/${i.id}?source=2&format=json&per_page=1000&date=${new Date().getFullYear() - 20}:${new Date().getFullYear()}`,
            ),
          ]);
          const item = catalog?.[1]?.find(
            (r: { id: string; source?: { id: string } }) =>
              r.id === i.id && String(r.source?.id) === "2",
          );
          if (!item) throw new Error("Code absent du catalogue WDI");
          if (!Array.isArray(official?.[1]) && official?.[1] !== null)
            throw new Error("Données officielles invalides");
          if (official?.[0]?.pages > 1)
            throw new Error("Réponse officielle incomplète");
          row.catalog = "verified";
          row.name = item.name;
          row.definition = item.sourceNote;
          for (const c of countries) {
            const candidates = (official[1] ?? [])
              .filter(
                (r: {
                  countryiso3code: string;
                  value: unknown;
                  indicator?: { id: string };
                }) =>
                  r.countryiso3code === c.code &&
                  r.indicator?.id === i.id &&
                  typeof r.value === "number" &&
                  Number.isFinite(r.value),
              )
              .sort(
                (a: { date: string }, b: { date: string }) => +b.date - +a.date,
              );
            const ref = candidates[0];
            const reference = ref
              ? { year: String(ref.date), value: ref.value }
              : null;
            const site = payload.data?.[c.code]?.[i.key] ?? null;
            const equal =
              site &&
              reference &&
              site.year === reference.year &&
              Math.abs(site.value - reference.value) <=
                Math.max(1e-8, Math.abs(reference.value) * 1e-10);
            row.countries[c.currency] = {
              status: !reference
                ? site
                  ? "unexpected-site-data"
                  : "not-published"
                : !site
                  ? "missing-on-site"
                  : equal
                    ? "match"
                    : "mismatch",
              site,
              reference,
            };
          }
        } catch (error) {
          row.error = error instanceof Error ? error.message : String(error);
        }
        report.push(row);
      }
    }),
  );
  report.sort(
    (a, b) =>
      indicators.findIndex((i) => i.id === a.code) -
      indicators.findIndex((i) => i.id === b.code),
  );
  await writeFile(
    "/tmp/macro-data-audit.json",
    JSON.stringify(
      { checkedAt: new Date().toISOString(), site, report },
      null,
      2,
    ),
  );
  console.table(
    report.map((r) => ({
      indicator: r.label,
      code: r.code,
      catalog: r.catalog,
      matching: Object.values(r.countries).filter((c) => c.status === "match")
        .length,
      notPublished: Object.values(r.countries).filter(
        (c) => c.status === "not-published",
      ).length,
      errors:
        r.error ??
        Object.values(r.countries).filter(
          (c) => !["match", "not-published"].includes(c.status),
        ).length,
    })),
  );
  if (
    report.some(
      (r) =>
        r.catalog !== "verified" ||
        r.error ||
        !r.diagnostic ||
        r.diagnostic.status === "error" ||
        Object.values(r.countries).some(
          (c) => !["match", "not-published"].includes(c.status),
        ),
    ) ||
    payload.status !== "ok"
  )
    process.exitCode = 1;
  console.log("Rapport : /tmp/macro-data-audit.json");
}
main().catch((error) => {
  console.error(
    "Audit non terminé :",
    error instanceof Error ? error.message : String(error),
  );
  process.exitCode = 1;
});
