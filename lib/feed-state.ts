import { type Feed } from "./data";
export function retainLastGood<T>(
  previous: Feed<T> | undefined,
  incoming: Feed<T>,
): Feed<T> {
  return incoming.status === "error" && previous?.status === "ok"
    ? {
        ...previous,
        stale: true,
        error: incoming.error ?? "Actualisation indisponible",
      }
    : incoming;
}
export function retainMacroSeries(
  previous: Feed<import("./data").Macro>,
  incoming: Feed<import("./data").Macro>,
): Feed<import("./data").Macro> {
  if (incoming.status === "error")
    return {
      ...retainLastGood(previous, incoming),
      diagnostics: incoming.diagnostics ?? previous.diagnostics,
    };
  const merged: import("./data").Macro = Object.fromEntries(
    Object.entries(incoming.data).map(([country, series]) => [
      country,
      { ...series },
    ]),
  );
  let retained = false;
  for (const diagnostic of incoming.diagnostics ?? []) {
    if (diagnostic.status !== "error") continue;
    for (const [country, series] of Object.entries(previous.data)) {
      const old = series[diagnostic.key];
      if (old && !merged[country]?.[diagnostic.key]) {
        merged[country] ??= {};
        merged[country][diagnostic.key] = old;
        retained = true;
      }
    }
  }
  return { ...incoming, data: merged, ...(retained ? { stale: true } : {}) };
}
export function retainReleases(
  previous: Feed<import("./releases").ReleaseData>,
  incoming: Feed<import("./releases").ReleaseData>,
) {
  if (incoming.status === "error")
    return {
      ...retainLastGood(previous, incoming),
      data: { ...previous.data, errors: incoming.data.errors },
    };
  const rows = [...incoming.data.series];
  let retained = false;
  for (const error of incoming.data.errors) {
    const old = previous.data.series.find(
      (s) => s.country === error.country && s.key === error.key,
    );
    if (
      old &&
      !rows.some((s) => s.country === old.country && s.key === old.key)
    ) {
      rows.push(old);
      retained = true;
    }
  }
  return {
    ...incoming,
    data: { ...incoming.data, series: rows },
    ...(retained ? { stale: true } : {}),
  };
}
export function retainPolicyRates(
  previous: Feed<Record<string, import("./releases").PolicyRate>>,
  incoming: Feed<Record<string, import("./releases").PolicyRate>>,
) {
  if (incoming.status === "error") return retainLastGood(previous, incoming);
  const missing = Object.keys(previous.data).filter(
    (code) => !incoming.data[code],
  );
  return {
    ...incoming,
    data: { ...previous.data, ...incoming.data },
    ...(missing.length ? { stale: true } : {}),
  };
}
