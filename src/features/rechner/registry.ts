import type { ComponentType } from "react";
import { AnlegerRechner } from "./AnlegerRechner";
import { AnkaufVerkaufRechner } from "./AnkaufVerkaufRechner";
import { BewertungsRechner } from "./BewertungsRechner";
import { KreditRechner } from "./KreditRechner";
import { MieteRechner } from "./MieteRechner";
import { UmschuldungsRechner } from "./UmschuldungsRechner";

/** Verkauf = für Kundengespräche/Interessenten, Einkauf = interne Ankaufs-/Investitionsentscheidung. */
export type Bereich = "verkauf" | "einkauf";

export const bereiche: Record<Bereich, { label: string; kicker: string; beschreibung: string }> = {
  verkauf: {
    label: "Verkauf",
    kicker: "Rechner · Verkauf",
    beschreibung: "Für Kundengespräche und Interessenten – Finanzierung und Umschuldung.",
  },
  einkauf: {
    label: "Einkauf (intern)",
    kicker: "Rechner · Einkauf (intern)",
    beschreibung: "Nur intern – Ankaufsprüfung, Bewertung und Renditekalkulation.",
  },
};

export type Rechner = {
  slug: string;
  bereich: Bereich;
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
    slug: "anleger",
    bereich: "verkauf",
    title: "Anlegerwohnung",
    description:
      "Mietrendite, Eigenkapitalrendite, Cashflow nach Steuer und AfA für Anleger – optional mit monatlicher Zuzahlung (tilgen, Depot oder FLV) für eine frühere Rückzahlung.",
    Component: AnlegerRechner,
  },
  {
    slug: "kredit",
    bereich: "verkauf",
    title: "Finanzierungsrechner",
    description:
      "Kauf- und Kreditnebenkosten, Kreditbetrag, Tilgungsplan, Effektivzins und AfA – optional mit FLV als Tilgungsträger.",
    Component: KreditRechner,
  },
  {
    slug: "ankauf-verkauf",
    bereich: "einkauf",
    title: "Ankauf, Sanierung & Verkauf",
    description:
      "Ankauf mit Nebenkosten, Sanierung nach Gewerken, Finanzierung, Verkauf – Marge, Liquiditätsplan, Stresstest, Bewertung, Vergleichsobjekte, Freigaben, Plan/Ist, Portfolio und PDF-Akte.",
    Component: AnkaufVerkaufRechner,
  },
  {
    slug: "umschuldung",
    bereich: "verkauf",
    title: "Umschuldungsrechner",
    description: "Vergleich einer bestehenden Finanzierung mit einer Umschuldung.",
    Component: UmschuldungsRechner,
  },
  {
    slug: "bewertung",
    bereich: "einkauf",
    title: "Wohnungsbewertung",
    description:
      "Marktwert einer Wohnung vor dem Kauf (Graz, Graz-Umgebung, Leibnitz) aus amtlichen Kaufpreisen – mit Kaufpreis-Check, Belehnwert und Ertragswert-Gegenprobe.",
    Component: BewertungsRechner,
  },
  {
    slug: "mietrechner",
    bereich: "einkauf",
    title: "Mietrechner",
    description: "Mietrendite, Cashflow und Ratendeckung für Bestandsobjekte inkl. PDF/Excel-Export.",
    Component: MieteRechner,
  },
];
