import type { ComponentType } from "react";
import { AnkaufVerkaufRechner } from "./AnkaufVerkaufRechner";
import { KreditRechner } from "./KreditRechner";
import { MieteRechner } from "./MieteRechner";

export type Rechner = {
  slug: string;
  title: string;
  description: string;
  /** React-Komponente ODER eigenständige HTML-Datei aus public/rechner/ */
  Component?: ComponentType;
  htmlFile?: string;
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
      "Ankauf mit Nebenkosten, Sanierung nach Gewerken, Zinsen und Tilgung über die Haltedauer, Verkauf mit Provision – Gewinn, Marge und Rendite p. a.",
    Component: AnkaufVerkaufRechner,
  },
  {
    slug: "umschuldung",
    title: "Umschuldungsrechner",
    description: "Vergleich einer bestehenden Finanzierung mit einer Umschuldung.",
    htmlFile: "umschuldung.html",
  },
  {
    slug: "fix-und-flip",
    title: "Fix & Flip / Margenrechner",
    description:
      "Marge, Gewinn und Rendite für Kauf, Sanierung und Verkauf inkl. Portfolio und PDF.",
    htmlFile: "fix-und-flip.html",
  },
  {
    slug: "mietrechner",
    title: "Mietrechner",
    description: "Mietrendite, Cashflow und DSCR für Bestandsobjekte inkl. PDF/Excel-Export.",
    Component: MieteRechner,
  },
];
