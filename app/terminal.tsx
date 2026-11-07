"use client";
import Link from "next/link";
import { useTerminalFeeds } from "./hooks/use-terminal-feeds";
import { useRouter } from "next/navigation";
import MacroComparison from "./components/macro-comparison";
import InteractiveChart from "./components/interactive-chart";
import { demoData } from "@/lib/demo";
import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Activity,
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  ExternalLink,
  Globe2,
  LayoutDashboard,
  Moon,
  Newspaper,
  Plus,
  Radio,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  TrendingUp,
  X,
} from "lucide-react";
import { countries, currencyFlags, type TerminalData } from "@/lib/data";
type View = "overview" | "news" | "calendar" | "countries" | "fx" | "watchlist";
const navigation = [
  { id: "overview", label: "Vue d’ensemble", icon: LayoutDashboard },
  { id: "news", label: "Fil d’actualités", icon: Newspaper },
  { id: "calendar", label: "Calendrier économique", icon: CalendarDays },
  { id: "countries", label: "Pays & économies", icon: Globe2 },
  { id: "fx", label: "Devises & marchés", icon: ChartNoAxesCombined },
  { id: "watchlist", label: "Ma liste de suivi", icon: Star },
] as const;
const number = (n: number, d = 2) =>
  new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: d,
    minimumFractionDigits: d,
  }).format(n);
const time = (d: string) =>
  new Date(d).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
const day = (d: string) =>
  new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone: "Europe/Paris",
  });
