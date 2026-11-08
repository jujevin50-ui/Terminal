"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { cadence } from "@/lib/cadence";
import { type TerminalData, type Feed } from "@/lib/data";
import {
  retainLastGood,
  retainMacroSeries,
  retainReleases,
  retainPolicyRates,
} from "@/lib/feed-state";
const initial: TerminalData = {
  news: { status: "error", data: [], fetchedAt: "" },
  calendar: { status: "error", data: [], fetchedAt: "" },
  macro: { status: "error", data: {}, fetchedAt: "" },
  fx: { status: "error", data: null, fetchedAt: "" },
  rates: { status: "error", data: {}, fetchedAt: "" },
  recent: { status: "error", data: { series: [], errors: [] }, fetchedAt: "" },
};
type Key = keyof TerminalData;
const keys = Object.keys(cadence) as Key[];
export function useTerminalFeeds() {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [refreshAt, setRefreshAt] = useState("");
  const pending = useRef(new Map<Key, Promise<void>>());
  const mounted = useRef(true);
  const controllers = useRef(new Set<AbortController>());
  const refresh = useCallback(async (sections: Key[] = keys) => {
    if (mounted.current) setLoading(true);
    await Promise.all(
      sections.map((section) => {
        const existing = pending.current.get(section);
        if (existing) return existing;
        const controller = new AbortController();
        controllers.current.add(controller);
        const request = (async () => {
          let result: Feed<unknown>;
          try {
            const response = await fetch(`/api/terminal?section=${section}`, {
              signal: AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(55000),
              ]),
            });
            if (!response.ok) throw new Error("HTTP " + response.status);
            result = await response.json();
            if (!["ok", "error"].includes(result.status) || !("data" in result))
              throw new Error("Réponse invalide");
            if (
              (section === "news" || section === "calendar") &&
              !Array.isArray(result.data)
            )
              throw new Error("Liste invalide");
            if (
              section === "recent" &&
              (!result.data ||
                !Array.isArray(
                  (result.data as import("@/lib/releases").ReleaseData).series,
                ))
            )
              throw new Error("Conjoncture invalide");
            if (
              section === "rates" &&
              (!result.data ||
                typeof result.data !== "object" ||
                Array.isArray(result.data))
            )
              throw new Error("Taux invalides");
            if (
              section === "macro" &&
              (!result.data ||
                typeof result.data !== "object" ||
                Array.isArray(result.data))
            )
              throw new Error("Macro invalide");
          } catch {
            if (controller.signal.aborted) return;
            result = {
              ...initial[section],
              status: "error",
              error: "Actualisation indisponible",
            };
          }
          if (mounted.current)
            setData((old) => ({
              ...old,
              [section]:
                section === "macro"
                  ? retainMacroSeries(
                      old.macro,
                      result as TerminalData["macro"],
                    )
                  : section === "recent"
                    ? retainReleases(
                        old.recent,
                        result as TerminalData["recent"],
                      )
                    : section === "rates"
                      ? retainPolicyRates(
                          old.rates,
                          result as TerminalData["rates"],
                        )
                      : retainLastGood(old[section] as Feed<unknown>, result),
            }));
        })().finally(() => {
          if (pending.current.get(section) === request)
            pending.current.delete(section);
          controllers.current.delete(controller);
        });
        pending.current.set(section, request);
        return request;
      }),
    );
    if (mounted.current) {
      setLoading(pending.current.size > 0);
      setRefreshAt(new Date().toISOString());
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    refresh();
    const intervals = keys.map((key) =>
      setInterval(() => {
        if (document.visibilityState === "visible" && navigator.onLine)
          refresh([key]);
      }, cadence[key].poll),
    );
    const resume = () => {
      if (document.visibilityState === "visible" && navigator.onLine) refresh();
    };
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("online", resume);
    window.addEventListener("focus", resume);
    return () => {
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("online", resume);
      window.removeEventListener("focus", resume);
      mounted.current = false;
      intervals.forEach(clearInterval);
      controllers.current.forEach((c) => c.abort());
      pending.current.clear();
    };
  }, [refresh]);
  return { data, loading, refresh, refreshAt };
}
