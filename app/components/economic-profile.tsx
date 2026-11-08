"use client";
import Link from "next/link";
import PolicyRates from "./policy-rates";
import CurrentReleases from "./current-releases";
import { aggregateRelease } from "@/lib/releases";
import { periodLabel, type Frequency } from "@/lib/cadence";
import { useTerminalFeeds } from "../hooks/use-terminal-feeds";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, ArrowUpRight, RefreshCw, Star } from "lucide-react";
import {
  countries,
  indicators,
  type Country,
  type TerminalData,
} from "@/lib/data";
import { demoData } from "@/lib/demo";
import MacroComparison from "./macro-comparison";
import InteractiveChart, { formatValue } from "./interactive-chart";
const groups = [
  {
    id: "synthesis",
    name: "Synthèse",
    keys: [
      "growth",
      "inflation",
      "unemployment",
      "gdp",
      "gdpPerCapita",
      "balance",
    ],
  },
  {
    id: "growth",
    name: "Croissance & PIB",
    keys: [
      "gdp",
      "growth",
      "gdpPerCapita",
      "perCapitaGrowth",
      "consumption",
      "government",
      "investment",
    ],
  },
  {
    id: "prices",
    name: "Prix & emploi",
    keys: ["inflation", "unemployment", "participation", "realRate"],
  },
  {
    id: "external",
    name: "Commerce & capitaux",
    keys: ["balance", "exports", "imports", "trade", "reserves", "fdi"],
  },
  {
    id: "fiscal",
    name: "Finances publiques",
    keys: ["debt", "fiscal", "government"],
  },
  {
    id: "structure",
    name: "Structure économique",
    keys: ["population", "gdpPerCapita", "industry", "services", "investment"],
  },
  { id: "policy", name: "Taux directeurs", keys: [] },
  { id: "currency", name: "Devise", keys: [] },
];
const banks: Record<string, string> = {
  USD: "https://www.federalreserve.gov",
  EUR: "https://www.ecb.europa.eu",
  GBP: "https://www.bankofengland.co.uk",
  JPY: "https://www.boj.or.jp/en/",
  CNY: "https://www.pbc.gov.cn/en/",
  CAD: "https://www.bankofcanada.ca",
  AUD: "https://www.rba.gov.au",
  CHF: "https://www.snb.ch",
  NZD: "https://www.rbnz.govt.nz",
  INR: "https://www.rbi.org.in",
  BRL: "https://www.bcb.gov.br/en",
  ZAR: "https://www.resbank.co.za",
};
export default function EconomicProfile({ country: c }: { country: Country }) {
  const router = useRouter();
  const { data, loading, refresh } = useTerminalFeeds();
  const [tab, setTab] = useState("synthesis");
  const [chosen, setChosen] = useState("growth");
  const [historyFrequency, setHistoryFrequency] = useState<Frequency>("Q");
  const [saved, setSaved] = useState(false);
  const [demo, setDemo] = useState(false);

  const [quote, setQuote] = useState(c.currency === "USD" ? "EUR" : "USD");
  const [fxDays, setFxDays] = useState(65);
  useEffect(() => {
    setQuote(c.currency === "USD" ? "EUR" : "USD");
    setTab("synthesis");
    setChosen("growth");
  }, [c.currency]);
  useEffect(() => {
    setDemo(sessionStorage.getItem("macro-demo") === "true");
    try {
      setSaved(
        (
          JSON.parse(
            localStorage.getItem("atlas-watchlist") ?? '["USA","EMU","JPN"]',
          ) as string[]
        ).includes(c.code),
      );
    } catch {}
  }, [c.code]);
  const sample = useMemo(() => (demo ? demoData() : null), [demo]);
  const live = sample ?? data;
  const macro = live?.macro?.data ?? {};
  const observations = macro[c.code] ?? {};
  const fx = live?.fx?.data;
  const group = groups.find((g) => g.id === tab)!;
  const definition = indicators.find((i) => i.key === chosen)!;
  const nativeSeries = live.recent.data.series.find(
    (s) => s.country === c.code && s.key === chosen,
  );
  const periodSeries = nativeSeries
    ? aggregateRelease(nativeSeries, historyFrequency)
    : null;
  const history =
    historyFrequency === "A"
      ? (observations[chosen]?.history ?? []).map((p) => ({
          ...p,
          date: p.year,
        }))
      : (periodSeries?.history ?? []).map((p) => ({
          ...p,
          year: periodLabel(p.date, historyFrequency),
        }));
  const calendar =
    live?.calendar?.data.filter((e) => e.country === c.currency) ?? [];
  const fxSeries =
    fx?.history
      .filter((p) => p.rates[c.currency] && p.rates[quote])
      .slice(-fxDays)
      .map((p) => ({
        date: p.date,
        value: p.rates[quote] / p.rates[c.currency],
      })) ?? [];
  const toggle = () => {
    let old: string[] = [];
    try {
      old = JSON.parse(
        localStorage.getItem("atlas-watchlist") ?? '["USA","EMU","JPN"]',
      );
    } catch {}
    const next = saved
      ? old.filter((k) => k !== c.code)
      : [...new Set([...old, c.code])];
    localStorage.setItem("atlas-watchlist", JSON.stringify(next));
    setSaved(!saved);
  };
  function metric(key: string) {
    const d = indicators.find((i) => i.key === key)!;
    const current = live.recent.data.series.find(
      (s) => s.country === c.code && s.key === key,
    );
    const o = current
      ? {
          value: current.value,
          year: periodLabel(current.date, current.frequency),
        }
      : observations[key];
    const h = current
      ? current.history.map((p) => ({
          value: p.value,
          year: periodLabel(p.date, current.frequency),
        }))
      : (observations[key]?.history ?? []);
    const previous = h.at(-2);
    return (
      <button
        aria-pressed={chosen === key}
        className={`metric-detail ${chosen === key ? "selected" : ""}`}
        key={key}
        onClick={() => setChosen(key)}
      >
        <div>
          <span>{current?.label ?? d.label}</span>
          <ArrowUpRight size={13} />
        </div>
        <strong className="mono">
          {o ? formatValue(o.value, d.unit, true) : "—"}
        </strong>
        <small>
          {o
            ? `${current ? "" : "Annuel · "}${o.year}`
            : loading
              ? "Chargement…"
              : live?.macro?.diagnostics?.find((d) => d.key === key)?.status ===
                  "error"
                ? "Erreur source"
                : "Non publié"}
        </small>
        <p>
          {o && previous ? (
            <span className="metric-change">
              {formatValue(
                o.value - previous.value,
                d.unit === "%" ? "" : d.unit,
                true,
              )}{" "}
              {d.unit === "%" ? "pt" : ""} vs {previous.year}
            </span>
          ) : (
            "—"
          )}
        </p>
        <span className="metric-definition">
          {current?.definition ?? d.detail}
        </span>
      </button>
    );
  }
  return (
    <div className="profile-shell">
      <header className="profile-header">
        <Link className="profile-brand" href="/">
          Macro<span>.</span>
        </Link>
        <Link href="/?vue=countries" className="profile-back">
          <ArrowLeft size={14} /> Terminal
        </Link>
        <select
          aria-label="Changer d’économie"
          value={c.currency}
          onChange={(e) => router.push(`/devises/${e.target.value}`)}
        >
          {countries.map((k) => (
            <option key={k.code} value={k.currency}>
              {k.flag} {k.currency} · {k.name}
            </option>
          ))}
        </select>
      </header>
      <main className="profile-main">
        <div className="profile-hero">
          <div>
            <span className="eyebrow">
              DOSSIER MACROÉCONOMIQUE / {c.region.toUpperCase()}
            </span>
            <h1>
              {c.flag} {c.currency}
              <span>{c.name}</span>
            </h1>
            <p>{c.description}</p>
          </div>
          <div className="profile-actions">
            <button
              className={`outline-button ${saved ? "following" : ""}`}
              onClick={toggle}
            >
              <Star size={14} fill={saved ? "currentColor" : "none"} />
              {saved ? "Suivi" : "Suivre"}
            </button>
            <button
              className="outline-button"
              onClick={() => refresh()}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "spinning" : ""} />{" "}
              Actualiser
            </button>
          </div>
        </div>
        {demo && <div className="notice">Démonstration · données fictives</div>}
        {!demo && Object.values(data).some((feed) => feed.stale) && (
          <div className="notice">
            Actualisation indisponible · dernières observations conservées.
          </div>
        )}
        <Link className="data-quality-link" href="/donnees">
          Disponibilité des données et années de référence{" "}
          <ArrowUpRight size={12} />
        </Link>
        <nav className="profile-tabs">
          {groups.map((g) => (
            <button
              key={g.id}
              aria-pressed={tab === g.id}
              className={tab === g.id ? "active" : ""}
              onClick={() => {
                setTab(g.id);
                if (g.keys.length) setChosen(g.keys[0]);
              }}
            >
              {g.name}
            </button>
          ))}
        </nav>
        {tab === "synthesis" && (
          <CurrentReleases feed={live.recent} country={c.code} />
        )}
        {tab !== "currency" && tab !== "policy" ? (
          <>
            <div className="detail-metrics">{group.keys.map(metric)}</div>
            <div className="profile-chart-grid">
              <MacroComparison
                key={c.code}
                macro={macro}
                recent={live.recent}
                onFrequencyChange={setHistoryFrequency}
                selectedIndicator={chosen}
                onIndicatorChange={setChosen}
                initialCountries={[
                  c.code,
                  ...["USA", "EMU", "JPN"]
                    .filter((k) => k !== c.code)
                    .slice(0, 2),
                ]}
                title={`${definition.label} · comparaison`}
              />
              <section className="panel profile-context">
                <div className="panel-title">
                  <h2>Repères d’analyse</h2>
                </div>
                <div>
                  <span className="eyebrow">
                    {definition.label.toUpperCase()}
                  </span>
                  <h3>
                    {historyFrequency === "A"
                      ? definition.detail
                      : (periodSeries?.definition ??
                        "Source à cette fréquence non reçue.")}
                  </h3>
                  <p>
                    {historyFrequency !== "A"
                      ? "Les dates désignent les périodes mesurées, et non les dates de publication. Les observations mensuelles et trimestrielles sont issues de séries distinctes de l’historique annuel."
                      : chosen === "growth"
                        ? "La croissance réelle mesure l’évolution de la production corrigée de l’inflation. Comparez la tendance sur plusieurs années et les retournements du cycle plutôt qu’une seule observation."
                        : chosen === "inflation"
                          ? "La mesure annuelle moyenne diffère du dernier glissement annuel mensuel. Une baisse de l’inflation indique un ralentissement de la hausse des prix, pas nécessairement une baisse des prix."
                          : chosen === "debt"
                            ? "La série couvre l’administration centrale. Elle ne représente pas systématiquement la dette de l’ensemble des administrations publiques ; les couvertures nationales peuvent différer."
                            : chosen === "realRate"
                              ? "Il s’agit d’un taux débiteur réel ajusté par le déflateur du PIB, et non du taux directeur de la banque centrale. Les couvertures nationales peuvent différer."
                              : "Les observations sont annuelles. Vérifiez les années de référence avant de comparer les pays ; les séries peuvent avoir des calendriers de publication différents."}
                  </p>
                  <div className="context-bank">
                    <small>BANQUE CENTRALE</small>
                    <strong>{c.bank}</strong>
                    <a
                      href={banks[c.currency]}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Publications officielles <ArrowUpRight size={13} />
                    </a>
                  </div>
                  <a
                    className="text-button"
                    href={
                      historyFrequency === "A"
                        ? `https://data.worldbank.org/indicator/${definition.id}?locations=${c.iso}`
                        : (periodSeries?.url ?? undefined)
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Série complète et méthodologie <ArrowUpRight size={12} />
                  </a>
                </div>
              </section>
            </div>
            <section className="panel">
              <div className="panel-title">
                <h2>Historique · {definition.label}</h2>
                <span className="tiny-tag">{c.currency}</span>
              </div>
              <div className="table-scroll">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>ANNÉE</th>
                      <th>VALEUR</th>
                      <th>ÉCART À L’OBSERVATION PRÉCÉDENTE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history
                      .slice()
                      .reverse()
                      .map((p, i, rows) => {
                        const previous = rows[i + 1];
                        return (
                          <tr key={p.year}>
                            <td className="mono">{p.year}</td>
                            <td className="mono">
                              {formatValue(p.value, definition.unit)}
                            </td>
                            <td className="mono">
                              {previous
                                ? `${formatValue(p.value - previous.value, definition.unit === "%" ? "" : definition.unit)}${definition.unit === "%" ? " pt" : ""} vs ${previous.year}`
                                : "—"}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {!history.length && (
                  <div className="empty">
                    <strong>
                      {loading
                        ? "Chargement de l’historique…"
                        : "Historique indisponible"}
                    </strong>
                  </div>
                )}
              </div>
            </section>
          </>
        ) : tab === "policy" ? (
          <PolicyRates feed={live.rates} country={c.code} />
        ) : (
          <>
            <div className="detail-metrics">
              {[1, 5, 23, 65].map((days) => {
                const series =
                  fx?.history.filter(
                    (p) => p.rates[c.currency] && p.rates[quote],
                  ) ?? [];
                const last = series.at(-1);
                const old = series.at(-days - 1);
                const value =
                  last && old
                    ? (last.rates[quote] /
                        last.rates[c.currency] /
                        (old.rates[quote] / old.rates[c.currency]) -
                        1) *
                      100
                    : null;
                return (
                  <div className="metric-detail" key={days}>
                    <span>
                      {c.currency}/{quote} ·{" "}
                      {days === 1
                        ? "1 séance"
                        : days === 5
                          ? "1 semaine"
                          : days === 23
                            ? "1 mois"
                            : "3 mois"}
                    </span>
                    <strong
                      className={`mono ${(value ?? 0) >= 0 ? "positive" : "negative"}`}
                    >
                      {value === null ? "—" : formatValue(value)}
                    </strong>
                    <small>
                      {last && old
                        ? `${old.date} → ${last.date}`
                        : "Historique insuffisant"}
                    </small>
                  </div>
                );
              })}
            </div>
            <section className="panel">
              <div className="panel-title">
                <h2>
                  {c.currency} / {quote}
                </h2>
                <select
                  aria-label="Devise de comparaison"
                  value={quote}
                  onChange={(e) => setQuote(e.target.value)}
                >
                  {countries
                    .filter((k) => k.currency !== c.currency)
                    .map((k) => (
                      <option key={k.currency}>{k.currency}</option>
                    ))}
                </select>
              </div>
              <div className="comparison-controls">
                <div className="segmented">
                  {[5, 23, 65].map((n) => (
                    <button
                      className={fxDays === n ? "active" : ""}
                      key={n}
                      onClick={() => setFxDays(n)}
                    >
                      {n === 5 ? "1S" : n === 23 ? "1M" : "3M"}
                    </button>
                  ))}
                </div>
              </div>
              <InteractiveChart
                series={[
                  {
                    id: c.currency,
                    label: `${c.currency}/${quote}`,
                    color: "#edb477",
                    points: fxSeries,
                  },
                ]}
                unit={quote}
                label="Cours de référence quotidien"
              />
            </section>
            <div className="currency-links">
              {countries
                .filter((k) => k.code !== c.code)
                .map((k) => (
                  <Link key={k.code} href={`/devises/${k.currency}`}>
                    {k.flag} {k.currency}
                    <ArrowUpRight size={12} />
                  </Link>
                ))}
            </div>
          </>
        )}
        <div className="profile-bottom-grid">
          <section className="panel">
            <div className="panel-title">
              <h2>Agenda · {c.currency}</h2>
              <span className="tiny-tag">SEMAINE EN COURS</span>
            </div>
            <div className="profile-agenda">
              {calendar.length ? (
                calendar.slice(0, 12).map((e, i) => (
                  <div key={i}>
                    <time>
                      {new Date(e.date).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "Europe/Paris",
                      })}
                    </time>
                    <strong>{e.title}</strong>
                    <span
                      className={e.impact === "High" ? "impact-high" : "muted"}
                    >
                      {e.impact === "High"
                        ? "Fort"
                        : e.impact === "Medium"
                          ? "Moyen"
                          : "Faible"}
                    </span>
                    <small>
                      Prévision {e.forecast || "—"} · Précédent{" "}
                      {e.previous || "—"}
                    </small>
                  </div>
                ))
              ) : (
                <div className="empty">
                  <strong>
                    {loading ? "Chargement…" : "Aucune publication disponible"}
                  </strong>
                </div>
              )}
            </div>
          </section>
          <section className="panel">
            <div className="panel-title">
              <h2>Banques centrales · dernières publications</h2>
            </div>
            <div className="news-list">
              {(live?.news?.data ?? [])
                .filter((n) => n.category === "Banques centrales")
                .slice(0, 5)
                .map((n, i) => (
                  <article className="news-item" key={i}>
                    <div className="news-meta">
                      <span>{n.source}</span>
                      <time>
                        {new Date(n.date).toLocaleDateString("fr-FR", {
                          timeZone: "Europe/Paris",
                        })}
                      </time>
                    </div>
                    <a
                      href={n.url || undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <h3>{n.title}</h3>
                      <ArrowUpRight size={14} />
                    </a>
                  </article>
                ))}
              {!(live?.news?.data ?? []).some(
                (n) => n.category === "Banques centrales",
              ) && (
                <div className="empty">
                  <strong>Flux indisponible</strong>
                </div>
              )}
            </div>
          </section>
        </div>
        <footer className="profile-footer">
          <span>Macro · {c.currency}</span>
          <span>Banque mondiale · Frankfurter · Horaires Paris</span>
        </footer>
      </main>
    </div>
  );
}
