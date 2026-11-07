"use client";
import { useId, useMemo, useState, useEffect, useRef } from "react";
import { Download, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
export type ChartSeries = {
  id: string;
  label: string;
  color: string;
  points: { date: string; value: number }[];
};
export function formatValue(n: number, unit = "%", compact = false) {
  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: unit === "$" ? 0 : 2,
      ...(compact ? { notation: "compact" as const } : {}),
    }).format(n) +
    (unit === "%" ? " %" : unit === "$" ? " $" : unit ? ` ${unit}` : "")
  );
}
export default function InteractiveChart({
  series,
  unit = "%",
  height = 300,
  label = "Comparaison historique",
}: {
  series: ChartSeries[];
  unit?: string;
  height?: number;
  label?: string;
}) {
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(280, entries[0].contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const plotWidth = width - 100;

  const [hidden, setHidden] = useState<string[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [windowSize, setWindowSize] = useState(0);
  const [offset, setOffset] = useState(0);
  const allDates = useMemo(
    () =>
      [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort(),
    [series],
  );
  const size = Math.min(allDates.length, windowSize || allDates.length);
  const end = Math.max(size, allDates.length - offset);
  const dates = allDates.slice(Math.max(0, end - size), end);
  const active = series.filter((s) => !hidden.includes(s.id));
  const values = active.flatMap((s) =>
    s.points.filter((p) => dates.includes(p.date)).map((p) => p.value),
  );
  const lo = Math.min(...values),
    hi = Math.max(...values);
  const pad = (hi - lo) * 0.12 || Math.abs(lo) * 0.1 || 1;
  const min = lo - pad,
    max = hi + pad;
  const x = (i: number) => 40 + (i / (dates.length - 1 || 1)) * plotWidth;
  const y = (v: number) => 24 + ((max - v) / (max - min)) * 232;
  const lookup = active.map((s) => ({
    ...s,
    map: new Map(s.points.map((p) => [p.date, p.value])),
  }));
  const changeZoom = (inward: boolean) => {
    setWindowSize(
      Math.max(
        2,
        Math.min(
          allDates.length,
          Math.round((size || allDates.length) * (inward ? 0.7 : 1.4)),
        ),
      ),
    );
    setOffset(0);
    setHover(null);
  };
  function download() {
    const rows = [
      ["Date", ...series.map((s) => s.label)],
      ...allDates.map((date) => [
        date,
        ...series.map(
          (s) => s.points.find((p) => p.date === date)?.value ?? "",
        ),
      ]),
    ];
    const blob = new Blob(
      [
        "\ufeff" +
          rows
            .map((row) =>
              row
                .map((v) => '"' + String(v).replaceAll('"', '""') + '"')
                .join(";"),
            )
            .join("\r\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "macro-historique.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="interactive-chart">
      <div className="chart-tools">
        <span>{label}</span>
        <div>
          <button
            aria-label="Zoom avant"
            disabled={dates.length <= 2}
            onClick={() => changeZoom(true)}
          >
            <ZoomIn size={14} />
          </button>
          <button
            aria-label="Zoom arrière"
            disabled={dates.length === allDates.length}
            onClick={() => changeZoom(false)}
          >
            <ZoomOut size={14} />
          </button>
          <button
            aria-label="Réinitialiser le graphique"
            onClick={() => {
              setWindowSize(0);
              setOffset(0);
              setHidden([]);
              setHover(null);
            }}
          >
            <RotateCcw size={13} />
          </button>
          <button
            aria-label="Exporter le graphique en CSV"
            disabled={!allDates.length}
            onClick={download}
          >
            <Download size={14} />
          </button>
        </div>
      </div>
      <div ref={container} className="interactive-canvas" style={{ height }}>
        <svg
          viewBox={`0 0 ${width} 300`}
          preserveAspectRatio="none"
          role="img"
          aria-label={label}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              setHover((i) =>
                Math.max(
                  0,
                  Math.min(
                    dates.length - 1,
                    (i ?? 0) + (e.key === "ArrowRight" ? 1 : -1),
                  ),
                ),
              );
            }
          }}
          onPointerMove={(e) => {
            const bounds = e.currentTarget.getBoundingClientRect();
            setHover(
              Math.max(
                0,
                Math.min(
                  dates.length - 1,
                  Math.round(
                    (((e.clientX - bounds.left) / bounds.width) * width - 40) /
                      plotWidth,
                  ),
                ),
              ),
            );
          }}
          onPointerLeave={() => setHover(null)}
          onPointerDown={(e) => {
            e.currentTarget.focus();
            const bounds = e.currentTarget.getBoundingClientRect();
            setHover(
              Math.max(
                0,
                Math.min(
                  dates.length - 1,
                  Math.round(
                    (((e.clientX - bounds.left) / bounds.width) * width - 40) /
                      plotWidth,
                  ),
                ),
              ),
            );
          }}
        >
          <defs>
            <clipPath id={id}>
              <rect x="39" y="5" width={plotWidth + 4} height="258" />
            </clipPath>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => {
            const v = max - ((max - min) * i) / 4;
            return (
              <g key={i}>
                <line
                  x1="40"
                  x2={width - 60}
                  y1={24 + i * 58}
                  y2={24 + i * 58}
                  stroke="#2c3540"
                  strokeDasharray="3 5"
                />
                <text
                  x={width - 50}
                  y={29 + i * 58}
                  fill="#8493a6"
                  fontSize="11"
                >
                  {values.length
                    ? new Intl.NumberFormat("fr-FR", {
                        notation: "compact",
                        maximumFractionDigits: 1,
                      }).format(v)
                    : "—"}
                </text>
              </g>
            );
          })}
          {values.length > 0 && min < 0 && max > 0 && (
            <line
              x1="40"
              x2={width - 60}
              y1={y(0)}
              y2={y(0)}
              stroke="#69788a"
              strokeDasharray="5 4"
            />
          )}
          <g clipPath={`url(#${id})`}>
            {lookup.map((s) => {
              let connected = false;
              const d = dates
                .map((date, i) => {
                  const v = s.map.get(date);
                  if (v === undefined) {
                    connected = false;
                    return "";
                  }
                  const command = connected ? "L" : "M";
                  connected = true;
                  return `${command}${x(i)},${y(v)}`;
                })
                .join(" ");
              return (
                <g key={s.id}>
                  <path
                    d={d}
                    stroke={s.color}
                    strokeWidth="2.5"
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                  />
                  {dates.map((d, i) => {
                    const v = s.map.get(d);
                    return v === undefined ? null : (
                      <circle
                        key={d}
                        cx={x(i)}
                        cy={y(v)}
                        r={dates.length < 25 ? 3 : 1}
                        fill={s.color}
                      />
                    );
                  })}
                </g>
              );
            })}
          </g>
          {dates
            .filter(
              (_, i) =>
                i %
                  Math.max(
                    1,
                    Math.ceil(dates.length / (width < 500 ? 4 : 7)),
                  ) ===
                0,
            )
            .map((date) => (
              <text
                key={date}
                x={x(dates.indexOf(date))}
                y="286"
                textAnchor="middle"
                fill="#8493a6"
                fontSize="11"
              >
                {date.length === 4 ? date : date.slice(5)}
              </text>
            ))}
          {hover !== null && dates[hover] && (
            <line
              x1={x(hover)}
              x2={x(hover)}
              y1="15"
              y2="260"
              stroke="#acb8c7"
              strokeDasharray="4 3"
            />
          )}
        </svg>
        {!values.length && (
          <div className="chart-unavailable">
            <span>Aucune observation disponible</span>
          </div>
        )}
        {hover !== null && dates[hover] && values.length > 0 && (
          <div
            className="chart-tooltip"
            style={{
              ...(hover / (dates.length - 1 || 1) > 0.5
                ? { left: 8 }
                : { right: 8 }),
            }}
          >
            <strong>{dates[hover]}</strong>
            {lookup.map((s) => (
              <div key={s.id}>
                <span style={{ color: s.color }}>● {s.label}</span>
                <b>
                  {s.map.has(dates[hover])
                    ? formatValue(s.map.get(dates[hover])!, unit)
                    : "—"}
                </b>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="chart-legend">
        {series.map((s) => (
          <button
            aria-pressed={!hidden.includes(s.id)}
            key={s.id}
            style={{ opacity: hidden.includes(s.id) ? 0.35 : 1 }}
            onClick={() => {
              setHidden((h) =>
                h.includes(s.id) ? h.filter((k) => k !== s.id) : [...h, s.id],
              );
              setHover(null);
            }}
          >
            <i style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>
      {size < allDates.length && (
        <label className="chart-pan">
          Déplacer la période
          <input
            aria-label="Déplacer la période du graphique"
            type="range"
            min="0"
            max={allDates.length - size}
            value={offset}
            onChange={(e) => {
              setOffset(+e.target.value);
              setHover(null);
            }}
          />
        </label>
      )}
    </div>
  );
}
