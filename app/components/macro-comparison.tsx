"use client";
import { useMemo, useState } from "react";
import { countries, indicators, type Macro } from "@/lib/data";
import InteractiveChart, { formatValue } from "./interactive-chart";
export const palette = [
  "#edb477",
  "#7eb6eb",
  "#77c6a8",
  "#b09ae3",
  "#e894a3",
  "#d3ce83",
  "#71c7d3",
  "#cb986e",
  "#a5c77e",
  "#c495d4",
  "#c1c8d0",
  "#e8a36a",
];
export default function MacroComparison({
  macro,
  initialIndicator = "growth",
  initialCountries = ["USA", "EMU", "GBR", "JPN"],
  title = "Comparateur macroéconomique",
  compact = false,
}: {
  macro: Macro;
  initialIndicator?: string;
  initialCountries?: string[];
  title?: string;
  compact?: boolean;
}) {
  const [indicator, setIndicator] = useState(initialIndicator);
  const [chosen, setChosen] = useState(initialCountries);
  const [period, setPeriod] = useState(10);
  const [indexed, setIndexed] = useState(false);
  const definition = indicators.find((i) => i.key === indicator)!;
  const series = useMemo(
    () =>
      chosen.map((code) => {
        const c = countries.find((c) => c.code === code)!;
        const o = macro[code]?.[indicator];
        const points = (o?.history ?? (o ? [o] : [])).filter(
          (p) => +p.year >= new Date().getFullYear() - period,
        );
        const first = points[0]?.value;
        return {
          id: code,
          label: c.currency,
          color: palette[countries.indexOf(c)],
          points: points.map((p) => ({
            date: p.year,
            value: indexed && first ? (p.value / first) * 100 : p.value,
          })),
        };
      }),
    [chosen, macro, indicator, period, indexed],
  );
  return (
    <section
      className={`panel macro-comparison ${compact ? "compact-comparison" : ""}`}
    >
      <div className="panel-title">
        <div>
          <h2>{title}</h2>
          <span className="tiny-tag">MACRO</span>
        </div>
        <span className="muted">{definition.unit || "Nombre"}</span>
      </div>
      <div className="comparison-controls">
        <select
          aria-label={`Indicateur — ${title}`}
          value={indicator}
          onChange={(e) => {
            setIndicator(e.target.value);
            setIndexed(false);
          }}
        >
          {indicators.map((i) => (
            <option key={i.key} value={i.key}>
              {i.label}
            </option>
          ))}
        </select>
        <div className="segmented">
          {[5, 10, 20].map((p) => (
            <button
              className={period === p ? "active" : ""}
              key={p}
              onClick={() => setPeriod(p)}
            >
              {p}A
            </button>
          ))}
        </div>
        <button
          disabled={
            !["gdp", "gdpPerCapita", "population", "reserves"].includes(
              indicator,
            )
          }
          title="Indexation disponible pour les séries en niveau"
          className={`index-button ${indexed ? "active" : ""}`}
          onClick={() => setIndexed((v) => !v)}
        >
          Base 100
        </button>
      </div>
      <div className="country-chips">
        {countries.map((c) => (
          <button
            aria-pressed={chosen.includes(c.code)}
            className={chosen.includes(c.code) ? "chosen" : ""}
            style={{
              borderColor: chosen.includes(c.code)
                ? palette[countries.indexOf(c)]
                : undefined,
            }}
            key={c.code}
            onClick={() =>
              setChosen((old) =>
                old.includes(c.code)
                  ? old.filter((k) => k !== c.code)
                  : [...old, c.code],
              )
            }
          >
            {c.flag} {c.currency}
          </button>
        ))}
      </div>
      <InteractiveChart
        series={series}
        unit={indexed ? "" : definition.unit}
        label={definition.label}
        height={compact ? 230 : 310}
      />
      <div className="comparison-values">
        {series.map((s) => {
          const latest = s.points.at(-1);
          return (
            <div key={s.id}>
              <span style={{ color: s.color }}>● {s.label}</span>
              <strong>
                {latest
                  ? formatValue(
                      latest.value,
                      indexed ? "" : definition.unit,
                      true,
                    )
                  : "—"}
              </strong>
              <small>{latest?.date ?? "Non publié"}</small>
            </div>
          );
        })}
      </div>
      <div className="panel-footnote">
        {definition.detail}
        {indexed
          ? " · Base 100 à la première observation non nulle de chaque série"
          : ""}
      </div>
    </section>
  );
}
