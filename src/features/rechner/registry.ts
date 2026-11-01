import type { ComponentType } from "react";
import { AnkaufVerkaufRechner } from "./AnkaufVerkaufRechner";

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
    slug: "ankauf-verkauf",
    title: "Ankauf, Sanierung & Verkauf",
    description:
      "Gewinn, Marge und Rendite p. a. für ein Objekt von Ankauf bis Verkauf (Beispielrechner).",
    Component: AnkaufVerkaufRechner,
  },
];
