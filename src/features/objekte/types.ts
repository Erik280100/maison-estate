export type Objekttyp = "erdgeschoss" | "dachgeschoss" | "garconniere" | "sonstige";
export type Freiflaeche = "terrasse" | "garten" | "balkon";
export type Parkplatz = "freistellplatz" | "carport" | "garage";
export type ObjektStatus = "verfuegbar" | "reserviert" | "verkauft";
export type Zustand =
  | "erstbezug"
  | "neuwertig"
  | "saniert"
  | "modernisiert"
  | "vollstaendig_renoviert"
  | "renovierungsbeduerftig";
/** "parkplatz" wird nicht gespeichert, sondern aus dem Feld "parken" abgeleitet. */
export type Ausstattung =
  | "lift"
  | "parkplatz"
  | "klimaanlage"
  | "badewanne"
  | "regendusche"
  | "rollstuhlgerecht"
  | "keller"
  | "moebliert";
/** In der Datenbank gespeicherte Ausstattungsmerkmale (ohne abgeleitetes "parkplatz"). */
export type AusstattungGespeichert = Exclude<Ausstattung, "parkplatz">;

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
export const ZUSTAND: Option<Zustand>[] = [
  { value: "erstbezug", label: "Erstbezug" },
  { value: "neuwertig", label: "Neuwertig" },
  { value: "saniert", label: "Saniert" },
  { value: "modernisiert", label: "Modernisiert" },
  { value: "vollstaendig_renoviert", label: "Vollständig renoviert" },
  { value: "renovierungsbeduerftig", label: "Renovierungsbedürftig" },
];
export const AUSSTATTUNG: Option<Ausstattung>[] = [
  { value: "lift", label: "Lift / Aufzug" },
  { value: "parkplatz", label: "Parkplatz" },
  { value: "klimaanlage", label: "Klimaanlage" },
  { value: "badewanne", label: "Badewanne" },
  { value: "regendusche", label: "Regendusche" },
  { value: "rollstuhlgerecht", label: "Rollstuhlgerecht" },
  { value: "keller", label: "Keller" },
  { value: "moebliert", label: "Möbliert" },
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
  erstbezug: "Erstbezug",
  neuwertig: "Neuwertig",
  saniert: "Saniert",
  modernisiert: "Modernisiert",
  vollstaendig_renoviert: "Vollständig renoviert",
  renovierungsbeduerftig: "Renovierungsbedürftig",
  lift: "Lift / Aufzug",
  parkplatz: "Parkplatz",
  klimaanlage: "Klimaanlage",
  badewanne: "Badewanne",
  regendusche: "Regendusche",
  rollstuhlgerecht: "Rollstuhlgerecht",
  keller: "Keller",
  moebliert: "Möbliert",
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
  ausstattung: AusstattungGespeichert[];
  zustand: Zustand | null;
  /** Durchschnittlich erzielbare Monatsmiete in € (null = unbekannt) */
  miete: number | null;
  beschreibung: string | null;
  createdAt: string;
};
