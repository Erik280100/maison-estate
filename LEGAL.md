# Rechtliche Prüfliste (Österreich)

Grundgerüst, keine Rechtsberatung. Vor Livegang durch Anwalt/Datenschutzexperten prüfen lassen.

## Vor Livegang (Pflicht)
- [ ] `src/config/company.ts` vollständig ausfüllen, danach `npm run legal:check`
- [ ] Impressum: § 5 ECG, § 14 UGB, § 25 MedienG (Gesellschafter >25 %, Geschäftsführer) – im Footer auf jeder Seite verlinkt
- [ ] Gewerbeberechtigung/Kammer/Behörde korrekt (Immobilienmakler, Bauträger o. Ä. – laut Gewerbeschein)
- [x] Hosting: GitHub Pages (GitHub Inc., USA) ist in `company.ts` eingetragen; Datenschutz-Hinweis auf Drittland/DPF-Zertifizierung von GitHub prüfen
- [ ] "Stand"-Datum in der Datenschutzerklärung setzen

## Aktuell erfüllt
- Keine Cookies, kein Tracking, keine Formulare → kein Cookie-Banner nötig
- Schriften selbst gehostet (`next/font`), keine Google-Fonts-Anfrage (vgl. LG München I, 3 O 17493/20)

## Bei jeder neuen Funktion ergänzen
| Funktion | Zusätzlich nötig |
|---|---|
| Kontaktformular | Datenschutzabschnitt (Zweck, Speicherdauer), Hinweis am Formular, TLS, keine Pflichtfelder über das Nötige hinaus |
| Analytics (Matomo, Plausible, GA …) | Einwilligungs-Banner (§ 165 Abs. 3 TKG) bei Cookies/Fingerprinting, Abschnitt in Datenschutzerklärung, ggf. AV-Vertrag |
| Karten, YouTube, Videos, externe Bilder | Einwilligung/2-Klick-Lösung, Drittland-Hinweis |
| Newsletter | Double-Opt-In, Abmeldelink, § 174 TKG (Werbung nur mit Einwilligung) |
| Objektanzeigen | HWB und fGEE aus Energieausweis (EAVG 2012 § 4), Gesamtprovision/Maklerprovision transparent (MaklerG, Immobilienmaklerverordnung), Preis inkl. Nebenkosten klar |
| Verkäufer-/Ankaufsanfragen | Geldwäsche-Sorgfaltspflichten (GewO §§ 365m ff.) im Prozess, nicht auf der Website |
| Objektfotos/Personen | Urheber-/Bildrechte, Einwilligung abgebildeter Personen |

## Hinweise
- EU-Streitbeilegungsplattform (OS) wurde 2025 eingestellt → kein Link mehr nötig.
- Verbraucher-Widerrufsrecht (FAGG) betrifft Makler-Fernabsatz, falls Verträge online abgeschlossen werden → bei Bedarf Widerrufsbelehrung.
- Kein Datenschutzbeauftragter nötig, solange keine umfangreiche Verarbeitung besonderer Kategorien / Kerntätigkeit mit Überwachung (Art. 37 DSGVO) – bei Wachstum neu prüfen.

## Status: Firma in Gründung
Die GmbH ist noch nicht im Firmenbuch eingetragen. Daher:
- **Website nicht öffentlich schalten**, solange Impressum/Firmendaten Platzhalter enthalten. Lokal entwickeln oder passwortgeschützte Vorschau nutzen. Die Seite ist per `ALLOW_INDEXING=false` auf noindex gestellt (Standard).
- **Bezeichnung „GmbH“ erst nach Eintragung** verwenden. Davor „Maison Estate GmbH i. G.“ (in Gründung); wer vorher im Namen der Gesellschaft auftritt, haftet persönlich (§ 2 GmbHG). Das Logo enthält „GmbH“ – für die Zeit davor eine Variante ohne bzw. mit „i. G.“ vorsehen.
- **Kein Angebot/keine Werbung** vor Vorliegen der Gewerbeberechtigung (Immobilienmakler/Bauträger) und der Domain-Inhaberschaft.
- Reihenfolge: Eintragung Firmenbuch → UID → Gewerbeanmeldung → Config ausfüllen → `npm run legal:check` → `ALLOW_INDEXING=true` und `SITE_MODE=live`.
- Übergangslösung, falls früher online: minimales Impressum mit den Daten, die schon feststehen (Gründer, Anschrift, Kontakt), plus Hinweis „in Gründung“ – vorher kurz mit Anwalt/Notar abstimmen.