function Spark({
  values,
  positive = true,
}: {
  values: number[];
  positive?: boolean;
}) {
  if (values.length < 2) return <span className="no-spark">—</span>;
  const min = Math.min(...values),
    max = Math.max(...values);
  return (
    <svg className="spark" viewBox="0 0 100 30" aria-hidden="true">
      <path
        d={values
          .map(
            (v, i) =>
              `${i ? "L" : "M"}${(i / (values.length - 1)) * 100},${26 - ((v - min) / (max - min || 1)) * 22}`,
          )
          .join(" ")}
        fill="none"
        stroke={positive ? "var(--green)" : "var(--red)"}
        strokeWidth="1.6"
      />
    </svg>
  );
}
function Change({ value }: { value: number | undefined }) {
  return value === undefined ? (
    <span className="muted mono">—</span>
  ) : (
    <span className={`change mono ${value >= 0 ? "positive" : "negative"}`}>
      {value >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}{" "}
      {value >= 0 ? "+" : ""}
      {number(value)} %
    </span>
  );
}
function PanelTitle({
  icon: Icon,
  title,
  tag,
  action,
  onClick,
}: {
  icon: typeof Globe2;
  title: string;
  tag?: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="panel-title">
      <div>
        <Icon size={15} />
        <h2>{title}</h2>
        {tag && <span className="tiny-tag">{tag}</span>}
      </div>
      {action && (
        <button className="text-button" onClick={onClick}>
          {action}
          <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}
function EmptyState({
  label,
  loading = false,
}: {
  label: string;
  loading?: boolean;
}) {
  return (
    <div className="empty">
      <Radio size={23} />
      <strong>{loading ? "Connexion aux sources…" : label}</strong>
      <span>
        {loading
          ? "Récupération des dernières publications publiques."
          : "La source ne répond pas pour le moment. Le flux sera réessayé automatiquement."}
      </span>
    </div>
  );
}
export default function Terminal() {
  const router = useRouter();
  const [view, setView] = useState<View>("overview");
  const { data, loading, refresh, refreshAt } = useTerminalFeeds();
  const [demo, setDemo] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saved, setSaved] = useState<string[]>(["USA", "EMU", "JPN"]);
  const [region, setRegion] = useState("Toutes les régions");
  const [newsCategory, setNewsCategory] = useState("Toutes");
  const [impact, setImpact] = useState("Tous");
  const [eventCurrency, setEventCurrency] = useState("Toutes");
  const [dateOffset, setDateOffset] = useState(0);
  const [base, setBase] = useState("EUR");
  const [quote, setQuote] = useState("USD");
  const [range, setRange] = useState("1M");
  const [modal, setModal] = useState<"sources" | "settings" | null>(null);
  const [sidebar, setSidebar] = useState(false);
  const [amount, setAmount] = useState("1000");
  const [newsLimit, setNewsLimit] = useState(12);
  const [showChart, setShowChart] = useState(false);
  useEffect(() => {
    setDemo(sessionStorage.getItem("macro-demo") === "true");
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    try {
      const s = localStorage.getItem("atlas-watchlist");
      if (s) {
        const codes = JSON.parse(s);
        if (Array.isArray(codes))
          setSaved(codes.filter((c) => countries.some((x) => x.code === c)));
      }
    } catch {}
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setModal(null);
        setSearchOpen(false);
        setShowChart(false);
        setSidebar(false);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  useEffect(() => {
    if (!searchOpen && !modal && !showChart) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]");
    const selector =
      'button:not([disabled]),a[href],input,select,[tabindex="0"]';
    const elements = () =>
      Array.from(dialog?.querySelectorAll<HTMLElement>(selector) ?? []).filter(
        (el) => el.getClientRects().length > 0,
      );
    const first = elements()[0];
    if (!dialog?.contains(document.activeElement)) first?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = elements();
      const first = items[0],
        last = items.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [searchOpen, modal, showChart]);
  const live = useMemo(() => (demo ? demoData() : data), [demo, data]);
  const fx = live.fx.data;
  const healthy = Object.values(live).filter(
    (x) => x.status === "ok" && !x.stale,
  ).length;
  const cached = Object.values(live).some((x) => x.stale);
  const toggleSave = (code: string) => {
    setSaved((old) => {
      const next = old.includes(code)
        ? old.filter((c) => c !== code)
        : [...old, code];
      localStorage.setItem("atlas-watchlist", JSON.stringify(next));
      return next;
    });
  };
  useEffect(() => {
    const sync = () => {
      const candidate = new URLSearchParams(window.location.search).get("vue");
      setView(
        navigation.some((n) => n.id === candidate)
          ? (candidate as View)
          : "overview",
      );
    };
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const go = (v: View) => {
    window.history.pushState(null, "", v === "overview" ? "/" : `/?vue=${v}`);
    window.scrollTo({ top: 0, behavior: "instant" });
    setView(v);
    setSidebar(false);
    setQuery("");
    setRegion("Toutes les régions");
  };
  const getSeries = (b: string, q: string) =>
    fx?.history
      .filter((h) => h.rates[b] && h.rates[q])
      .map((h) => ({ date: h.date, value: h.rates[q] / h.rates[b] })) ?? [];
  const rate = (b: string, q: string) =>
    fx?.rates[b] && fx.rates[q] ? fx.rates[q] / fx.rates[b] : undefined;
  const delta = (b: string, q: string) => {
    const series = getSeries(b, q);
    return series.length > 1
      ? (series.at(-1)!.value / series.at(-2)!.value - 1) * 100
      : undefined;
  };
  const allEvents = live.calendar.data;
  const today = now
    ? new Date(
        `${now.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" })}T12:00:00Z`,
      )
    : null;
  if (today) today.setUTCDate(today.getUTCDate() + dateOffset);
  const events = allEvents.filter(
    (e) =>
      (impact === "Tous" || e.impact === impact) &&
      (eventCurrency === "Toutes" || e.country === eventCurrency) &&
      (view === "overview" ||
        !today ||
        new Date(e.date).toLocaleDateString("en-CA", {
          timeZone: "Europe/Paris",
        }) === today.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" })),
  );
  const filteredCountries = countries.filter(
    (c) =>
      (region === "Toutes les régions" || c.region === region) &&
      (view !== "watchlist" || saved.includes(c.code)) &&
      `${c.name} ${c.currency} ${c.bank}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const filteredNews = live.news.data.filter(
    (n) =>
      (newsCategory === "Toutes" || n.category === newsCategory) &&
      n.title.toLowerCase().includes(query.toLowerCase()),
  );
  const upcoming = allEvents.find(
    (e) =>
      Date.parse(e.date) > (now?.getTime() ?? Date.now()) &&
      e.impact === "High",
  );
  const toggleDemo = () => {
    setDemo((v) => {
      sessionStorage.setItem("macro-demo", String(!v));
      return !v;
    });
    setModal(null);
  };
  function renderChart(expanded = false) {
    const series = getSeries(base, quote).slice(
      -(range === "1S" ? 5 : range === "1M" ? 23 : 65),
    );
    const current = rate(base, quote);
    return (
      <section
        className={`panel chart-panel ${expanded ? "expanded-chart" : ""}`}
      >
        <PanelTitle
          icon={TrendingUp}
          title="Marché des changes"
          tag="FX"
          action={expanded ? undefined : "Agrandir"}
          onClick={() => setShowChart(true)}
        />
        <div className="chart-controls">
          <div className="pair-select">
            <select
              aria-label="Devise de base du graphique"
              value={base}
              onChange={(e) => setBase(e.target.value)}
            >
              {countries.map((c) => (
                <option key={c.currency}>{c.currency}</option>
              ))}
            </select>
            <span>/</span>
            <select
              aria-label="Devise de cotation"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
            >
              {countries.map((c) => (
                <option key={c.currency}>{c.currency}</option>
              ))}
            </select>
            <span className="pair-name">
              {countries.find((c) => c.currency === base)?.flag} {base} /{" "}
              {quote}
            </span>
          </div>
          <div className="segmented">
            {["1S", "1M", "3M"].map((r) => (
              <button
                key={r}
                className={range === r ? "active" : ""}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-price">
          <strong className="mono">
            {current ? number(current, 4) : "—,————"}
          </strong>
          <Change value={delta(base, quote)} />
          <span className="muted">
            {fx
              ? `Référence du ${day(fx.date)}`
              : "Cours de référence quotidien"}
          </span>
        </div>
        <InteractiveChart
          series={[
            {
              id: base + quote,
              label: `${base}/${quote}`,
              color: "#edb477",
              points: series,
            },
          ]}
          unit={quote}
          label={`${base}/${quote}`}
          height={expanded ? 400 : 260}
        />
        <div className="chart-footer">
          <span>
            <span className="orange-dot" /> {base}/{quote} · clôtures
            quotidiennes
          </span>
          <span>
            Frankfurter <ExternalLink size={10} />
          </span>
        </div>
      </section>
    );
  }
  function renderCalendar(full = false) {
    return (
      <section className={`panel calendar-panel ${full ? "full-panel" : ""}`}>
        <PanelTitle
          icon={CalendarDays}
          title="Calendrier économique"
          tag={demo ? "EXEMPLE" : "CETTE SEMAINE"}
          action={full ? undefined : "Tout voir"}
          onClick={() => go("calendar")}
        />
        <div className="calendar-toolbar">
          <div className="calendar-date">
            {full && (
              <button
                aria-label="Jour précédent"
                onClick={() => setDateOffset((v) => v - 1)}
              >
                <ChevronLeft size={14} />
              </button>
            )}
            <button
              onClick={() => {
                setDateOffset(0);
                if (!full) go("calendar");
              }}
            >
              {full && today
                ? today.toLocaleDateString("fr-FR", {
                    weekday: "long",
                    day: "numeric",
                    month: "short",
                    timeZone: "Europe/Paris",
                  })
                : "Cette semaine"}
              <ChevronDown size={12} />
            </button>
            {full && today && (
              <input
                className="calendar-date-input"
                type="date"
                aria-label="Choisir la date du calendrier"
                value={today.toISOString().slice(0, 10)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const baseDate = new Date(
                    `${new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" })}T12:00:00Z`,
                  );
                  setDateOffset(
                    Math.round(
                      (Date.parse(`${e.target.value}T12:00:00Z`) -
                        baseDate.getTime()) /
                        86400000,
                    ),
                  );
                }}
              />
            )}
            {full && (
              <button
                aria-label="Jour suivant"
                onClick={() => setDateOffset((v) => v + 1)}
              >
                <ChevronRight size={14} />
              </button>
            )}
          </div>
          <div className="inline-filters">
            <select
              aria-label="Filtrer par devise"
              value={eventCurrency}
              onChange={(e) => setEventCurrency(e.target.value)}
            >
              <option value="Toutes">Toutes devises</option>
              {countries.map((c) => (
                <option key={c.currency}>{c.currency}</option>
              ))}
            </select>
            <select
              aria-label="Filtrer par impact"
              value={impact}
              onChange={(e) => setImpact(e.target.value)}
            >
              <option value="Tous">Tous impacts</option>
              <option value="High">Impact fort</option>
              <option value="Medium">Impact moyen</option>
              <option value="Low">Impact faible</option>
            </select>
          </div>
        </div>
        {live.calendar.status === "error" ? (
          <EmptyState label="Calendrier indisponible" loading={loading} />
        ) : events.length === 0 ? (
          <div className="empty">
            <CalendarDays />
            <strong>Aucune publication pour ces filtres</strong>
            <span>
              Le flux couvre la semaine en cours. Changez de jour ou de devise.
            </span>
            <button
              className="text-button"
              onClick={() => {
                setDateOffset(0);
                setImpact("Tous");
                setEventCurrency("Toutes");
              }}
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="economic-table">
              <thead>
                <tr>
                  <th>
                    HEURE <span>PARIS</span>
                  </th>
                  <th>DEVISE</th>
                  <th>ÉVÉNEMENT</th>
                  <th>IMPACT</th>
                  <th>ACTUEL</th>
                  <th>PRÉVISION</th>
                  <th>PRÉCÉDENT</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, full ? 100 : 7).map((e, i) => (
                  <tr key={`${e.title}-${e.date}-${i}`}>
                    <td className="mono">
                      {!full && <small>{day(e.date)} </small>}
                      {time(e.date)}
                    </td>
                    <td>
                      <span className="currency-badge">
                        {currencyFlags[e.country] ?? "🌐"} {e.country}
                      </span>
                    </td>
                    <td className="event-title">{e.title}</td>
                    <td>
                      <span
                        title={
                          e.impact === "High"
                            ? "Impact fort"
                            : e.impact === "Medium"
                              ? "Impact moyen"
                              : "Impact faible"
                        }
                        className={`impact ${e.impact.toLowerCase()}`}
                      >
                        <i />
                        <i />
                        <i />
                      </span>
                    </td>
                    <td className="mono actual">{e.actual || "—"}</td>
                    <td className="mono">{e.forecast || "—"}</td>
                    <td className="mono muted">{e.previous || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="panel-footnote">
          <span>
            <i className="orange-dot" /> Fort <i className="yellow-dot" /> Moyen{" "}
            <i className="gray-dot" /> Faible
          </span>
          <span>Forex Factory / Fair Economy · 5 min</span>
        </div>
      </section>
    );
  }
  function renderCountries(full = false) {
    return (
      <section className="panel countries-panel">
        <PanelTitle
          icon={Globe2}
          title={
            view === "watchlist"
              ? "Ma liste de suivi"
              : "Panorama des économies"
          }
          tag={`${full ? filteredCountries.length : 8} ÉCONOMIES`}
          action={full ? undefined : "Explorer les pays"}
          onClick={() => go("countries")}
        />
        {full && (
          <div className="country-filters">
            <div className="input-wrap">
              <Search size={15} />
              <input
                placeholder="Rechercher un pays, une devise…"
                aria-label="Rechercher un pays"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              aria-label="Filtrer par région"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              {[
                "Toutes les régions",
                "Amériques",
                "Europe",
                "Asie-Pacifique",
                "Afrique",
              ].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        )}
        <div className="table-scroll">
          <table className="country-table">
            <thead>
              <tr>
                <th>PAYS / RÉGION</th>
                <th>DEVISE</th>
                <th>CROISSANCE PIB</th>
                <th>INFLATION</th>
                <th>CHÔMAGE</th>
                <th>PIB NOMINAL</th>
                <th aria-label="Suivre" />
              </tr>
            </thead>
            <tbody>
              {(full ? filteredCountries : countries.slice(0, 8)).map((c) => {
                const m = live.macro.data[c.code];
                return (
                  <tr
                    key={c.code}
                    onClick={() => router.push(`/devises/${c.currency}`)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        router.push(`/devises/${c.currency}`);
                    }}
                  >
                    <td>
                      <div className="country-name">
                        <span className="flag">{c.flag}</span>
                        <div>
                          <strong>{c.name}</strong>
                          <small>{c.bank}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="code-tag">{c.currency}</span>
                    </td>
                    {["growth", "inflation", "unemployment"].map((k) => (
                      <td key={k}>
                        <div
                          className={`${k === "growth" && m?.[k] ? (m[k].value >= 0 ? "positive" : "negative") : ""} mono`}
                        >
                          {m?.[k] ? `${number(m[k].value, 1)} %` : "—"}
                        </div>
                        <small>{m?.[k]?.year ?? "Non disponible"}</small>
                      </td>
                    ))}
                    <td className="mono">
                      {m?.gdp ? `${number(m.gdp.value / 1e12, 2)} T$` : "—"}
                      <small>{m?.gdp?.year}</small>
                    </td>
                    <td>
                      <button
                        className={`star-button ${saved.includes(c.code) ? "saved" : ""}`}
                        aria-label={`${saved.includes(c.code) ? "Retirer" : "Suivre"} ${c.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSave(c.code);
                        }}
                      >
                        <Star
                          size={14}
                          fill={
                            saved.includes(c.code) ? "currentColor" : "none"
                          }
                        />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {full && filteredCountries.length === 0 && (
          <div className="empty">
            <Star />
            <strong>Aucun pays dans cette sélection</strong>
            <button className="text-button" onClick={() => go("countries")}>
              Explorer les économies
            </button>
          </div>
        )}
        <div className="panel-footnote">
          <span>
            Banque mondiale · dernières observations annuelles disponibles
          </span>
          <button onClick={() => setModal("sources")} className="text-button">
            Méthodologie <CircleHelp size={11} />
          </button>
        </div>
      </section>
    );
  }
  function renderNews(full = false) {
    return (
      <section className={`panel news-panel ${full ? "news-full" : ""}`}>
        <PanelTitle
          icon={Radio}
          title="Fil d’actualités"
          tag={demo ? "DÉMO" : "PUBLICATIONS"}
          action={full ? undefined : "Tout voir"}
          onClick={() => go("news")}
        />
        <div className="news-filters">
          {["Toutes", "Économie", "Banques centrales"].map((c) => (
            <button
              className={newsCategory === c ? "active" : ""}
              key={c}
              onClick={() => setNewsCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
        {full && (
          <div className="news-search input-wrap">
            <Search size={15} />
            <input
              aria-label="Rechercher une actualité"
              placeholder="Rechercher dans les dépêches…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        )}
        {live.news.status === "error" ? (
          <EmptyState
            label="Flux d’actualités indisponible"
            loading={loading}
          />
        ) : filteredNews.length === 0 ? (
          <div className="empty">
            <Newspaper />
            <strong>Aucune actualité correspondante</strong>
          </div>
        ) : (
          <div className="news-list">
            {filteredNews.slice(0, full ? newsLimit : 5).map((n, i) => (
              <article key={`${n.url}-${i}`} className="news-item">
                <div className="news-meta">
                  <span className="news-source">{n.source}</span>
                  <time dateTime={n.date}>
                    {day(n.date)} · {time(n.date)}
                  </time>
                </div>
                {n.url ? (
                  <a href={n.url} target="_blank" rel="noopener noreferrer">
                    <h3>{n.title}</h3>
                    <ArrowUpRight size={13} />
                  </a>
                ) : (
                  <h3>{n.title}</h3>
                )}
                <span className="news-category">{n.category}</span>
              </article>
            ))}
          </div>
        )}
        {full ? (
          filteredNews.length > newsLimit && (
            <button
              className="load-more"
              onClick={() => setNewsLimit((n) => n + 12)}
            >
              Charger plus de publications <ChevronDown size={14} />
            </button>
          )
        ) : (
          <button className="news-bottom" onClick={() => go("news")}>
            Ouvrir le fil d’actualités <ArrowRight size={13} />
          </button>
        )}
        <div className="panel-footnote">
          <span>BBC · BCE · Federal Reserve</span>
          <span>↻ 2 min</span>
        </div>
      </section>
    );
  }
  return (
    <div className="terminal-shell">
      <aside className={`sidebar ${sidebar ? "mobile-open" : ""}`}>
        <a href="/" className="brand macro-brand" aria-label="Atlas accueil">
          <span className="brand-mark">
            <Activity size={23} />
          </span>
          <span>
            Macro<span className="brand-period">.</span>
            <small>TERMINAL PERSONNEL</small>
          </span>
        </a>
        <div className="workspace-label">
          ANALYSE <span>PERSO</span>
        </div>
        <nav>
          {navigation.map((n) => (
            <button
              className={view === n.id ? "nav-item active" : "nav-item"}
              key={n.id}
              onClick={() => go(n.id)}
            >
              <n.icon size={17} />
              <span>{n.label}</span>
              {n.id === "news" && <i className="nav-dot" />}
              {n.id === "watchlist" && (
                <span className="nav-count">{saved.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-watchlist">
          <div className="section-eyebrow">
            VOTRE SUIVI{" "}
            <button
              aria-label="Ajouter un pays suivi"
              onClick={() => go("countries")}
            >
              <Plus size={14} />
            </button>
          </div>
          {countries
            .filter((c) => saved.includes(c.code))
            .slice(0, 5)
            .map((c) => (
              <button
                key={c.code}
                onClick={() => router.push(`/devises/${c.currency}`)}
              >
                <span>{c.flag}</span>
                <span>
                  {c.name}
                  <small>{c.currency}</small>
                </span>
                <ChevronRight size={12} />
              </button>
            ))}
          {!saved.length && (
            <p className="muted">Ajoutez vos économies favorites.</p>
          )}
        </div>
        <div className="sidebar-bottom">
          <Link className="data-quality-link" href="/donnees">
            <Activity size={14} /> État des indicateurs
          </Link>
          <button onClick={() => setModal("sources")}>
            <CircleHelp size={16} /> Sources & méthodologie{" "}
            <ArrowUpRight size={12} />
          </button>
          <button onClick={() => setModal("settings")}>
            <Settings2 size={16} /> Préférences
          </button>
          <div className="sidebar-version">
            <span className="status-dot" /> Macro TERMINAL <span>V1.0</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              aria-label="Ouvrir le menu"
              aria-expanded={sidebar}
              onClick={() => setSidebar(!sidebar)}
            >
              <LayoutDashboard size={18} />
            </button>
            <span>Terminal</span>
            <ChevronRight size={12} />
            <strong>{navigation.find((n) => n.id === view)?.label}</strong>
          </div>
          <button
            className="global-search"
            onClick={() => {
              setSearchQuery("");
              setSearchOpen(true);
            }}
          >
            <Search size={14} />
            <span>Rechercher un pays, une devise…</span>
            <kbd>⌘ K</kbd>
          </button>
          <div className="topbar-right">
            <span className="paris-time">
              <span className="status-dot" />
              {now
                ? now.toLocaleTimeString("fr-FR", { timeZone: "Europe/Paris" })
                : "--:--:--"}
              <small>PARIS</small>
            </span>
            <button
              className="icon-button"
              aria-label="Afficher les prochaines publications importantes"
              onClick={() => {
                go("calendar");
                setImpact("High");
              }}
            >
              <Bell size={17} />
              <i />
            </button>
            <button
              className="avatar"
              aria-label="Préférences"
              onClick={() => setModal("settings")}
            >
              AT
            </button>
          </div>
        </header>
        {view !== "overview" && (
          <div className="ticker">
            <div className="ticker-label">
              <Activity size={13} /> FX MONITOR
            </div>
            {[
              ["EUR", "USD"],
              ["GBP", "USD"],
              ["USD", "JPY"],
              ["USD", "CHF"],
              ["AUD", "USD"],
              ["USD", "CAD"],
            ].map(([b, q]) => (
              <button
                className="ticker-item"
                key={b + q}
                onClick={() => {
                  setBase(b);
                  setQuote(q);
                  go("fx");
                }}
              >
                <strong>
                  {b}/{q}
                </strong>
                <span className="mono">
                  {rate(b, q) ? number(rate(b, q)!, 4) : "—"}
                </span>
                <Change value={delta(b, q)} />
              </button>
            ))}
          </div>
        )}
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span className="orange-dot" /> INTELLIGENCE MACROÉCONOMIQUE
              </div>
              <h1>
                {view === "overview"
                  ? "Tableau de bord macro."
                  : view === "news"
                    ? "L’information, en perspective."
                    : view === "calendar"
                      ? "Anticipez les prochains mouvements."
                      : view === "countries"
                        ? "Chaque économie. Une vision globale."
                        : view === "watchlist"
                          ? "Vos économies, à portée de vue."
                          : "Le monde parle en devises."}
              </h1>
              <p>
                {view === "overview"
                  ? "Croissance, inflation, emploi : comparez les économies derrière chaque devise."
                  : view === "news"
                    ? "Les dernières publications économiques et les annonces des banques centrales."
                    : view === "calendar"
                      ? "Publications, décisions et indicateurs clés. Tous les horaires sont affichés à l’heure de Paris."
                      : view === "fx"
                        ? "Cours de référence, tendances et conversion des principales devises mondiales."
                        : "Explorez les fondamentaux et comparez les indicateurs des grandes économies."}
              </p>
            </div>
            <div className="heading-actions">
              <button
                className="outline-button"
                onClick={() => {
                  refresh();
                }}
                disabled={loading}
              >
                <RefreshCw size={13} className={loading ? "spinning" : ""} />
                {loading ? "Connexion…" : "Actualiser"}
              </button>
              <span className="date-label">
                <CalendarDays size={12} />
                {now
                  ? now.toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      timeZone: "Europe/Paris",
                    })
                  : "—"}
              </span>
            </div>
          </div>
          {demo ? (
            <div className="notice demo-notice">
              <Activity size={14} />
              <strong>MODE DÉMONSTRATION</strong>
              <span>Données fictives.</span>
              <button
                onClick={() => {
                  setDemo(false);
                  sessionStorage.setItem("macro-demo", "false");
                }}
              >
                Revenir aux sources <ArrowRight size={12} />
              </button>
            </div>
          ) : !loading && healthy < 4 ? (
            <div className="notice">
              <Radio size={14} />
              <span>
                <strong>
                  {healthy === 0
                    ? cached
                      ? "Dernières données conservées · actualisation indisponible."
                      : "Connexion aux sources limitée."
                    : `${healthy}/4 sources disponibles.`}
                </strong>{" "}
              </span>
              <button
                onClick={() => {
                  setDemo(true);
                  sessionStorage.setItem("macro-demo", "true");
                }}
              >
                Explorer une démo <ArrowRight size={12} />
              </button>
            </div>
          ) : (
            <div className="feed-status">
              <span className={`status-dot ${loading ? "pending" : ""}`} />
              {loading
                ? "Connexion aux sources publiques…"
                : `${healthy} sources connectées`}
              <span>·</span>Actualités 2 min <span>·</span> FX quotidien{" "}
              <span>·</span> Macro annuel{" "}
              <button onClick={() => setModal("sources")}>
                Détails <CircleHelp size={11} />
              </button>
            </div>
          )}
          {view === "fx" && (
            <div className="market-cards">
              {[
                ["EUR", "USD", "Euro / Dollar"],
                ["GBP", "USD", "Livre / Dollar"],
                ["USD", "JPY", "Dollar / Yen"],
                ["AUD", "USD", "Dollar australien / Dollar"],
              ].map(([b, q, label]) => {
                const change = delta(b, q);
                return (
                  <button
                    className="market-card"
                    key={b + q}
                    onClick={() => {
                      setBase(b);
                      setQuote(q);
                    }}
                  >
                    <div className="market-card-top">
                      <span>
                        <span className="currency-circle">
                          {currencyFlags[b]}
                        </span>
                        <strong>
                          {b}/{q}
                        </strong>
                      </span>
                      <ArrowUpRight size={14} />
                    </div>
                    <small>{label}</small>
                    <div className="market-card-data">
                      <div>
                        <strong className="mono">
                          {rate(b, q) ? number(rate(b, q)!, 4) : "—,————"}
                        </strong>
                        <Change value={change} />
                      </div>
                      <Spark
                        values={getSeries(b, q)
                          .slice(-23)
                          .map((p) => p.value)}
                        positive={(change ?? 0) >= 0}
                      />
                    </div>
                    <div className="market-card-foot">
                      RÉFÉRENCE QUOTIDIENNE{" "}
                      <span>{fx ? day(fx.date) : "En attente"}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {view === "overview" && (
            <>
              <div className="overview-grid">
                <div className="main-column">
                  <MacroComparison
                    macro={live.macro.data}
                    title="Croissance · grandes économies"
                  />
                  <MacroComparison
                    macro={live.macro.data}
                    initialIndicator="inflation"
                    title="Inflation · trajectoires comparées"
                    compact
                  />
                  <MacroComparison
                    macro={live.macro.data}
                    initialIndicator="unemployment"
                    title="Emploi · comparaison internationale"
                    compact
                  />
                  {renderCalendar()}
                </div>
                <div className="right-column">
                  {renderNews()}
                  <section className="next-release">
                    <div className="eyebrow">
                      <span className="orange-dot" /> À SURVEILLER
                    </div>
                    <h3>
                      {upcoming
                        ? upcoming.title
                        : "Les rendez-vous qui comptent."}
                    </h3>
                    <p>
                      {upcoming
                        ? `${currencyFlags[upcoming.country] ?? ""} ${upcoming.country} · ${day(upcoming.date)} à ${time(upcoming.date)}`
                        : "Inflation, emploi, décisions de taux : gardez les publications majeures en vue."}
                    </p>
                    <button
                      onClick={() => {
                        go("calendar");
                        setImpact("High");
                      }}
                    >
                      Voir les événements à fort impact{" "}
                      <ArrowUpRight size={14} />
                    </button>
                    <div className="release-orbit" />
                  </section>
                </div>
              </div>
              {renderCountries()}
            </>
          )}
          {view === "news" && renderNews(true)}
          {view === "calendar" && renderCalendar(true)}
          {(view === "countries" || view === "watchlist") &&
            renderCountries(true)}
          {view === "fx" && (
            <>
              <div className="fx-layout">
                {renderChart()}
                <section className="panel converter">
                  <PanelTitle
                    icon={ArrowDown}
                    title="Convertisseur de devises"
                  />
                  <label>
                    Montant
                    <div className="input-wrap">
                      <input
                        aria-label="Montant à convertir"
                        type="number"
                        min="0"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <select
                        aria-label="Devise source"
                        value={base}
                        onChange={(e) => setBase(e.target.value)}
                      >
                        {countries.map((c) => (
                          <option key={c.currency}>{c.currency}</option>
                        ))}
                      </select>
                    </div>
                  </label>
                  <button
                    className="swap-button"
                    aria-label="Inverser les devises"
                    onClick={() => {
                      setBase(quote);
                      setQuote(base);
                    }}
                  >
                    <ArrowDown size={16} />
                  </button>
                  <label>
                    Vous obtenez
                    <div className="conversion-result">
                      <strong>
                        {rate(base, quote) &&
                        amount.trim() !== "" &&
                        Number.isFinite(Number(amount)) &&
                        Number(amount) >= 0
                          ? number(Number(amount) * rate(base, quote)!)
                          : "—"}
                      </strong>
                      <select
                        aria-label="Devise cible"
                        value={quote}
                        onChange={(e) => setQuote(e.target.value)}
                      >
                        {countries.map((c) => (
                          <option key={c.currency}>{c.currency}</option>
                        ))}
                      </select>
                    </div>
                  </label>
                  <p>
                    1 {base} ={" "}
                    {rate(base, quote) ? number(rate(base, quote)!, 5) : "—"}{" "}
                    {quote}
                  </p>
                  <small>
                    Cours de référence quotidien, sans frais. Les cours de
                    transaction de votre intermédiaire peuvent différer.
                  </small>
                </section>
              </div>
              <section className="panel">
                <PanelTitle
                  icon={Globe2}
                  title="Matrice des devises"
                  tag="TAUX CROISÉS"
                />
                <div className="table-scroll">
                  <table className="fx-matrix">
                    <thead>
                      <tr>
                        <th>1 UNITÉ</th>
                        {["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD"].map(
                          (c) => (
                            <th key={c}>{c}</th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {["USD", "EUR", "GBP", "JPY", "CHF", "CAD", "AUD"].map(
                        (b) => (
                          <tr key={b}>
                            <th>
                              {currencyFlags[b]} {b}
                            </th>
                            {[
                              "USD",
                              "EUR",
                              "GBP",
                              "JPY",
                              "CHF",
                              "CAD",
                              "AUD",
                            ].map((q) => (
                              <td
                                key={q}
                                className={b === q ? "matrix-diagonal" : "mono"}
                              >
                                {b === q
                                  ? "—"
                                  : rate(b, q)
                                    ? number(rate(b, q)!, 4)
                                    : "—"}
                              </td>
                            ))}
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="panel-footnote">
                  Source : Frankfurter. Taux croisés calculés à partir des
                  références en USD.
                </div>
              </section>
            </>
          )}
        </main>
        <footer className="statusbar">
          <span>
            <span className={`status-dot ${healthy === 0 ? "pending" : ""}`} />
            {demo
              ? "Démonstration"
              : loading
                ? "Connexion en cours"
                : `${healthy}/4 flux disponibles`}
            <i />
            Macro · Terminal personnel
          </span>
          <span>
            {refreshAt
              ? `Vérification ${time(refreshAt)}`
              : "Macro TERMINAL PERSONNEL"}
            <i />
            <button onClick={() => setModal("sources")}>
              Sources & délais <ExternalLink size={10} />
            </button>
          </span>
        </footer>
      </div>
      {sidebar && (
        <div className="sidebar-overlay" onClick={() => setSidebar(false)} />
      )}
      {searchOpen && (
        <div className="modal-backdrop" onClick={() => setSearchOpen(false)}>
          <section
            className="search-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Rechercher un pays"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="search-modal-input">
              <Search size={20} />
              <input
                autoFocus
                placeholder="Rechercher un pays, une devise ou une banque…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                aria-label="Fermer la recherche"
                onClick={() => setSearchOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="search-results">
              <div className="section-eyebrow">ÉCONOMIES & DEVISES</div>
              {countries
                .filter((c) =>
                  `${c.name} ${c.currency} ${c.bank}`
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase()),
                )
                .map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      router.push(`/devises/${c.currency}`);
                      setSearchOpen(false);
                      setSearchQuery("");
                    }}
                  >
                    <span className="flag">{c.flag}</span>
                    <span>
                      <strong>{c.name}</strong>
                      <small>{c.bank}</small>
                    </span>
                    <span className="code-tag">{c.currency}</span>
                    <ArrowUpRight size={14} />
                  </button>
                ))}
            </div>
            <div className="search-modal-footer">
              Recherche parmi {countries.length} économies{" "}
              <kbd>ESC pour fermer</kbd>
            </div>
          </section>
        </div>
      )}
      {showChart && (
        <div className="modal-backdrop" onClick={() => setShowChart(false)}>
          <div
            className="chart-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Graphique des devises agrandi"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Fermer le graphique"
              onClick={() => setShowChart(false)}
            >
              <X size={20} />
            </button>
            {renderChart(true)}
          </div>
        </div>
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <section
            className="info-modal"
            role="dialog"
            aria-modal="true"
            aria-label={
              modal === "sources" ? "Sources et méthodologie" : "Préférences"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              aria-label="Fermer"
              onClick={() => setModal(null)}
            >
              <X size={20} />
            </button>
            <span className="eyebrow">Macro · TRANSPARENCE</span>
            <h2>
              {modal === "sources"
                ? "Les bonnes données. Le bon contexte."
                : "Préférences."}
            </h2>
            {modal === "sources" ? (
              <>
                <p>
                  Les données sont récupérées côté serveur, sans compte ni clé
                  API. La fraîcheur dépend de la publication de chaque source.
                </p>
                {[
                  {
                    key: "news",
                    title: "Actualités économiques",
                    source: "BBC Business, BCE, Federal Reserve",
                    delay:
                      "Consultation toutes les 2 minutes. Publications affichées dans leur langue d’origine.",
                    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
                  },
                  {
                    key: "calendar",
                    title: "Calendrier économique",
                    source: "Forex Factory / Fair Economy",
                    delay:
                      "Semaine en cours, consultation toutes les 5 minutes. Le flux peut ne pas fournir les résultats publiés ; « — » signifie non fourni.",
                    url: "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
                  },
                  {
                    key: "fx",
                    title: "Devises",
                    source: "Frankfurter / banques centrales",
                    delay:
                      "Cours de référence quotidiens, pas de cotations intrajournalières. Variation entre les deux dernières observations. Historique jusqu’à 100 jours.",
                    url: "https://frankfurter.dev",
                  },
                  {
                    key: "macro",
                    title: "Fondamentaux par pays",
                    source: "Banque mondiale · World Development Indicators",
                    delay:
                      "Dernière observation disponible sur 20 ans. Actualisation quotidienne du cache. Chaque indicateur conserve son année de référence.",
                    url: "https://data.worldbank.org",
                  },
                ].map((s) => (
                  <div className="source-card" key={s.key}>
                    <div>
                      <strong>{s.title}</strong>
                      <span
                        className={
                          data[s.key as keyof TerminalData].status === "ok"
                            ? "positive"
                            : "muted"
                        }
                      >
                        {data[s.key as keyof TerminalData].stale
                          ? "Dernières données en cache"
                          : data[s.key as keyof TerminalData].status === "ok"
                            ? "Connecté"
                            : "Indisponible"}
                      </span>
                    </div>
                    <a href={s.url} target="_blank" rel="noopener noreferrer">
                      {s.source} <ExternalLink size={11} />
                    </a>
                    <p>{s.delay}</p>
                  </div>
                ))}
                <small>
                  Les sources publiques peuvent limiter les requêtes ou modifier
                  leur disponibilité. Aucune donnée manquante n’est remplacée
                  par une estimation.
                </small>
              </>
            ) : (
              <>
                <p>
                  Vos pays suivis sont enregistrés uniquement dans ce
                  navigateur. Aucun compte n’est nécessaire.
                </p>
                <div className="setting-row">
                  <span>
                    <strong>Apparence terminal</strong>
                    <small>Thème sombre optimisé pour la lecture</small>
                  </span>
                  <Moon size={19} />
                </div>
                <div className="setting-row">
                  <span>
                    <strong>Horaires du calendrier</strong>
                    <small>
                      Europe / Paris · changement d’heure automatique
                    </small>
                  </span>
                  <Clock3 size={19} />
                </div>
                <div className="setting-row">
                  <span>
                    <strong>Mode démonstration</strong>
                    <small>
                      Explorez les fonctions avec des données fictives
                    </small>
                  </span>
                  <button
                    className={`toggle ${demo ? "on" : ""}`}
                    aria-label="Activer ou désactiver la démonstration"
                    aria-pressed={demo}
                    onClick={toggleDemo}
                  >
                    <span />
                  </button>
                </div>
                <button
                  className="outline-button"
                  onClick={() => {
                    setSaved([]);
                    localStorage.setItem("atlas-watchlist", "[]");
                  }}
                >
                  Vider ma liste de suivi
                </button>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
