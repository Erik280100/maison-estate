export type Objekttyp = "erdgeschoss" | "dachgeschoss" | "garconniere" | "sonstige";
export type Freiflaeche = "terrasse" | "garten" | "balkon";
export type Parkplatz = "freistellplatz" | "carport" | "garage";
export type ObjektStatus = "verfuegbar" | "reserviert" | "verkauft";

type Option<T extends string> = { value: T; label: string };

// Auswahlmöglichkeiten der Filter (Reihenfolge = Anzeige)
export const OBJEKTTYPEN: Option<Exclude<Objekttyp, "sonstige">>[] = [
  { value: "erdgeschoss", label: "Erdgeschoß" },
  { value: "dachgeschoss", label: "Dachgeschoß" },
  { value: "garconniere", label: "Garçonniere" },
];
export const FREIFLAECHEN: Option<Freiflaeche>[] = [
  { value: "terrasse", label: "Terrasse" },
  { value: "garten", label: "Garten" },
  { value: "balkon", label: "Balkon" },
];
export const PARKEN: Option<Parkplatz>[] = [
  { value: "freistellplatz", label: "Freistellplatz" },
  { value: "carport", label: "Carport" },
  { value: "garage", label: "Garage" },
];
export const ZIMMER_OPTIONEN: Option<`${number}`>[] = [
  { value: "1", label: "1 Zimmer" },
  { value: "2", label: "2 Zimmer" },
  { value: "3", label: "3 Zimmer" },
  { value: "4", label: "4 Zimmer" },
  { value: "5", label: "5+ Zimmer" },
];

export const LABELS: Record<string, string> = {
  erdgeschoss: "Erdgeschoß",
  dachgeschoss: "Dachgeschoß",
  garconniere: "Garçonniere",
  sonstige: "Wohnung",
  terrasse: "Terrasse",
  garten: "Garten",
  balkon: "Balkon",
  freistellplatz: "Freistellplatz",
  carport: "Carport",
  garage: "Garage",
  verfuegbar: "Verfügbar",
  reserviert: "Reserviert",
  verkauft: "Verkauft",
};

export type Objekt = {
  id: string;
  titel: string;
  status: ObjektStatus;
  objekttyp: Objekttyp;
  strasse: string | null;
  plz: string;
  ort: string;
  bezirk: string | null;
  preis: number;
  wohnflaeche: number;
  zimmer: number;
  freiflaechen: Freiflaeche[];
  parken: Parkplatz[];
  beschreibung: string | null;
  createdAt: string;
};
