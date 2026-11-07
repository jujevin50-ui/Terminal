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
