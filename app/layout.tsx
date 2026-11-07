import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ATLAS — Terminal macroéconomique",
  description:
    "Votre vision globale des économies, des devises et des événements qui font les marchés. Terminal public, sans compte.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
