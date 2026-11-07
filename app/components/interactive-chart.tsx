"use client";
import {
  useId,
  useState,
  useEffect,
  useRef,
  useMemo,
  type PointerEvent,
} from "react";
import { Download, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import {
  axisPrecision,
  datePositions,
  nearestPoint,
  visibleWindow,
} from "@/lib/chart";
export type ChartSeries = {
  id: string;
  label: string;
  color: string;
  points: { date: string; value: number }[];
};
export function formatValue(n: number, unit = "%", compact = false) {
  return (
    new Intl.NumberFormat("fr-FR", {
      maximumFractionDigits: compact
        ? 2
        : unit === "$"
          ? 0
          : ["%", "", "indice"].includes(unit)
            ? 2
            : 5,
      ...(compact ? { notation: "compact" as const } : {}),
    }).format(n) + (unit ? ` ${unit}` : "")
  );
}
type Props = {
  series: ChartSeries[];
  unit?: string;
  height?: number;
  label?: string;
};
export default function InteractiveChart(props: Props) {
  const signature = props.series
    .map((s) => `${s.id}:${s.points.map((p) => p.date).join(",")}`)
    .join("|");
  return <ChartPlot key={signature} {...props} />;
}
function ChartPlot({
  series,
  unit = "%",
  height = 300,
  label = "Comparaison historique",
}: Props) {
  const id = useId();
  const container = useRef<HTMLDivElement>(null);
  const tooltip = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(800);
  const [canvasHeight, setCanvasHeight] = useState(height);
  const [tooltipSize, setTooltipSize] = useState({ width: 190, height: 100 });
  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(200, entry.contentRect.width));
      setCanvasHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const [hidden, setHidden] = useState<string[]>([]);
  const [hover, setHover] = useState<number | null>(null);
  const [windowSize, setWindowSize] = useState(0);
  const [start, setStart] = useState(0);
  const [pointerY, setPointerY] = useState(100);
  const normalized = useMemo(
    () =>
      series.map((s) => ({
        ...s,
        points: s.points
          .filter((p) => Number.isFinite(p.value))
          .sort((a, b) => a.date.localeCompare(b.date)),
      })),
    [series],
  );
  const allDates = useMemo(
    () =>
      [
        ...new Set(normalized.flatMap((s) => s.points.map((p) => p.date))),
      ].sort(),
    [normalized],
  );
  const window = visibleWindow(allDates.length, windowSize, start);
  const dates = allDates.slice(window.start, window.end);
  const active = normalized.filter((s) => !hidden.includes(s.id));
  const values = active.flatMap((s) =>
    s.points.filter((p) => dates.includes(p.date)).map((p) => p.value),
  );
  const lo = values.length ? Math.min(...values) : 0,
    hi = values.length ? Math.max(...values) : 1;
  const pad = (hi - lo) * 0.12 || Math.abs(lo) * 0.03 || 0.1;
  const min = lo - pad,
    max = hi + pad;
  const left = 18,
    right = width - 76;
  const positions = datePositions(dates, left, right);
  const y = (v: number) => 24 + ((max - v) / (max - min)) * 232;
  const lookup = active.map((s) => ({
    ...s,
    map: new Map(s.points.map((p) => [p.date, p.value])),
  }));
  const selectedDate = hover === null ? undefined : dates[hover];
  useEffect(() => {
    const el = tooltip.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setTooltipSize({
        width: entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width,
        height: entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height,
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [selectedDate, active.length]);
  function hit(e: PointerEvent<SVGSVGElement>) {
    const matrix = e.currentTarget.getScreenCTM();
    if (!matrix) return;
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      matrix.inverse(),
    );
    if (
      point.x < left - 5 ||
      point.x > right + 5 ||
      point.y < 12 ||
      point.y > 262 ||
      !values.length
    ) {
      setHover(null);
      return;
    }
    setHover(nearestPoint(positions, point.x));
    setPointerY(
      (point.y / 300) * e.currentTarget.getBoundingClientRect().height,
    );
  }
  function zoom(inward: boolean) {
    const size = Math.min(
      allDates.length,
      Math.max(2, Math.round(window.size * (inward ? 0.7 : 1.4))),
    );
    const anchor = window.start + (hover ?? Math.floor(window.size / 2));
    const next = visibleWindow(
      allDates.length,
      size,
      Math.round(anchor - size / 2),
    );
    setWindowSize(size);
    setStart(next.start);
    setHover(null);
  }
  function download() {
    const rows = [
      ["Date", ...active.map((s) => `${s.label}${unit ? ` (${unit})` : ""}`)],
      ...dates.map((date) => [
        date,
        ...active.map(
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
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const selectedX = hover === null ? 0 : (positions[hover] ?? 0);
  const tooltipLeft = Math.max(
    4,
    Math.min(
      width - tooltipSize.width - 4,
      selectedX + (selectedX > width / 2 ? -tooltipSize.width - 15 : 15),
    ),
  );
  const tooltipTop = Math.max(
    4,
    Math.min(
      canvasHeight - tooltipSize.height - 4,
      pointerY - tooltipSize.height / 2,
    ),
  );
  return (
    <div className="interactive-chart">
      <div className="chart-tools">
        <span>
          {label}
          {unit && <small className="chart-unit"> · {unit}</small>}
        </span>
        <div>
          <button
            title="Zoom avant"
            aria-label="Zoom avant"
            disabled={window.size <= 2 || !values.length}
            onClick={() => zoom(true)}
          >
            <ZoomIn size={15} />
          </button>
          <button
            title="Zoom arrière"
            aria-label="Zoom arrière"
            disabled={window.size === allDates.length}
            onClick={() => zoom(false)}
          >
            <ZoomOut size={15} />
          </button>
          <button
            title="Réinitialiser"
            aria-label="Réinitialiser le graphique"
            onClick={() => {
              setWindowSize(0);
              setStart(0);
              setHidden([]);
              setHover(null);
            }}
          >
            <RotateCcw size={14} />
          </button>
          <button
            title="Exporter la période et les séries visibles"
            aria-label="Exporter le graphique en CSV"
            disabled={!values.length}
            onClick={download}
          >
            <Download size={15} />
          </button>
        </div>
      </div>
      <div ref={container} className="interactive-canvas" style={{ height }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} 300`}
          preserveAspectRatio="none"
          role="img"
          aria-label={label}
          tabIndex={0}
          onKeyDown={(e) => {
            if (
              ["ArrowRight", "ArrowLeft", "Home", "End"].includes(e.key) &&
              dates.length
            ) {
              e.preventDefault();
              setHover((i) =>
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? dates.length - 1
                    : Math.max(
                        0,
                        Math.min(
                          dates.length - 1,
                          (i ?? (e.key === "ArrowRight" ? -1 : dates.length)) +
                            (e.key === "ArrowRight" ? 1 : -1),
                        ),
                      ),
              );
              setPointerY(80);
            }
            if (e.key === "Escape") setHover(null);
          }}
          onBlur={() => setHover(null)}
          onPointerMove={hit}
          onPointerLeave={(e) => {
            if (e.pointerType !== "touch") setHover(null);
          }}
          onPointerDown={(e) => {
            e.currentTarget.focus({ preventScroll: true });
            hit(e);
          }}
        >
          <defs>
            <clipPath id={id}>
              <rect x={left - 4} y="10" width={right - left + 8} height="252" />
            </clipPath>
          </defs>
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <line
                x1={left}
                x2={right}
                y1={24 + i * 58}
                y2={24 + i * 58}
                stroke="#2c3540"
                strokeDasharray="3 5"
              />
              <text x={right + 10} y={29 + i * 58} fill="#9aabbe" fontSize="11">
                {values.length
                  ? new Intl.NumberFormat("fr-FR", {
                      notation:
                        Math.max(Math.abs(min), Math.abs(max)) >= 100000
                          ? "compact"
                          : "standard",
                      maximumFractionDigits: axisPrecision(min, max),
                    }).format(max - ((max - min) * i) / 4)
                  : "—"}
              </text>
            </g>
          ))}
          {values.length > 0 && min < 0 && max > 0 && (
            <line
              x1={left}
              x2={right}
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
                  return `${command}${positions[i]},${y(v)}`;
                })
                .join(" ");
              return (
                <g key={s.id} data-series={s.id}>
                  <path
                    d={d}
                    stroke={s.color}
                    strokeWidth="2"
                    fill="none"
                    vectorEffect="non-scaling-stroke"
                  />
                  {dates.map((date, i) => {
                    const v = s.map.get(date);
                    return v === undefined ? null : (
                      <circle
                        data-date={date}
                        key={date}
                        cx={positions[i]}
                        cy={y(v)}
                        r={dates.length < 25 ? 2.5 : 0}
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
                i === dates.length - 1 ||
                i %
                  Math.max(
                    1,
                    Math.ceil(dates.length / (width < 500 ? 3 : 6)),
                  ) ===
                  0,
            )
            .filter(
              (date) =>
                date === dates[0] ||
                date === dates.at(-1) ||
                (positions[dates.indexOf(date)] - left >= 45 &&
                  right - positions[dates.indexOf(date)] >= 45),
            )
            .map((date) => (
              <text
                key={date}
                x={positions[dates.indexOf(date)]}
                y="286"
                textAnchor={
                  date === dates[0]
                    ? "start"
                    : date === dates.at(-1)
                      ? "end"
                      : "middle"
                }
                fill="#9aabbe"
                fontSize="11"
              >
                {date.length === 4
                  ? date
                  : new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      timeZone: "UTC",
                    })}
              </text>
            ))}
          {selectedDate && values.length > 0 && (
            <g className="chart-selection" data-date={selectedDate}>
              <line
                x1={selectedX}
                x2={selectedX}
                y1="15"
                y2="260"
                stroke="#d8e0eb"
                strokeDasharray="4 3"
              />
              {lookup.map((s) => {
                const v = s.map.get(selectedDate);
                return v === undefined ? null : (
                  <g key={s.id}>
                    <circle
                      cx={selectedX}
                      cy={y(v)}
                      r="7"
                      fill={s.color}
                      opacity=".2"
                    />
                    <circle
                      cx={selectedX}
                      cy={y(v)}
                      r="4"
                      fill={s.color}
                      stroke="#101720"
                      strokeWidth="2"
                    />
                  </g>
                );
              })}
            </g>
          )}
        </svg>
        {!values.length && (
          <div className="chart-unavailable" role="status">
            <span>
              {series.length === 0
                ? "Sélectionnez une économie"
                : active.length === 0
                  ? "Toutes les séries sont masquées"
                  : "Aucune observation disponible"}
            </span>
            {active.length === 0 && normalized.length > 0 && (
              <button className="text-button" onClick={() => setHidden([])}>
                Réafficher les courbes
              </button>
            )}
          </div>
        )}
        {selectedDate && values.length > 0 && (
          <div
            ref={tooltip}
            className="chart-tooltip"
            style={{ left: tooltipLeft, top: tooltipTop }}
          >
            <strong>
              {selectedDate.length === 4
                ? selectedDate
                : new Date(`${selectedDate}T12:00:00Z`).toLocaleDateString(
                    "fr-FR",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    },
                  )}
            </strong>
            {lookup.map((s) => (
              <div key={s.id}>
                <span style={{ color: s.color }}>● {s.label}</span>
                <b>
                  {s.map.has(selectedDate)
                    ? formatValue(s.map.get(selectedDate)!, unit)
                    : "—"}
                </b>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="chart-legend">
        {normalized.map((s) => (
          <button
            aria-pressed={!hidden.includes(s.id)}
            key={s.id}
            style={{ opacity: hidden.includes(s.id) ? 0.4 : 1 }}
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
      {window.size < allDates.length && (
        <label className="chart-pan">
          <span>
            {dates[0]} — {dates.at(-1)}
          </span>
          <input
            aria-label="Déplacer la période du graphique"
            type="range"
            min="0"
            max={allDates.length - window.size}
            value={window.start}
            onChange={(e) => {
              setStart(+e.target.value);
              setHover(null);
            }}
          />
        </label>
      )}
    </div>
  );
}
