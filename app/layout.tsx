import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

/* Fraunces : l'affiche de théâtre — serif variable avec optical
   sizing, il donne au portfolio sa voix scénique. */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["opsz"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Luc — Développeur Full-Stack",
    template: "%s — Luc",
  },
  description:
    "Le portfolio-théâtre de Luc, développeur full-stack : chaque projet est une porte à ouvrir — architecture, données, interface, déploiement, et un assistant IA qui souffle les réponses.",
  openGraph: {
    title: "Luc — Le Couloir des Merveilles Cachées",
    description: "Chaque projet est une porte. Ouvrez-la.",
    type: "website",
    locale: "fr_FR",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-bg text-ink">{children}</body>
    </html>
  );
}
