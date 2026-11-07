import {
  getNews,
  getCalendar,
  getFx,
  getMacro,
  getIndicatorCatalog,
} from "@/lib/feeds";
export const maxDuration = 60;
export async function GET(request: Request) {
  const section = new URL(request.url).searchParams.get("section");
  const handlers = {
    news: getNews,
    calendar: getCalendar,
    fx: getFx,
    macro: getMacro,
    catalog: getIndicatorCatalog,
  };
  if (!section || !(section in handlers))
    return Response.json({ error: "Section inconnue" }, { status: 400 });
  const result = await handlers[section as keyof typeof handlers]();
  return Response.json(result, {
    headers: {
      "Cache-Control":
        result.status === "ok"
          ? "public, s-maxage=60, stale-while-revalidate=120"
          : "no-store",
    },
  });
}
