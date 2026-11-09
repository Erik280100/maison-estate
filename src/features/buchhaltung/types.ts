/** Datenmodell (kompatibel zum bisherigen Buchhaltungs-Tool; Beträge in Zeilen sind Cent, Positionen in Euro). */
export type Zeile = { konto: string; soll: number; haben: number; text?: string };
export type Position = { text: string; konto: string; netto: number; satz: number; ust: number };
export type Art = "ER" | "AR" | "KA" | "BA" | "KR" | "MB" | "ST";

export type Beleg = {
  id: string;
  art: Art;
  status: "Entwurf" | "Gebucht";
  belegdatum: string;
  leistungsdatum?: string;
  faellig?: string;
  partner: string;
  uid?: string;
  empfaenger?: string;
  rechnungsnr?: string;
  beschreibung: string;
  objekt?: string;
  projektId?: string | null;
  anlageId?: string | null;
  /** AfA-Buchung für dieses Geschäftsjahr (Anlagenverzeichnis) */
  afaJahr?: number;
  /** Gesellschafter-ID, wenn privat bezahlt (Verrechnungskonto) */
  gs?: string | null;
  reverseCharge?: boolean;
  vorsteuer?: boolean;
  gegenkonto?: string;
  brutto?: number | null;
  positionen?: Position[];
  zeilen?: Zeile[];
  manuell?: boolean;
  merkmale?: Record<string, boolean | null> | null;
  hinweise?: string[];
  assetId?: string | null;
  previewId?: string | null;
  dateiHash?: string | null;
  fileName?: string;
  mime?: string;
  erfasstVon?: string | null;
  erfasstAm?: string;
  freigabeVon?: string | null;
  freigabeAm?: string;
  // Buchung
  nr?: string;
  seq?: number;
  hv?: number;
  prevHash?: string;
  hash?: string;
  gebuchtAm?: string;
  gebuchtVon?: string | null;
  storniert?: boolean;
  storniertDurch?: string;
  stornoVon?: string;
  bankRef?: string;
  auszugId?: string;
  kreditId?: string | null;
  planNr?: number | null;
  ausgleich?: string | null;
};

export type Posten = {
  i: number;
  datum: string;
  valuta?: string;
  betrag: number;
  partner: string;
  verwendungszweck: string;
  kontoVorschlag?: string;
  belegId: string | null;
  belegNr: string | null;
  ref?: string;
  dup?: boolean;
  gk?: string;
  /** Gesellschafter-Bezug (Einlage, Zuschuss, Darlehen) */
  gs?: string;
};
export type Auszug = {
  id: string;
  bank: string;
  ibanEnde?: string;
  von: string;
  bis: string;
  anfangssaldo: number | null;
  endsaldo: number | null;
  posten: Posten[];
  assetId?: string | null;
  dateiHash?: string | null;
  fileName?: string;
};

export type Kredit = {
  id: string;
  bank: string;
  kreditnr: string;
  bezeichnung: string;
  betrag: number;
  zinssatz: number;
  zinsart: "fix" | "variabel";
  laufzeitMonate: number;
  beginn: string;
  ersteRate: string;
  rate: number | null;
  intervall: "monat" | "quartal";
  tilgungsart: "annuitaet" | "endfaellig" | "raten";
  gebuehren: { text: string; betrag: number; einbehalten: boolean }[];
  objekt: string;
  sicherheiten: string;
  pfandrecht: number | null;
  sondertilgungKostenlos: boolean | null;
  pfandtausch: boolean | null;
  bereitstellungsprovision: string;
  vorfaelligkeit: string;
  buergen: string;
  hinweise: string[];
  assetId?: string | null;
  dateiHash?: string | null;
  fileName?: string;
};

export type Gesellschafter = {
  id: string;
  name: string;
  /** laufende Nummer 1..9 → Konto 3181..3189 */
  nr: number;
  iban?: string;
  userEmail?: string;
  stammeinlage: number;
};

export type ProjektStatus = "Ankauf" | "Sanierung" | "Vermarktung" | "Verkauft";
export type Projekt = {
  id: string;
  name: string;
  adresse?: string;
  status: ProjektStatus;
  ankaufDatum?: string;
  kaufpreisPlan?: number;
  notiz?: string;
};

export type Anlage = {
  id: string;
  bezeichnung: string;
  konto: string;
  anschaffung: string;
  /** Anschaffungskosten netto in Euro */
  ak: number;
  nutzungsdauer: number;
  belegId?: string | null;
  ausgeschieden?: string | null;
};

export type Protokoll = { id: string; zeit: string; user: string | null; aktion: string; details: string };
export type Perioden = { gesperrtBis?: string };
