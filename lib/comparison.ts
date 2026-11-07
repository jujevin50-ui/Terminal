import { type Macro } from "./data";
/** All countries use the same window and, when indexed, the same positive base year. */
export function comparisonPoints(
  macro: Macro,
  codes: string[],
  indicator: string,
  period: number,
  indexed: boolean,
) {
  const raw = codes.map((code) => ({
    code,
    points: (
      macro[code]?.[indicator]?.history ??
      (macro[code]?.[indicator] ? [macro[code][indicator]] : [])
    )
      .filter((p) => Number.isFinite(p.value))
      .slice()
      .sort((a, b) => +a.year - +b.year),
  }));
  const latest = Math.max(...raw.flatMap((s) => s.points.map((p) => +p.year)));
  const filtered = raw.map((s) => ({
    ...s,
    points: s.points.filter((p) => +p.year >= latest - period + 1),
  }));
  const available = filtered.filter((s) => s.points.length);
  const baseYear = indexed
    ? available[0]?.points.find((p) =>
        available.every((s) =>
          s.points.some((q) => q.year === p.year && q.value > 0),
        ),
      )?.year
    : undefined;
  return {
    baseYear,
    series: filtered.map((s) => {
      const base = s.points.find((p) => p.year === baseYear)?.value;
      return {
        ...s,
        points: indexed
          ? base
            ? s.points
                .filter((p) => +p.year >= Number(baseYear))
                .map((p) => ({ ...p, value: (p.value / base) * 100 }))
            : []
          : s.points,
      };
    }),
  };
}
