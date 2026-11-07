import { test, expect, type Page, type Locator } from "@playwright/test";
import { demoData } from "../lib/demo";
import { countries, indicators } from "../lib/data";
const fixture = demoData();
fixture.macro.diagnostics = indicators.map((i) => ({
  key: i.key,
  code: i.id,
  status: "ok",
  countries: countries.map((c) => c.code),
  observations: countries.length * 20,
  updatedAt: "2026-01-01",
}));
async function mount(page: Page) {
  await page.route("**/api/terminal?section=*", (route) => {
    const section = new URL(route.request().url()).searchParams.get(
      "section",
    ) as keyof typeof fixture;
    return route.fulfill({ json: fixture[section] });
  });
  await page.goto("/");
  await expect(page.getByText("4 sources connectées")).toBeVisible();
}
async function checkPoints(page: Page, chart: Locator) {
  const points = await chart
    .locator("[data-series]")
    .first()
    .locator("circle[data-date]")
    .evaluateAll((circles) =>
      circles.map((circle) => {
        const svg = circle.closest("svg")!;
        const point = new DOMPoint(
          Number(circle.getAttribute("cx")),
          Number(circle.getAttribute("cy")),
        ).matrixTransform(svg.getScreenCTM()!);
        return {
          date: circle.getAttribute("data-date")!,
          x: point.x,
          y: point.y,
        };
      }),
    );
  expect(points.length).toBeGreaterThan(1);
  for (const point of points) {
    await page.mouse.move(point.x, point.y);
    await expect(chart.locator(".chart-selection")).toHaveAttribute(
      "data-date",
      point.date,
    );
    await expect(chart.locator(".chart-tooltip strong")).toHaveText(point.date);
    const line = await chart.locator(".chart-selection line").evaluate((el) => {
      const svg = el.closest("svg")!;
      return new DOMPoint(
        Number(el.getAttribute("x1")),
        Number(el.getAttribute("y1")),
      ).matrixTransform(svg.getScreenCTM()!).x;
    });
    expect(Math.abs(line - point.x)).toBeLessThan(1);
  }
}
test("Survol exact de chaque point à quatre largeurs, après zoom et transformation CSS", async ({
  page,
}) => {
  await mount(page);
  const chart = page.locator(".macro-comparison").first();
  await chart.getByRole("button", { name: "20A", exact: true }).click();
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.waitForTimeout(300);
    await chart.scrollIntoViewIfNeeded();
    await checkPoints(page, chart);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await chart.scrollIntoViewIfNeeded();
  await chart.getByRole("button", { name: "Zoom avant", exact: true }).click();
  await chart.getByRole("slider").fill("2");
  await checkPoints(page, chart);
  await chart.evaluate((el) => {
    (el as HTMLElement).style.transform = "scale(0.85)";
    (el as HTMLElement).style.transformOrigin = "top left";
  });
  await checkPoints(page, chart);
  const svg = chart.locator(".interactive-canvas svg");
  await svg.focus();
  await page.keyboard.press("End");
  const lastDate = await chart
    .locator("[data-series]")
    .first()
    .locator("circle[data-date]")
    .last()
    .getAttribute("data-date");
  await expect(chart.locator(".chart-selection")).toHaveAttribute(
    "data-date",
    lastDate!,
  );
});
test("Tous les indicateurs peuvent être sélectionnés et les courbes réactivées", async ({
  page,
}) => {
  await mount(page);
  const chart = page.locator(".macro-comparison").first();
  for (const indicator of indicators) {
    await chart.getByRole("combobox").selectOption(indicator.key);
    await expect(chart.getByRole("heading")).toHaveText(
      `${indicator.label} · comparaison`,
    );
    await expect(chart.locator("[data-series]")).toHaveCount(4);
    const latest = await chart
      .locator("[data-series]")
      .first()
      .locator("circle[data-date]")
      .last()
      .getAttribute("data-date");
    expect(latest).toBe("2024");
  }
  for (const button of await chart.locator(".chart-legend button").all())
    await button.click();
  await expect(
    chart.getByText("Toutes les séries sont masquées"),
  ).toBeVisible();
  await expect(
    chart.getByRole("button", { name: "Exporter le graphique en CSV" }),
  ).toBeDisabled();
  await chart.getByRole("button", { name: "Réafficher les courbes" }).click();
  await expect(chart.locator("[data-series]")).toHaveCount(4);
  const downloadEvent = page.waitForEvent("download");
  await chart
    .getByRole("button", { name: "Exporter le graphique en CSV" })
    .click();
  expect((await downloadEvent).suggestedFilename()).toBe(
    "macro-historique.csv",
  );
});
test("La fiche synchronise sélection, historique et contexte ; les comparaisons restent sélectionnées", async ({
  page,
}) => {
  await mount(page);
  await page.goto("/devises/USD");
  await page
    .getByRole("button", { name: "Croissance & PIB", exact: true })
    .click();
  const chart = page.locator(".macro-comparison");
  await chart.getByRole("combobox").selectOption("gdpPerCapita");
  await expect(
    page.getByRole("heading", { name: "Historique · PIB par habitant" }),
  ).toBeVisible();
  await expect(page.locator(".metric-detail.selected")).toContainText(
    "PIB par habitant",
  );
  await chart
    .locator(".country-chips")
    .getByRole("button", { name: "GBP", exact: false })
    .click();
  await page
    .locator(".metric-detail")
    .filter({ hasText: "Consommation des ménages" })
    .click();
  await expect(
    chart
      .locator(".country-chips")
      .getByRole("button", { name: "GBP", exact: false }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("heading", {
      name: "Historique · Consommation des ménages",
    }),
  ).toBeVisible();
  for (const country of countries) {
    await page.goto(`/devises/${country.currency}`);
    await expect(page.locator(".profile-hero h1")).toContainText(
      country.currency,
    );
    await expect(
      page.locator(".metric-detail").first().locator("strong"),
    ).not.toHaveText("—");
  }
  await page.goto("/devises/USD");
  await page.getByRole("button", { name: "Devise", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Devise de comparaison" })
    .selectOption("JPY");
  const svg = page.locator(".interactive-canvas svg");
  const dot = await page
    .locator("[data-series] circle[data-date]")
    .last()
    .evaluate((el) => {
      const p = new DOMPoint(
        Number(el.getAttribute("cx")),
        Number(el.getAttribute("cy")),
      ).matrixTransform(el.closest("svg")!.getScreenCTM()!);
      return { x: p.x, y: p.y };
    });
  await svg.dispatchEvent("pointerdown", {
    clientX: dot.x,
    clientY: dot.y,
    pointerType: "touch",
  });
  await expect(page.locator(".chart-selection")).toBeVisible();
});
test("Navigation retour, recherche indépendante, conversion et date du calendrier", async ({
  page,
}) => {
  await mount(page);
  await page
    .getByRole("button", { name: "Pays & économies", exact: true })
    .click();
  await expect(page).toHaveURL(/vue=countries/);
  await page
    .getByRole("textbox", { name: "Rechercher un pays" })
    .fill("Canada");
  await page
    .getByRole("button", { name: "Rechercher un pays, une devise…" })
    .click();
  await page
    .getByPlaceholder("Rechercher un pays, une devise ou une banque…")
    .fill("Japon");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("textbox", { name: "Rechercher un pays" }),
  ).toHaveValue("Canada");
  await page.getByRole("row").filter({ hasText: "Canada" }).click();
  await expect(page).toHaveURL(/devises\/CAD/);
  await page.goBack();
  await expect(page).toHaveURL(/vue=countries/);
  await expect(
    page.getByRole("heading", { name: "Chaque économie. Une vision globale." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Devises & marchés", exact: true })
    .click();
  await page.getByRole("spinbutton", { name: "Montant à convertir" }).fill("");
  await expect(page.locator(".conversion-result strong")).toHaveText("—");
  await page
    .getByRole("spinbutton", { name: "Montant à convertir" })
    .fill("-10");
  await expect(page.locator(".conversion-result strong")).toHaveText("—");
  await page
    .getByRole("button", { name: "Calendrier économique", exact: true })
    .click();
  const date = new Date(fixture.calendar.data[0].date).toLocaleDateString(
    "en-CA",
    { timeZone: "Europe/Paris" },
  );
  await page.getByLabel("Choisir la date du calendrier").fill(date);
  await expect(page.locator(".economic-table tbody tr").first()).toBeVisible();
});
test("Une panne d’actualisation ne vide pas les données et la matrice contrôle 22 × 12 observations", async ({
  page,
}) => {
  await mount(page);
  await page.route("**/api/terminal?section=*", (route) =>
    route.fulfill({ status: 503, json: { error: "upstream down" } }),
  );
  await page.getByRole("button", { name: "Actualiser", exact: true }).click();
  await expect(
    page.getByText(
      "Dernières données conservées · actualisation indisponible.",
    ),
  ).toBeVisible();
  await expect(
    page.locator(".macro-comparison").first().locator("[data-series]"),
  ).toHaveCount(4);
  await page.unroute("**/api/terminal?section=*");
  await page.route("**/api/terminal?section=*", (route) =>
    route.fulfill({
      json: fixture[
        new URL(route.request().url()).searchParams.get(
          "section",
        ) as keyof typeof fixture
      ],
    }),
  );
  await page.goto("/donnees");
  await expect(page.locator(".quality-table tbody tr")).toHaveCount(22);
  await expect(page.locator(".quality-table tbody td.quality-ok")).toHaveCount(
    264,
  );
});
test("L’infobulle des douze économies reste dans le graphique sur mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await mount(page);
  const chart = page.locator(".macro-comparison").first();
  while (
    await chart.locator('.country-chips button[aria-pressed="false"]').count()
  )
    await chart
      .locator('.country-chips button[aria-pressed="false"]')
      .first()
      .click();
  await chart.scrollIntoViewIfNeeded();
  const point = await chart
    .locator("[data-series]")
    .first()
    .locator("circle[data-date]")
    .last()
    .evaluate((el) => {
      const p = new DOMPoint(
        Number(el.getAttribute("cx")),
        Number(el.getAttribute("cy")),
      ).matrixTransform(el.closest("svg")!.getScreenCTM()!);
      return { x: p.x, y: p.y };
    });
  await chart.locator(".interactive-canvas svg").dispatchEvent("pointerdown", {
    clientX: point.x,
    clientY: point.y,
    pointerType: "touch",
  });
  await expect(chart.locator(".chart-tooltip>div")).toHaveCount(12);
  await expect
    .poll(async () => {
      const box = await chart.locator(".chart-tooltip").boundingBox();
      const canvas = await chart.locator(".interactive-canvas").boundingBox();
      return (
        !!box &&
        !!canvas &&
        box.x >= canvas.x &&
        box.y >= canvas.y &&
        box.x + box.width <= canvas.x + canvas.width + 1 &&
        box.y + box.height <= canvas.y + canvas.height + 1
      );
    })
    .toBe(true);
  await page.screenshot({
    path: "/tmp/macro-mobile-tooltip.png",
    fullPage: false,
  });
});
