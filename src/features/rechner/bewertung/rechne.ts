// Bewertungsrechner für Wohnungen (Graz, Graz-Umgebung, Leibnitz): Verkehrswert nach dem Vergleichswertverfahren,
// optional Ertragswert als Gegenprobe, Bankensicht (Belehnwert) und Kaufpreis-Check. Reine Funktionen, keine UI.
import { num } from "../ankauf/rechne";
import {
  BAU, REF0, bewertKern, median, type Bewertung, type BwMode, type Vergleich,
} from "../ankauf/zusatzRechne";
import { BAUGRUND_BEZIRK, CAP, ELAST, GEMEINDEN, type Region } from "./daten";

export type S = {
  region: Region; ort: string;
  flaeche: number; baujahr: number; aussen: boolean;
  zustand: string; lage: string; stock: string; energie: string; stoer: string;
  mode: BwMode; stell: number; keller: number;
  preis: number; kaufNk: number; zielAbschlag: number;
  vergleiche: Vergleich[]; bwGewicht: number;
  markt: number; spanne: number;
  belAbschlag: number; belGrenze: number;
  ertrag: boolean; mieteQm: number; mietausfall: number; liZins: number; rnd: number;
};

export const DEFAULTS: S = {
  region: "Graz-Stadt", ort: "VI. Jakomini",
  flaeche: 60, baujahr: 1975, aussen: true,
  zustand: "teilsaniert", lage: "mittel", stock: "1.–2. OG", energie: "C/D", stoer: "keine",
  mode: "neutral", stell: 0, keller: 0,
  preis: 0, kaufNk: 10, zielAbschlag: 5,
  vergleiche: [], bwGewicht: 50,
  markt: REF0.markt, spanne: REF0.spanne,
  belAbschlag: 15, belGrenze: 80,
  ertrag: false, mieteQm: 11, mietausfall: 20, liZins: 3.5, rnd: 0,
};

/** Baujahr → Bauperiode der Statistik (bis 1960 / 1961–1990 / ab 1991). */
export const bauKat = (jahr: number) => (num(jahr) <= 1960 ? BAU[0] : num(jahr) <= 1990 ? BAU[1] : BAU[2]);

/** Orte der Region: Grazer Bezirke bzw. Gemeinden des Bezirks. */
export const orte = (region: Region): string[] =>
  region === "Graz-Stadt" ? REF0.bezirke.map((b) => b[0]) : GEMEINDEN[region].map((g) => g[0]);

export type Gemeindefaktor = { label: string; pct: number; quelle: string } | null;

/** Lagefaktor des Ortes relativ zum Bezirksdurchschnitt (1,00 = Durchschnitt). */
export function lagefaktor(region: Region, ort: string): Gemeindefaktor {
  if (region === "Graz-Stadt") {
    const b = REF0.bezirke.find((x) => x[0] === ort);
    return b ? { label: "Bezirk " + b[0], pct: (b[1] - 1) * 100, quelle: b[2] } : null;
  }
  const g = GEMEINDEN[region].find((x) => x[0] === ort);
  if (!g) return null;
  const roh = Math.pow(g[1] / BAUGRUND_BEZIRK[region], ELAST);
  const f = Math.min(CAP[1], Math.max(CAP[0], roh));
  return {
    label: `Gemeinde ${g[0]}`, pct: (f - 1) * 100,
    quelle: `Baugrund ${g[1].toLocaleString("de-AT")} €/m² gegenüber Bezirk ${BAUGRUND_BEZIRK[region].toLocaleString("de-AT")} €/m²`,
  };
}

/** Restnutzungsdauer in Jahren (Eingabe oder pauschal nach Bauperiode). */
export const rndAuto = (jahr: number) => { const k = bauKat(jahr); return k === BAU[0] ? 40 : k === BAU[1] ? 55 : 70; };

