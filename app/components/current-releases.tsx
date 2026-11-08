"use client";
import { useState } from "react";
import { countries, type Feed } from "@/lib/data";
import { type ReleaseData } from "@/lib/releases";
import { periodLabel, delayed } from "@/lib/cadence";
import InteractiveChart, { formatValue } from "./interactive-chart";
export default function CurrentReleases({
  feed,
  country = "USA",
}: {
  feed: Feed<ReleaseData>;
  country?: string;
}) {
  const rows = feed.data.series.filter((s) => s.country === country);
  const [chosen, setChosen] = useState("inflation");
  const row = rows.find((s) => s.key === chosen);
  return (
    <section className="panel release-panel">
      <div className="panel-title">
        <div>
          <h2>
            Dernières publications ·{" "}
            {countries.find((c) => c.code === country)?.currency}
          </h2>
          <span className="tiny-tag">CONJONCTURE</span>
        </div>
      </div>
      <div className="release-grid">
        {rows.map((r) => (
          <button
            key={r.key}
            onClick={() => setChosen(r.key)}
            aria-pressed={chosen === r.key}
            className={chosen === r.key ? "selected" : ""}
          >
            <span>{r.label}</span>
            <strong className="mono">{formatValue(r.value, r.unit)}</strong>
            <small>
              {periodLabel(r.date, r.frequency)} · {r.source}
            </small>
            {delayed(r.date, r.frequency) && <em>Observation ancienne</em>}
          </button>
        ))}
      </div>
      {row && (
        <>
          <InteractiveChart
            series={[
              {
                id: row.key,
                label: row.label,
                color: "#7eb6eb",
                points: row.history,
              },
            ]}
            periodFormat={row.frequency}
            unit={row.unit}
            label={row.label}
            height={250}
          />
          <div className="panel-footnote">
            <a
              href={row.url || undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              {row.definition} · {row.source}
            </a>
          </div>
        </>
      )}
      {!rows.length && (
        <div className="empty">
          <strong>Aucune publication récente reçue</strong>
          <span>
            L’historique annuel est accessible séparément. Il ne remplace pas
            une observation mensuelle ou trimestrielle.
          </span>
        </div>
      )}
      <div className="panel-footnote">
        Contrôle automatique 5 min · cache source 15 min · périodes indiquées =
        périodes mesurées, pas dates de publication.
      </div>
    </section>
  );
}
