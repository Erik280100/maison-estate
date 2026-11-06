// Referenzdaten für den Bewertungsrechner: Baugrundpreise je Gemeinde als Lageindikator.
// Wohnungspreise (Statistik Austria) gibt es amtlich nur je Bezirk (siehe REF0.basis in ankauf/zusatzRechne.ts);
// auf Gemeindeebene veröffentlicht Statistik Austria nur Baugrundstückspreise.

export const REGIONEN = ["Graz-Stadt", "Graz-Umgebung", "Leibnitz"] as const;
export type Region = (typeof REGIONEN)[number];

/** Baugrund Ø €/m² je Bezirk, Kaufjahre 2021–2025 (geometrisches Mittel, Statistik Austria / Land Steiermark). */
export const BAUGRUND_BEZIRK: Record<"Graz-Umgebung" | "Leibnitz", number> = {
  "Graz-Umgebung": 132,
  Leibnitz: 69.7,
};

/** Dämpfung: Wohnungspreise reagieren deutlich schwächer auf das Baulandniveau als Grundstückspreise.
 *  Kalibriert an Stadt Leibnitz (Wohnungs-Median 2025: 2.644 vs. Bezirk 2.457 = +7,6 % bei Baugrund-Verhältnis 1,90). */
export const ELAST = 0.12;
/** Begrenzung des Gemeindefaktors (Faktor 1,00 = Bezirksdurchschnitt). */
export const CAP: [number, number] = [0.88, 1.12];

/** Gemeinde → Baugrund Ø €/m² 2021–2025. Gruppen-Gemeinden teilen sich den Wert (zu wenige Verkäufe). */
export const GEMEINDEN: Record<"Graz-Umgebung" | "Leibnitz", [string, number][]> = {
  "Graz-Umgebung": [
    ["Deutschfeistritz", 79], ["Dobl-Zwaring", 114], ["Eggersdorf bei Graz", 95], ["Feldkirchen bei Graz", 209],
    ["Fernitz-Mellach", 113], ["Frohnleiten", 121], ["Gössendorf", 164], ["Gratkorn", 127], ["Gratwein-Straßengel", 162],
    ["Hart bei Graz", 259], ["Haselsdorf-Tobelbad", 122], ["Hausmannstätten", 174], ["Hitzendorf", 122],
    ["Kainbach bei Graz", 178], ["Kalsdorf bei Graz", 201], ["Kumberg", 95], ["Laßnitzhöhe", 123], ["Lieboch", 160],
    ["Nestelbach bei Graz", 77], ["Peggau", 127], ["Premstätten", 152], ["Raaba-Grambach", 192],
    ["Sankt Bartholomä", 93], ["Sankt Marein bei Graz", 61], ["Sankt Oswald bei Plankenwarth", 93],
    ["Sankt Radegund bei Graz", 83], ["Seiersberg-Pirka", 247], ["Semriach", 85], ["Stattegg", 222], ["Stiwoll", 93],
    ["Thal", 146], ["Übelbach", 79], ["Vasoldsberg", 126], ["Weinitzen", 209], ["Werndorf", 135], ["Wundschuh", 135],
  ],
  Leibnitz: [
    ["Leibnitz", 132.7], ["Wagna", 132.7], ["Hengsberg", 110.5], ["Wildon", 106.3], ["Gralla", 102.7],
    ["Empersdorf", 100.1], ["Tillmitsch", 99.9], ["Lang", 88.4], ["Lebring-Sankt Margarethen", 67.3],
    ["Straß in Steiermark", 60.7], ["Heimschuh", 60.2], ["Heiligenkreuz am Waasen", 59.4],
    ["Ehrenhausen an der Weinstraße", 57.3], ["Gamlitz", 57.3], ["Allerheiligen bei Wildon", 54],
    ["Ragnitz", 54], ["Sankt Georgen an der Stiefing", 54], ["Sankt Nikolai im Sausal", 53.8],
    ["Gleinstätten", 52.1], ["Kitzeck im Sausal", 52.1], ["Sankt Andrä-Höch", 52.1], ["Großklein", 52],
    ["Leutschach an der Weinstraße", 46.1], ["Gabersdorf", 43.2], ["Schwarzautal", 43.2],
    ["Sankt Veit in der Südsteiermark", 42], ["Arnfels", 40.8], ["Oberhaag", 40.8], ["Sankt Johann im Saggautal", 40.8],
  ],
};

export const QUELLEN: [string, string][] = [
  ["Wohnungspreise je Bezirk", "Statistik Austria / Land Steiermark, Immobiliendurchschnittspreise auf regionaler Ebene 2021–2025 (Kaufverträge aus dem Grundbuch, Wohnungseigentum, nach Baujahr, Größe und Außenfläche). Amtlich nur auf Bezirksebene verfügbar."],
  ["Gemeindefaktor", "Statistik Austria, Baugrundstückspreise 2021–2025 je Gemeinde als Lageindikator. Faktor = (Baugrund Gemeinde ÷ Baugrund Bezirk)^0,12, begrenzt auf ±12 %. Der Exponent ist an Stadt Leibnitz kalibriert (Wohnungs-Median 2025: 2.644 €/m² gegenüber 2.457 €/m² im Bezirk). Eine Näherung, keine amtliche Zahl."],
  ["Grazer Bezirke", "Angebotsdaten grazjournal (06/2026) und IMMOXX (10/2026), relativ zum Graz-Median. Angebotspreise liegen meist über den tatsächlichen Verkaufspreisen."],
  ["Marktentwicklung", "WKO Steiermark Immobilienpreisspiegel 2026: gebrauchte Wohnungen Graz +4,06 %. Gilt als Aufschlag seit dem Datenstand und ist änderbar."],
  ["Methode", "Vergleichswertverfahren (§ 4 Liegenschaftsbewertungsgesetz, ÖNORM B 1802) mit Zu- und Abschlägen. Ertragswert (§ 5 LBG) als Gegenprobe für vermietbare Wohnungen."],
  ["Bankensicht", "Banken beleihen nicht den Verkehrswert, sondern den Belehnwert (Verkehrswert abzüglich Sicherheitsabschlag, üblich 10–20 %) bis zu einer Beleihungsgrenze (üblich 60–80 %). Die Werte sind interne Bankpraxis und hier änderbar. Für die Beleihung verlangt die Bank meist ein Gutachten."],
];
