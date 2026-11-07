import { countries, indicators, type TerminalData } from "./data";
export function demoData(): TerminalData {
  const now = new Date();
  const iso = now.toISOString();
  const rates = {
    USD: 1,
    EUR: 0.9213,
    GBP: 0.7736,
    JPY: 149.82,
    CNY: 7.246,
    CAD: 1.3812,
    AUD: 1.5284,
    CHF: 0.8804,
    NZD: 1.6632,
    INR: 84.12,
    BRL: 5.72,
    ZAR: 17.94,
  };
  const history = Array.from({ length: 65 }, (_, i) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (64 - i));
    return {
      date: date.toISOString().slice(0, 10),
      rates: Object.fromEntries(
        Object.entries(rates).map(([k, v]) => [
          k,
          k === "USD"
            ? 1
            : v *
              (1 +
                Math.sin(i * 0.29) * 0.006 +
                Math.cos(i * 0.71) * 0.003 +
                (64 - i) * 0.0003),
        ]),
      ),
    };
  });
  const titles = [
    "Les investisseurs scrutent la trajectoire des taux avant les prochaines publications",
    "Inflation : les prix des services restent au centre de l’attention",
    "Zone euro : les indicateurs d’activité donnent des signaux contrastés",
    "Le yen évolue au rythme des anticipations de politique monétaire",
    "Les marchés obligataires se préparent aux chiffres de l’emploi",
    "Commerce mondial : la demande asiatique sous surveillance",
    "Les banques centrales à l’épreuve d’un cycle économique contrasté",
    "Matières premières : l’énergie au cœur des perspectives d’inflation",
  ];
  const news = titles.map((title, i) => ({
    title,
    url: "",
    source: "Exemple de dépêche",
    date: new Date(+now - i * 1260000).toISOString(),
    category: i % 3 === 1 ? "Banques centrales" : "Économie",
  }));
  const events = [
    "Emploi non agricole",
    "Taux de chômage",
    "Indice des prix à la consommation",
    "Discours de la présidence BCE",
    "Confiance des consommateurs",
    "Balance commerciale",
    "Production industrielle",
    "Décision de taux",
  ];
  const calendar = events.map((title, i) => ({
    title,
    country: ["USD", "USD", "EUR", "EUR", "GBP", "CNY", "JPY", "AUD"][i],
    date: new Date(+now + (i - 2) * 3600000).toISOString(),
    impact: i % 3 === 0 ? "High" : i % 3 === 1 ? "Medium" : "Low",
    forecast: i === 3 ? "" : "2,8 %",
    previous: i === 3 ? "" : "3,1 %",
    actual: i < 2 ? "2,9 %" : "",
  }));
  const macro = Object.fromEntries(
    countries.map((c, i) => [
      c.code,
      {
        growth: {
          value: [2.8, 0.9, 1.1, 0.1, 5, 1.5, 1.1, 1.3, 1, 6.5, 3.4, 0.6][i],
          year: "2024",
        },
        inflation: {
          value: [2.9, 2.4, 2.5, 2.7, 0.2, 2.4, 3.2, 1.1, 2.9, 4.9, 4.4, 4.4][
            i
          ],
          year: "2024",
        },
        unemployment: {
          value: [4.1, 6.3, 4.4, 2.5, 4.6, 6.4, 4.1, 4.4, 4.8, 4.2, 6.8, 32.1][
            i
          ],
          year: "2024",
        },
        gdp: {
          value: (i === 0 ? 29.2 : i === 1 ? 15.5 : 5.1 - i * 0.31) * 1e12,
          year: "2024",
        },
        balance: { value: i % 2 ? 2.1 : -3.4, year: "2024" },
        population: { value: (i + 1) * 16.1e6, year: "2024" },
      },
    ]),
  );
  for (const [code, observations] of Object.entries(macro)) {
    for (const indicator of indicators) {
      const existing = observations[indicator.key as keyof typeof observations];
      const value = existing?.value ?? (indicator.unit === "$" ? 45000 : 15);
      (observations as Record<string, import("./data").Observation>)[
        indicator.key
      ] = {
        value,
        year: "2024",
        history: Array.from({ length: 20 }, (_, i) => ({
          year: String(2005 + i),
          value:
            i === 19
              ? value
              : indicator.key === "growth" && i === 15
                ? -5
                : value * (0.75 + (i * 0.25) / 19) +
                  Math.sin(
                    i * 0.8 + countries.findIndex((c) => c.code === code),
                  ) *
                    (indicator.unit === "$" ? value * 0.04 : 1.5),
        })),
      };
    }
  }
  return {
    news: { status: "ok", data: news, fetchedAt: iso },
    calendar: { status: "ok", data: calendar, fetchedAt: iso },
    fx: {
      status: "ok",
      data: { date: iso.slice(0, 10), base: "USD", rates, history },
      fetchedAt: iso,
    },
    macro: { status: "ok", data: macro, fetchedAt: iso },
  };
}