/** Vervielfältiger (Barwertfaktor der nachschüssigen Zeitrente). */
export const vervielfaeltiger = (zins: number, n: number) => {
  const i = num(zins) / 100;
  return i > 0 ? (1 - Math.pow(1 + i, -n)) / i : n;
};

export type Ergebnis = {
  A: number;
  kern: Bewertung;
  faktor: Gemeindefaktor;
  vergleichsQm: number[]; medianQm: number; mitVergleich: boolean;
  qm: number; qmLo: number; qmHi: number;
  zuschlaege: number;
  vw: number; lo: number; hi: number;
  /** Kaufpreis-Check (nur wenn Kaufpreis > 0) */
  preisQm: number; abw: number; ampel: "good" | "warn" | "bad" | null; hoechstgebot: number;
  /** Bankensicht */
  belehnwert: number; maxKredit: number; kaufGesamt: number; eigenkapital: number; ekQuote: number;
  /** Ertragswert (nur wenn aktiviert) */
  ertragswert: number | null; reinertrag: number; vf: number; rndJ: number; ewAbw: number | null;
};

export function bewerte(s: S): Ergebnis {
  const A = Math.max(num(s.flaeche), 1);
  const REF = { ...REF0, markt: num(s.markt), spanne: num(s.spanne) };
  const faktor = lagefaktor(s.region, s.ort);
  const zuschlaege = num(s.stell) + num(s.keller);
  const kern = bewertKern(REF, {
    region: s.region, bau: bauKat(s.baujahr), aussen: s.aussen, flaeche: A, zustand: s.zustand,
    lage: s.lage, stock: s.stock, energie: s.energie, stoer: s.stoer, mode: s.mode, stell: 0,
    lagefaktor: faktor ? [faktor.label + " (" + faktor.quelle + ")", faktor.pct] : undefined,
  });
  const vergleichsQm = s.vergleiche.filter((x) => num(x.m2) > 0 && num(x.preis) > 0).map((x) => x.preis / x.m2);
  const w = num(s.bwGewicht) / 100;
  const mitVergleich = vergleichsQm.length >= 3 && w > 0;
  const med = median(vergleichsQm);
  const qm = mitVergleich ? kern.qm * (1 - w) + med * w : kern.qm;
  const sp = num(s.spanne) / 100;
  const vw = qm * A + zuschlaege;
  const lo = qm * (1 - sp) * A + zuschlaege, hi = qm * (1 + sp) * A + zuschlaege;

  const preis = num(s.preis);
  const abw = preis > 0 ? preis / vw - 1 : 0;
  const ampel = preis > 0 ? (abw <= 0 ? "good" : abw <= 0.05 ? "warn" : "bad") : null;
  const hoechstgebot = vw * (1 - num(s.zielAbschlag) / 100);

  const belehnwert = vw * (1 - num(s.belAbschlag) / 100);
  const maxKredit = belehnwert * (num(s.belGrenze) / 100);
  const kaufGesamt = preis * (1 + num(s.kaufNk) / 100);
  const eigenkapital = Math.max(0, kaufGesamt - maxKredit);

  const rndJ = num(s.rnd) > 0 ? num(s.rnd) : rndAuto(s.baujahr);
  const reinertrag = num(s.mieteQm) * A * 12 * (1 - num(s.mietausfall) / 100);
  const vf = vervielfaeltiger(s.liZins, rndJ);
  const ertragswert = s.ertrag ? reinertrag * vf + zuschlaege : null;

  return {
    A, kern, faktor, vergleichsQm, medianQm: med, mitVergleich, qm, qmLo: qm * (1 - sp), qmHi: qm * (1 + sp),
    zuschlaege, vw, lo, hi,
    preisQm: preis / A, abw, ampel, hoechstgebot,
    belehnwert, maxKredit, kaufGesamt, eigenkapital, ekQuote: kaufGesamt > 0 ? eigenkapital / kaufGesamt : 0,
    ertragswert, reinertrag, vf, rndJ, ewAbw: ertragswert !== null && vw > 0 ? ertragswert / vw - 1 : null,
  };
}
