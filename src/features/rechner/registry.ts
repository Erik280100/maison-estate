import type { ComponentType } from "react";
import { AnkaufVerkaufRechner } from "./AnkaufVerkaufRechner";
import { KreditRechner } from "./KreditRechner";
import { MieteRechner } from "./MieteRechner";
import { UmschuldungsRechner } from "./UmschuldungsRechner";

export type Rechner = {
  slug: string;
  title: string;
  description: string;
  Component: ComponentType;
};

/**
 * Neue Rechner: Komponente unter src/features/rechner/ anlegen ("use client")
 * und hier eintragen. Sie erscheinen automatisch im internen Bereich.
 */
export const rechner: Rechner[] = [
  {
    slug: "kredit",
    title: "Finanzierungsrechner",
    description:
      "Kauf- und Kreditnebenkosten, Kreditbetrag, Tilgungsplan, Effektivzins und AfA – optional mit FLV als Tilgungsträger.",
    Component: KreditRechner,
  },
  {
    slug: "ankauf-verkauf",
    title: "Ankauf, Sanierung & Verkauf",
    description:
      "Ankauf mit Nebenkosten, Sanierung nach Gewerken, Finanzierung, Verkauf – Marge, Liquiditätsplan, Stresstest, Bewertung, Vergleichsobjekte, Freigaben, Plan/Ist, Portfolio und PDF-Akte.",
    Component: AnkaufVerkaufRechner,
  },
  {
    slug: "umschuldung",
    title: "Umschuldungsrechner",
    description: "Vergleich einer bestehenden Finanzierung mit einer Umschuldung.",
    Component: UmschuldungsRechner,
  },
  {
    slug: "mietrechner",
    title: "Mietrechner",
    description: "Mietrendite, Cashflow und Ratendeckung für Bestandsobjekte inkl. PDF/Excel-Export.",
    Component: MieteRechner,
  },
];
