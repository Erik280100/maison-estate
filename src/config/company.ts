/**
 * Zentrale Firmendaten für Impressum, Datenschutz und Footer.
 * Alle Felder mit "[TODO" müssen vor dem Livegang ausgefüllt werden
 * (`npm run legal:check` prüft das).
 */
export const TODO = (hint: string) => `[TODO: ${hint}]`;

/**
 * "gruendung"   = Firma noch nicht im Firmenbuch: Auftritt als "Maison Estate (in Gründung)",
 *                 Verantwortlich ist die unten genannte Person, "GmbH" wird nicht gezeigt.
 * "eingetragen" = nach Firmenbucheintrag: volles Impressum der GmbH.
 */
export const phase = "gruendung" as "gruendung" | "eingetragen";

export const company = {
  /** Gründungsphase: verantwortliche natürliche Person (Gründer/in) */
  operatorName: TODO("Vor- und Nachname der verantwortlichen Person"),
  displayName:
    phase === "gruendung" ? "Maison Estate (in Gründung)" : "Maison Estate GmbH",
  name: "Maison Estate GmbH",
  legalForm: "Gesellschaft mit beschränkter Haftung",
  street: TODO("Straße und Hausnummer"),
  zip: TODO("PLZ"),
  city: TODO("Ort"),
  country: "Österreich",

  email: TODO("E-Mail-Adresse"),
  phone: TODO("Telefonnummer"),

  // Firmenbuch (§ 14 UGB)
  firmenbuchnummer: TODO("FN, z. B. 123456 a"),
  firmenbuchgericht: TODO("z. B. Handelsgericht Wien / Landesgericht …"),
  uid: TODO("ATU12345678"),

  // Offenlegung (§ 25 MedienG)
  managingDirectors: [TODO("Name Geschäftsführer/in")],
  shareholders: [TODO("Gesellschafter mit Anteil, bei >25 % Pflicht")],
  businessPurpose: "Ankauf und Verkauf von Immobilien (Wohnungen)",
  editorialLine:
    "Information über die Leistungen und das Immobilienangebot der Maison Estate GmbH.",

  // Berufsrecht (§ 5 Abs 1 Z 5-8 ECG)
  trade: TODO(
    "Gewerbewortlaut laut Gewerbeberechtigung, z. B. Immobilienmakler / Bauträger",
  ),
  chamber: TODO("z. B. Wirtschaftskammer Wien, Fachgruppe Immobilien- und Vermögenstreuhänder"),
  tradeAuthority: TODO("Gewerbebehörde, z. B. Magistratisches Bezirksamt / BH"),

  // Datenschutz
  dpo: null as string | null, // Datenschutzbeauftragte/r, falls bestellt
  hostingProvider: "GitHub Inc. (GitHub Pages), 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, USA",
  hostingInEU: false, // true, wenn Server nur in der EU stehen (beeinflusst Drittlandhinweis)
} as const;

export const dataProtectionAuthority = {
  name: "Österreichische Datenschutzbehörde",
  address: "Barichgasse 40–42, 1030 Wien",
  web: "https://www.dsb.gv.at",
  email: "dsb@dsb.gv.at",
};
