import type { Art, Gesellschafter } from "./types";

export const KONTEN_BASIS: [string, string][] = [
  ["0010", "Software (immaterielle Anlagen)"],
  ["0620", "EDV-Hardware"],
  ["0630", "PKW"],
  ["0660", "Betriebs- und Geschäftsausstattung"],
  ["0680", "Geringwertige Wirtschaftsgüter (GWG)"],
  ["2000", "Forderungen aus Lieferungen und Leistungen"],
  ["2300", "Sonstige Forderungen"],
  ["2500", "Vorsteuer"],
  ["2506", "Vorsteuer Reverse Charge § 19 Abs 1a"],
  ["2700", "Kassa"],
  ["2800", "Bank"],
  ["2890", "Geldtransit"],
  ["3150", "Verbindlichkeiten gegenüber Kreditinstituten"],
  ["3180", "Verbindlichkeiten gegenüber Gesellschaftern (Darlehen)"],
  ["3300", "Verbindlichkeiten aus Lieferungen und Leistungen"],
  ["3500", "Umsatzsteuer"],
  ["3506", "Umsatzsteuer Reverse Charge § 19 Abs 1a"],
  ["3540", "Verrechnung Finanzamt"],
  ["4000", "Erlöse Liegenschaftsverkauf steuerfrei (§ 6 Abs 1 Z 9 lit a)"],
  ["4020", "Erlöse Liegenschaftsverkauf 20 % (Option)"],
  ["4400", "Mieterlöse 10 %"],
  ["4800", "Provisions- und Tippgebererlöse 20 %"],
  ["4880", "Sonstige Erlöse"],
  ["4890", "Zinserträge"],
  ["5000", "Ankauf Liegenschaften"],
  ["5100", "Anschaffungsnebenkosten (GrESt, Grundbuch, Notar Ankauf)"],
  ["5300", "Material Sanierung"],
  ["5800", "Fremdleistungen Sanierung (Handwerker)"],
  ["7010", "Planmäßige Abschreibung (AfA)"],
  ["7020", "Abschreibung geringwertige Wirtschaftsgüter"],
  ["7100", "Gebühren und Abgaben"],
  ["7200", "Betriebskosten und Energie Objekte"],
  ["7300", "Reise- und Fahrtkosten"],
  ["7380", "Telefon und Internet"],
  ["7400", "Miete Büro"],
  ["7600", "Büromaterial und Software"],
  ["7650", "Werbung, Inserate, Fotografie"],
  ["7700", "Versicherungen"],
  ["7750", "Rechts- und Beratungskosten"],
  ["7770", "Maklerprovisionen"],
  ["7780", "Mitgliedsbeiträge (WKO)"],
  ["7790", "Spesen des Geldverkehrs"],
  ["7800", "Gründungskosten"],
  ["7890", "Sonstiger Aufwand"],
  ["8280", "Zinsen und Kreditkosten"],
  ["8500", "Körperschaftsteuer"],
  ["9000", "Stammkapital"],
  ["9100", "Kapitalrücklage (Gesellschafterzuschüsse)"],
];

/** Verrechnungskonto je Gesellschafter: 3181 … 3189 */
export const gsKonto = (g: Pick<Gesellschafter, "nr">) => String(3180 + g.nr);

export function kontenMit(gs: Gesellschafter[]): [string, string][] {
  const extra: [string, string][] = gs.map((g) => [gsKonto(g), `Verrechnung Gesellschafter ${g.name}`]);
  return [...KONTEN_BASIS, ...extra].sort((a, b) => a[0].localeCompare(b[0]));
}

export const KLASSE: Record<string, string> = {
  "0": "Anlagevermögen",
  "2": "Umlaufvermögen",
  "3": "Verbindlichkeiten",
  "4": "Erlöse",
  "5": "Wareneinsatz / Objektkosten",
  "7": "Sonstiger Aufwand",
  "8": "Finanzergebnis",
  "9": "Eigenkapital",
};

export const ARTEN: Record<Art, string> = {
  ER: "Eingangsrechnung",
  AR: "Ausgangsrechnung",
  KA: "Kassabeleg",
  BA: "Bankbuchung",
  KR: "Kreditbuchung",
  MB: "Manuelle Buchung",
  ST: "Storno",
};

export const SAETZE = [20, 13, 10, 0];
/** Konten mit Grundstücksbezug (12 Jahre Aufbewahrung) */
export const GRUND_KONTEN = ["4000", "4020", "5000", "5100"];
/** Objektkosten, die einem Projekt zugeordnet werden */
export const OBJEKT_KONTEN = ["5000", "5100", "5300", "5800"];
export const ANLAGE_KONTEN = ["0010", "0620", "0630", "0660", "0680"];
export const VIER_AUGEN = 500000; // 5.000 € in Cent
export const GWG_GRENZE = 100000; // 1.000 € in Cent
export const FIRMA = "Maison Estate GmbH";

/** Gegenkonten pro Belegart (Gesellschafter-Konten kommen dynamisch dazu) */
export const GEGEN: Record<string, string[]> = {
  ER: ["3300", "2800", "2700"],
  KA: ["2700", "2800"],
  AR: ["2000", "2800", "2700"],
};
