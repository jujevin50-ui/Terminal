"use client";
import { useState } from "react";
import Link from "next/link";
import { countries, type Feed } from "@/lib/data";
import { type PolicyRate } from "@/lib/releases";
import { delayed, periodLabel } from "@/lib/cadence";
import InteractiveChart, { formatValue } from "./interactive-chart";
export default function PolicyRates({
  feed,
  country,
  compact = false,
}: {
  feed: Feed<Record<string, PolicyRate>>;
  country?: string;
  compact?: boolean;
}) {
  const [selected, setSelected] = useState(country ?? "USA");
  const [expanded, setExpanded] = useState(!compact);
  const shown = country
    ? countries.filter((c) => c.code === country)
    : countries;
  const row = feed.data[selected];
  return (
    <section className="panel policy-panel">
      <div className="panel-title">
        <div>
          <h2>Taux directeurs des banques centrales</h2>
          <span className="tiny-tag">POLITIQUE MONÉTAIRE</span>
        </div>
        <Link className="text-button" href="/donnees">
          Sources & dates
        </Link>
      </div>
      <div className={`policy-grid ${country ? "single-policy" : ""}`}>
        {shown.map((c) => {
          const rate = feed.data[c.code];
          return (
            <button
              aria-pressed={selected === c.code}
              className={selected === c.code ? "selected" : ""}
              key={c.code}
              onClick={() => {
                setSelected(c.code);
                setExpanded(true);
              }}
            >
              <span>
                {c.flag} {c.currency}
              </span>
              <strong className="mono">
                {rate
                  ? `${rate.lower !== undefined ? formatValue(rate.lower, "") + " – " : ""}${formatValue(rate.value)}`
                  : "—"}
              </strong>
              <small>{c.bank}</small>
              <small>
                {rate
                  ? `Observation ${periodLabel(rate.date, "D")}`
                  : "Source non reçue"}
              </small>
              {rate && delayed(rate.date, "D") && (
                <em>Observation ancienne · validité actuelle à confirmer</em>
              )}
            </button>
          );
        })}
      </div>
      {expanded && row ? (
        <>
          <InteractiveChart
            series={[
              {
                id: row.country,
                label: countries.find((c) => c.code === row.country)!.currency,
                color: "#edb477",
                points: row.history,
              },
            ]}
            label="Taux directeur · historique publié"
            periodFormat="D"
            curve="step"
            unit="%"
            height={220}
          />
          <div className="rate-meta">
            <a
              href={row.url || undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              {row.source}
            </a>
            <span>
              {row.lastChange
                ? `Dernier changement observé : ${periodLabel(row.lastChange, "D")}`
                : "Aucun changement identifié dans la fenêtre disponible"}
            </span>
          </div>
          <div className="panel-footnote">{row.definition}</div>
        </>
      ) : expanded ? (
        <div className="empty">
          <strong>Taux directeur non reçu</strong>
          <span>
            Une valeur absente n’est pas remplacée par le taux d’intérêt réel
            annuel.
          </span>
        </div>
      ) : null}
      <div className="panel-footnote">
        <span>
          Contrôle automatique 1 min · cache source 5 min · délais de
          publication variables
        </span>
        <span>
          {feed.stale
            ? "Cache après erreur"
            : feed.fetchedAt
              ? `Vérifié ${new Date(feed.fetchedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" })}`
              : "Connexion…"}
        </span>
      </div>
    </section>
  );
}
