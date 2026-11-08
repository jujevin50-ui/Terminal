"use client";
import { useMemo, useState, useEffect } from "react";
import { countries, indicators, type Macro, type Feed } from "@/lib/data";
import { comparisonPoints } from "@/lib/comparison";
import { aggregateRelease, type ReleaseData } from "@/lib/releases";
import {
  frequencyLabels,
  periodLabel,
  delayed,
  recentCutoff,
  type Frequency,
} from "@/lib/cadence";
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
export const nativeFrequency = (key: string): Frequency =>
  key === "growth"
    ? "Q"
    : ["inflation", "unemployment"].includes(key)
      ? "M"
      : "A";
export default function MacroComparison({
  macro,
  recent,
  initialIndicator = "growth",
  initialCountries = ["USA", "EMU", "GBR", "JPN"],
  title = "Comparateur macroéconomique",
  compact = false,
  selectedIndicator,
  onIndicatorChange,
  onFrequencyChange,
}: {
  macro: Macro;
  recent?: Feed<ReleaseData>;
  initialIndicator?: string;
  initialCountries?: string[];
  title?: string;
  compact?: boolean;
  selectedIndicator?: string;
  onIndicatorChange?: (indicator: string) => void;
  onFrequencyChange?: (frequency: Frequency) => void;
}) {
  const [internal, setIndicator] = useState(initialIndicator);
  const indicator = selectedIndicator ?? internal;
  const [chosen, setChosen] = useState(initialCountries);
  const [period, setPeriod] = useState(
    nativeFrequency(indicator) === "A" ? 10 : 1,
  );
  const [frequency, setFrequency] = useState<Frequency>(
    nativeFrequency(indicator),
  );
  const [indexed, setIndexed] = useState(false);
  useEffect(() => {
    const next = nativeFrequency(indicator);
    setFrequency(next);
    onFrequencyChange?.(next);
    setPeriod(next === "A" ? 10 : 1);
    setIndexed(false);
  }, [indicator, onFrequencyChange]);
  const definition = indicators.find((i) => i.key === indicator)!;
  const comparison = useMemo(
    () => comparisonPoints(macro, chosen, indicator, period, indexed),
    [macro, chosen, indicator, period, indexed],
  );
  const nativeRows = chosen.map((code) => {
    const raw = recent?.data.series.find(
      (s) => s.country === code && s.key === indicator,
    );
    return raw ? aggregateRelease(raw, frequency) : null;
  });
  const newest =
    nativeRows
      .filter(Boolean)
      .map((row) => row!.date)
      .sort()
      .at(-1) ?? new Date().toISOString().slice(0, 10);
  const cutoff = recentCutoff(newest, frequency, period);
  const series = chosen.map((code) => {
    const c = countries.find((c) => c.code === code)!;
    if (frequency === "A") {
      const s = comparison.series.find((s) => s.code === code)!;
      return {
        id: code,
        label: c.currency,
        color: palette[countries.indexOf(c)],
        points: s.points.map((p) => ({ date: p.year, value: p.value })),
        source: "Banque mondiale · annuel",
        late: s.points.at(-1) ? delayed(s.points.at(-1)!.year, "A") : false,
      };
    }
    const raw = recent?.data.series.find(
      (s) => s.country === code && s.key === indicator,
    );
    const aggregated = raw ? aggregateRelease(raw, frequency) : null;

    const points = aggregated?.history.filter((p) => p.date >= cutoff) ?? [];
    return {
      id: code,
      label: c.currency,
      color: palette[countries.indexOf(c)],
      points,
      source:
        aggregated?.source ??
        (raw ? "Fréquence indisponible" : "Source non reçue"),
      late: aggregated ? delayed(aggregated.date, frequency) : false,
    };
  });
  const eligible = nativeFrequency(indicator) !== "A";
  return (
    <section
      data-frequency={frequency}
      className={`panel macro-comparison ${compact ? "compact-comparison" : ""}`}
    >
      <div className="panel-title">
        <div>
          <h2>{definition.label} · comparaison</h2>
          <span className="tiny-tag">{frequencyLabels[frequency]}</span>
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
        <select
          aria-label={`Fréquence — ${title}`}
          value={frequency}
          onChange={(e) => {
            const next = e.target.value as Frequency;
            setFrequency(next);
            onFrequencyChange?.(next);
            setPeriod(next === "A" ? 10 : 1);
            setIndexed(false);
          }}
        >
          {(["M", "Q", "S", "A"] as Frequency[]).map((f) => (
            <option
              key={f}
              value={f}
              disabled={
                (!eligible && f !== "A") ||
                (indicator === "growth" && f === "M")
              }
            >
              {frequencyLabels[f]}
            </option>
          ))}
        </select>
        <div className="segmented">
          {(frequency === "A" ? [5, 10, 20] : [1, 3, 5]).map((p) => (
            <button
              aria-pressed={period === p}
              key={p}
              className={period === p ? "active" : ""}
              onClick={() => setPeriod(p)}
            >
              {p === 1 ? "12M" : `${p}A`}
            </button>
          ))}
        </div>
        {frequency === "A" && (
          <button
            disabled={
              !["gdp", "gdpPerCapita", "population", "reserves"].includes(
                indicator,
              )
            }
            aria-pressed={indexed}
            className={`index-button ${indexed ? "active" : ""}`}
            onClick={() => setIndexed((v) => !v)}
          >
            Base 100
          </button>
        )}
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
        periodFormat={frequency}
        unit={indexed ? "indice" : definition.unit}
        label={`${definition.label} · ${frequencyLabels[frequency].toLowerCase()}${indexed ? " · base 100" : ""}`}
        height={compact ? 230 : 310}
      />
      <div className="comparison-values">
        {series.map((s) => {
          const latest = s.points.at(-1);
          return (
            <div key={s.id} title={s.source}>
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
              <small>
                {latest
                  ? periodLabel(latest.date, frequency)
                  : "Non disponible à cette fréquence"}
              </small>
              {s.late && (
                <small className="late-observation">Observation ancienne</small>
              )}
            </div>
          );
        })}
      </div>
      <div className="panel-footnote">
        {frequency === "A"
          ? definition.detail
          : indicator === "growth"
            ? "Croissance réelle en glissement annuel, observée chaque trimestre."
            : indicator === "inflation"
              ? "Inflation en glissement annuel ; IPC national ou IPCH Eurostat selon économie."
              : "Chômage harmonisé ou national selon source ; pas l’estimation annuelle OIT."}
        {frequency === "Q" && indicator !== "growth"
          ? " · Les séries mensuelles sont agrégées en moyenne sur trois mois complets."
          : ""}
        {frequency === "S"
          ? " · Semestres calculés : moyenne des glissements annuels ou des taux sur des périodes complètes ; pas une publication semestrielle officielle."
          : ""}
        {indexed
          ? comparison.baseYear
            ? ` · Base 100 commune en ${comparison.baseYear}`
            : " · Aucune année commune positive"
          : ""}
        {frequency !== "A" && recent?.stale
          ? " · Dernières données conservées en cache."
          : ""}
      </div>
    </section>
  );
}
