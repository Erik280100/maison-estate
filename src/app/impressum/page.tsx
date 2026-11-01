import type { Metadata } from "next";
import { LegalPage, V } from "@/components/layout/LegalPage";
import { company as c, phase } from "@/config/company";

export const metadata: Metadata = { title: "Impressum" };

export default function ImpressumPage() {
  if (phase === "gruendung") {
    return (
      <LegalPage title="Impressum">
        <section>
          <h2>Angaben zum Betreiber</h2>
          <p>
            <strong>{c.displayName}</strong>
            <br />
            Die Maison Estate GmbH befindet sich in Gründung und ist noch nicht
            im Firmenbuch eingetragen.
          </p>
          <p>
            Verantwortlich für diese Website: <V>{c.operatorName}</V>
            <br />
            <V>{c.street}</V>, <V>{c.zip}</V> <V>{c.city}</V>, {c.country}
          </p>
          <p>
            E-Mail: <V>{c.email}</V>
            <br />
            Telefon: <V>{c.phone}</V>
          </p>
        </section>
        <section>
          <h2>Offenlegung gemäß § 25 Mediengesetz</h2>
          <p>
            Medieninhaber: siehe oben. Unternehmensgegenstand (geplant):{" "}
            {c.businessPurpose}.
          </p>
          <p>
            Grundlegende Richtung: Information über das geplante Angebot von
            Maison Estate. Diese Seite enthält derzeit keine Angebote.
          </p>
        </section>
      </LegalPage>
    );
  }

  return (
    <LegalPage title="Impressum">
      <section>
        <h2>Unternehmen</h2>
        <p>
          <strong>{c.name}</strong>
          <br />
          {c.legalForm}
          <br />
          <V>{c.street}</V>
          <br />
          <V>{c.zip}</V> <V>{c.city}</V>, {c.country}
        </p>
        <p>
          Unternehmensgegenstand: {c.businessPurpose}
        </p>
      </section>

      <section>
        <h2>Kontakt</h2>
        <p>
          E-Mail: <V>{c.email}</V>
          <br />
          Telefon: <V>{c.phone}</V>
        </p>
      </section>

      <section>
        <h2>Firmenbuch und Steuer</h2>
        <p>
          Firmenbuchnummer: <V>{c.firmenbuchnummer}</V>
          <br />
          Firmenbuchgericht: <V>{c.firmenbuchgericht}</V>
          <br />
          UID-Nummer: <V>{c.uid}</V>
        </p>
      </section>

      <section>
        <h2>Gewerbe und Aufsicht</h2>
        <p>
          Gewerbe: <V>{c.trade}</V>
          <br />
          Mitglied der: <V>{c.chamber}</V>
          <br />
          Aufsichts-/Gewerbebehörde: <V>{c.tradeAuthority}</V>
          <br />
          Anwendbare Berufsvorschriften: Gewerbeordnung 1994 (GewO), Maklergesetz
          (MaklerG), Immobilienmaklerverordnung; abrufbar unter{" "}
          <a href="https://www.ris.bka.gv.at" target="_blank" rel="noopener noreferrer">
            www.ris.bka.gv.at
          </a>
          .
        </p>
      </section>

      <section>
        <h2>Offenlegung gemäß § 25 Mediengesetz</h2>
        <p>
          Medieninhaber und Herausgeber: {c.name}, Sitz siehe oben.
          <br />
          Geschäftsführung:{" "}
          {c.managingDirectors.map((n, i) => (
            <span key={i}>
              {i > 0 && ", "}
              <V>{n}</V>
            </span>
          ))}
          <br />
          Gesellschafter:{" "}
          {c.shareholders.map((n, i) => (
            <span key={i}>
              {i > 0 && ", "}
              <V>{n}</V>
            </span>
          ))}
        </p>
        <p>Grundlegende Richtung: {c.editorialLine}</p>
      </section>

      <section>
        <h2>Haftung für Inhalte und Links</h2>
        <p>
          Wir erstellen die Inhalte dieser Website mit größter Sorgfalt. Für
          Richtigkeit, Vollständigkeit und Aktualität – insbesondere von
          Immobilienangeboten, die jederzeit verkauft oder geändert werden
          können – übernehmen wir keine Gewähr; Angebote sind freibleibend.
          Für Inhalte externer Seiten, auf die wir verlinken, sind deren
          Betreiber verantwortlich. Bei Bekanntwerden von Rechtsverletzungen
          entfernen wir solche Links umgehend.
        </p>
      </section>

      <section>
        <h2>Urheberrecht</h2>
        <p>
          Texte, Bilder und Grafiken dieser Website unterliegen dem
          Urheberrecht. Eine Verwendung ohne unsere Zustimmung ist nur im
          Rahmen der gesetzlichen Bestimmungen zulässig.
        </p>
      </section>
    </LegalPage>
  );
}
