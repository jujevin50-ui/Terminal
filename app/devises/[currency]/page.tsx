import { notFound } from "next/navigation";
import { countries } from "@/lib/data";
import EconomicProfile from "@/app/components/economic-profile";
export function generateStaticParams() {
  return countries.map((c) => ({ currency: c.currency }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ currency: string }>;
}) {
  const { currency } = await params;
  const country = countries.find((c) => c.currency === currency);
  return { title: country ? `${currency} · ${country.name} — Macro` : "Macro" };
}
export default async function Page({
  params,
}: {
  params: Promise<{ currency: string }>;
}) {
  const { currency } = await params;
  const country = countries.find((c) => c.currency === currency);
  if (!country) notFound();
  return <EconomicProfile country={country} />;
}
