"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, ExternalLink } from "lucide-react";
import { useTerminalFeeds } from "../hooks/use-terminal-feeds";
import { countries, indicators } from "@/lib/data";
import { formatValue } from "../components/interactive-chart";
export default function DataQuality() {
  const [catalog, setCatalog] = useState<import("@/lib/data").CatalogRow[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/terminal?section=catalog", {
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(55000)]),
    })
      .then((r) => r.json())
      .then((result) => {
        if (Array.isArray(result.data)) setCatalog(result.data);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const { data, loading, refresh } = useTerminalFeeds();
  const diagnostics = data.macro.diagnostics ?? [];
  return (
    <div className="quality-shell">
      <header className="profile-header">
        <Link href="/" className="profile-brand">
          Macro<span>.</span>
        </Link>
        <Link href="/" className="profile-back">
          <ArrowLeft size={14} /> Terminal
        </Link>
      </header>
      <main className="profile-main">
        <div className="profile-hero">
          <div>
            <span className="eyebrow">CONTRÔLE DES SOURCES</span>
            <h1>Disponibilité des indicateurs</h1>
            <p>
              Chaque cellule indique l’année et la valeur réellement reçues. «
              Non publié » désigne une réponse valide sans observation ; «
              Erreur source » désigne une requête échouée.
            </p>
          </div>
          <button
            className="outline-button"
            disabled={loading}
            onClick={() => refresh(["macro"])}
          >
            <RefreshCw size={14} className={loading ? "spinning" : ""} />{" "}
            Vérifier
          </button>
        </div>
        {data.macro.stale && (
          <div className="notice">
            Dernier chargement en erreur · observations conservées en cache.
          </div>
        )}
        <div className="quality-summary">
          <span>
            {diagnostics.filter((d) => d.status === "ok").length}/
            {indicators.length} séries reçues
          </span>
          <span>
            {diagnostics.reduce((n, d) => n + d.observations, 0)} observations
          </span>
          <span>
            {data.macro.fetchedAt
              ? `Chargement ${new Date(data.macro.fetchedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris" })}`
              : "Chargement en cours"}
          </span>
        </div>
        <section className="panel">
          <div className="table-scroll">
            <table className="quality-table">
              <thead>
                <tr>
                  <th>INDICATEUR</th>
                  {countries.map((c) => (
                    <th key={c.code}>
                      <Link href={`/devises/${c.currency}`}>
                        {c.flag} {c.currency}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {indicators.map((i) => {
                  const diagnostic = diagnostics.find((d) => d.key === i.key);
                  return (
                    <tr key={i.key}>
                      <th>
                        <a
                          href={`https://data.worldbank.org/indicator/${i.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {i.label} <ExternalLink size={11} />
                        </a>
                        <small>{i.id}</small>
                        <small
                          title={
                            catalog.find((row) => row.code === i.id)
                              ?.definition ??
                            catalog.find((row) => row.code === i.id)?.error
                          }
                        >
                          {catalog.find((row) => row.code === i.id)?.verified
                            ? "Code WDI confirmé"
                            : catalog.length
                              ? "Code non vérifié"
                              : "Vérification du catalogue…"}
                        </small>
                        <small>{i.detail}</small>
                        {diagnostic?.updatedAt && (
                          <small>
                            Source mise à jour le {diagnostic.updatedAt}
                          </small>
                        )}
                      </th>
                      {countries.map((c) => {
                        const o = data.macro.data[c.code]?.[i.key];
                        return (
                          <td
                            key={c.code}
                            className={
                              o
                                ? diagnostic?.status === "error"
                                  ? "quality-stale"
                                  : "quality-ok"
                                : diagnostic?.status === "error"
                                  ? "quality-error"
                                  : "quality-missing"
                            }
                          >
                            {o ? (
                              <>
                                <strong>
                                  {formatValue(o.value, i.unit, true)}
                                </strong>
                                <span>
                                  {o.year} · {o.history?.length ?? 1} obs.{" "}
                                  {diagnostic?.status === "error"
                                    ? "· cache"
                                    : ""}
                                </span>
                              </>
                            ) : (
                              <span title={diagnostic?.error}>
                                {loading
                                  ? "Chargement…"
                                  : diagnostic?.status === "error"
                                    ? "Erreur source"
                                    : diagnostic
                                      ? "Non publié"
                                      : "Non vérifié"}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
        <p className="quality-note">
          Les statistiques annuelles ont des délais de publication variables.
          Une série ancienne ou absente n’est pas remplacée par une valeur
          estimée. Pour la dette et le solde budgétaire, la couverture concerne
          l’administration centrale.
        </p>
      </main>
    </div>
  );
}
