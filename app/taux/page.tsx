"use client";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import PolicyRates from "../components/policy-rates";
import Freshness from "../components/freshness";
import { useTerminalFeeds } from "../hooks/use-terminal-feeds";
export default function RatesPage() {
  const { data, loading, refresh } = useTerminalFeeds();
  return (
    <div className="profile-shell">
      <header className="profile-header">
        <Link className="profile-brand" href="/">
          Macro<span>.</span>
        </Link>
        <Link className="profile-back" href="/">
          <ArrowLeft size={14} /> Terminal
        </Link>
      </header>
      <main className="profile-main">
        <div className="profile-hero">
          <div>
            <span className="eyebrow">BANQUES CENTRALES</span>
            <h1>Taux directeurs</h1>
            <p>
              Références de politique monétaire, dernières observations reçues
              et changements identifiés.
            </p>
          </div>
          <button
            className="outline-button"
            disabled={loading}
            onClick={() => refresh(["rates"])}
          >
            <RefreshCw size={14} /> Actualiser
          </button>
        </div>
        <PolicyRates feed={data.rates} />
        <Freshness data={data} />
      </main>
    </div>
  );
}
