export type Frequency = "D" | "M" | "Q" | "S" | "A";
export const frequencyLabels: Record<Frequency, string> = {
  D: "Quotidien",
  M: "Mensuel",
  Q: "Trimestriel",
  S: "Semestriel",
  A: "Annuel",
};
export const cadence = {
  news: {
    poll: 60000,
    ttl: 60,
    label: "Actualités",
    publication: "Selon publication des éditeurs",
  },
  calendar: {
    poll: 60000,
    ttl: 300,
    label: "Calendrier",
    publication: "Selon mise à jour du fournisseur",
  },
  fx: {
    poll: 900000,
    ttl: 900,
    label: "Changes",
    publication: "Références quotidiennes, jours ouvrés",
  },
  macro: {
    poll: 3600000,
    ttl: 3600,
    label: "Historique structurel",
    publication: "Statistiques annuelles",
  },
  rates: {
    poll: 60000,
    ttl: 300,
    label: "Taux directeurs",
    publication: "Selon décision ; délai propre à la source",
  },
  recent: {
    poll: 300000,
    ttl: 900,
    label: "Conjoncture",
    publication: "Mensuelle, trimestrielle ou quotidienne selon série",
  },
} as const;
export function periodLabel(date: string, frequency: Frequency) {
  const year = date.slice(0, 4),
    month = +date.slice(5, 7);
  return frequency === "A"
    ? year
    : frequency === "Q"
      ? `T${Math.floor((month - 1) / 3) + 1} ${year}`
      : frequency === "S"
        ? `S${month <= 6 ? 1 : 2} ${year}`
        : new Date(`${date.slice(0, 10)}T12:00:00Z`).toLocaleDateString(
            "fr-FR",
            frequency === "M"
              ? { month: "short", year: "numeric", timeZone: "UTC" }
              : {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  timeZone: "UTC",
                },
          );
}
export function observationAge(date: string, now = new Date()) {
  const value = Date.parse(
    date.length === 4
      ? `${date}-12-31T23:59:59Z`
      : `${date.slice(0, 10)}T23:59:59Z`,
  );
  return Number.isFinite(value)
    ? Math.max(0, Math.floor((now.getTime() - value) / 86400000))
    : null;
}
export function delayed(date: string, frequency: Frequency, now = new Date()) {
  const age = observationAge(date, now);
  return (
    age !== null && age > { D: 7, M: 100, Q: 230, S: 410, A: 800 }[frequency]
  );
}
/** Inclusive window anchored to the latest published period (12 months = 12 observations). */
export function recentCutoff(
  last: string,
  frequency: Frequency,
  years: number,
) {
  const year = Number(last.slice(0, 4)),
    month = Number(last.slice(5, 7)) - 1;
  const span = frequency === "Q" ? 3 : frequency === "S" ? 6 : 1;
  return new Date(Date.UTC(year, month - years * 12 + span, 1))
    .toISOString()
    .slice(0, 10);
}
