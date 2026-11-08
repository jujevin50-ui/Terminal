"use client";
import { cadence, periodLabel, delayed } from "@/lib/cadence";
import { type TerminalData, countries } from "@/lib/data";
export default function Freshness({ data }: { data: TerminalData }) {
  const annualDates = Object.values(data.macro.data)
    .flatMap((s) => Object.values(s).map((o) => o.year))
    .sort();
  const dates: Record<keyof TerminalData, string[]> = {
    news: data.news.data
      .map((n) => n.date)
      .filter(Boolean)
      .map((d) => new Date(d).toISOString().slice(0, 10))
      .sort(),
    calendar: data.calendar.data.map((e) => e.date.slice(0, 10)).sort(),
    fx: data.fx.data ? [data.fx.data.date] : [],
    macro: annualDates,
    rates: Object.values(data.rates.data)
      .map((r) => r.date)
      .sort(),
    recent: data.recent.data.series.map((s) => s.date).sort(),
  };
  return (
    <section className="panel freshness-panel">
      <div className="panel-title">
        <h2>Fraîcheur et actualisation automatique</h2>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>FLUX</th>
              <th>PUBLICATION</th>
              <th>CONTRÔLE NAVIGATEUR</th>
              <th>CACHE SOURCE</th>
              <th>OBSERVATIONS REÇUES</th>
              <th>DERNIER CONTRÔLE</th>
            </tr>
          </thead>
          <tbody>
            {(Object.keys(cadence) as (keyof TerminalData)[]).map((key) => {
              const feed = data[key],
                d = dates[key];
              return (
                <tr key={key}>
                  <td>
                    {cadence[key].label}
                    <small
                      className={
                        feed.stale
                          ? "late-observation"
                          : feed.status === "ok"
                            ? "positive"
                            : "negative"
                      }
                    >
                      {feed.stale
                        ? "Cache après erreur"
                        : feed.status === "ok"
                          ? "Réponse reçue"
                          : "Source non reçue"}
                    </small>
                  </td>
                  <td>{cadence[key].publication}</td>
                  <td>{cadence[key].poll / 60000} min</td>
                  <td>{cadence[key].ttl / 60} min</td>
                  <td>
                    {d.length
                      ? `${d[0]}${d.at(-1) !== d[0] ? ` → ${d.at(-1)}` : ""}`
                      : "—"}
                  </td>
                  <td>
                    {feed.fetchedAt
                      ? new Date(feed.fetchedAt).toLocaleString("fr-FR", {
                          timeZone: "Europe/Paris",
                        })
                      : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="panel-footnote">
        Les contrôles tournent tant que l’onglet est visible et connecté.
        Réactualisation au retour sur l’onglet et à la reconnexion. Un contrôle
        récent ne signifie pas que la période observée est récente ; aucune
        valeur n’est prolongée artificiellement jusqu’à aujourd’hui.
      </div>
      <div className="coverage-notes">
        <strong>Couverture des indicateurs essentiels</strong>
        <p>
          Taux directeurs : BRI pour les 12 économies, fourchette cible Fed en
          complément. Inflation, chômage et croissance récente : FRED/OCDE et
          Eurostat selon les séries disponibles. Emploi non agricole, ventes au
          détail, production industrielle et rendements 2/10 ans : États-Unis
          actuellement. Les séries en erreur, anciennes ou non couvertes ne sont
          pas remplacées par les observations annuelles.
        </p>
        <p>
          Les PMI, les consensus et les surprises de publication ne sont pas
          couverts par ces flux. Aucun accès à des cotations intrajournalières
          ni délai de diffusion garanti n’est fourni par ces sources publiques.
        </p>
      </div>
      <div className="table-scroll">
        <table className="release-availability">
          <thead>
            <tr>
              <th>ÉCONOMIE</th>
              <th>TAUX DIRECTEUR · OBSERVATION</th>
              <th>INFLATION · PÉRIODE</th>
              <th>CHÔMAGE · PÉRIODE</th>
              <th>CROISSANCE · PÉRIODE</th>
            </tr>
          </thead>
          <tbody>
            {countries.map((c) => (
              <tr key={c.code}>
                <th>
                  {c.flag} {c.currency}
                </th>
                <td>
                  {data.rates.data[c.code]
                    ? `${data.rates.data[c.code].date}${delayed(data.rates.data[c.code].date, "D") ? " · ancien" : ""}`
                    : "Non reçu"}
                </td>
                {["inflation", "unemployment", "growth"].map((key) => {
                  const row = data.recent.data.series.find(
                    (s) => s.country === c.code && s.key === key,
                  );
                  return (
                    <td key={key}>
                      {row
                        ? `${periodLabel(row.date, row.frequency)}${delayed(row.date, row.frequency) ? " · ancien" : ""}`
                        : data.recent.data.errors.some(
                              (e) => e.country === c.code && e.key === key,
                            )
                          ? "Erreur source"
                          : "Non couvert / non reçu"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
