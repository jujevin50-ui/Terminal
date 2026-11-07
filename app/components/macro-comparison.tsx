"use client";
import { useMemo, useState, useEffect } from "react";
import { countries, indicators, type Macro } from "@/lib/data";
import { comparisonPoints } from "@/lib/comparison";
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
  selectedIndicator,
  onIndicatorChange,
}: {
  macro: Macro;
  initialIndicator?: string;
  initialCountries?: string[];
  title?: string;
  compact?: boolean;
  selectedIndicator?: string;
  onIndicatorChange?: (indicator: string) => void;
}) {
  const [internalIndicator, setIndicator] = useState(initialIndicator);
  const indicator = selectedIndicator ?? internalIndicator;
  const [chosen, setChosen] = useState(initialCountries);
  const [period, setPeriod] = useState(10);
  const [indexed, setIndexed] = useState(false);
  useEffect(() => setIndexed(false), [indicator]);
  const definition = indicators.find((i) => i.key === indicator)!;
  const comparison = useMemo(
    () => comparisonPoints(macro, chosen, indicator, period, indexed),
    [macro, chosen, indicator, period, indexed],
  );
  const series = comparison.series.map((s) => {
    const c = countries.find((c) => c.code === s.code)!;
    return {
      id: s.code,
      label: c.currency,
      color: palette[countries.indexOf(c)],
      points: s.points.map((p) => ({ date: p.year, value: p.value })),
    };
  });
  return (
    <section
      className={`panel macro-comparison ${compact ? "compact-comparison" : ""}`}
    >
      <div className="panel-title">
        <div>
          <h2>{definition.label} · comparaison</h2>
          <span className="tiny-tag">MACRO</span>
        </div>
        <span className="muted">
          {indexed ? "Indice" : definition.unit || "Nombre"}
        </span>
      </div>
      <div className="comparison-controls">
        <select
          aria-label={`Indicateur — ${title}`}
          value={indicator}
          onChange={(e) => {
            setIndicator(e.target.value);
            onIndicatorChange?.(e.target.value);
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
              aria-pressed={period === p}
              title={`${p} dernières années disponibles`}
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
          aria-pressed={indexed}
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
        unit={indexed ? "indice" : definition.unit}
        label={`${definition.label}${indexed ? " · base 100" : ""}`}
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
          ? comparison.baseYear
            ? ` · Base 100 commune en ${comparison.baseYear}`
            : " · Aucune année commune avec une base positive"
          : ""}
      </div>
    </section>
  );
}
