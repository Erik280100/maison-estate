import type { Metadata } from "next";
import { LegalPage, V } from "@/components/layout/LegalPage";
import {
  company as c,
  dataProtectionAuthority as dsb,
  phase,
} from "@/config/company";

export const metadata: Metadata = { title: "Datenschutzerklärung" };

export default function DatenschutzPage() {
  return (
    <LegalPage title="Datenschutzerklärung">
      <section>
        <p>
          Der Schutz Ihrer personenbezogenen Daten ist uns wichtig. Hier
          informieren wir gemäß Art. 13 und 14 DSGVO darüber, welche Daten beim
          Besuch dieser Website verarbeitet werden. Derzeit bietet die Website
          keine Formulare, keine Benutzerkonten und kein Tracking an.
        </p>
      </section>

      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          {phase === "gruendung" ? (
            <>
              <V>{c.operatorName}</V> ({c.displayName})
            </>
          ) : (
            c.name
          )}
          , <V>{c.street}</V>, <V>{c.zip}</V> <V>{c.city}</V>, {c.country}
          <br />
          E-Mail: <V>{c.email}</V> · Telefon: <V>{c.phone}</V>
        </p>
        {c.dpo ? (
          <p>Datenschutzbeauftragte/r: {c.dpo}</p>
        ) : (
          <p>Ein Datenschutzbeauftragter ist nicht bestellt.</p>
        )}
      </section>

      <section>
        <h2>2. Hosting und Server-Logfiles</h2>
        <p>
          Beim Aufruf der Website verarbeitet der Hosting-Anbieter technisch
          notwendige Daten: IP-Adresse, Datum und Uhrzeit, aufgerufene Seite,
          Browser- und Betriebssysteminformationen sowie Referrer-URL. Dies
          dient dem sicheren und stabilen Betrieb der Website.
        </p>
        <ul>
          <li>Rechtsgrundlage: berechtigtes Interesse, Art. 6 Abs. 1 lit. f DSGVO</li>
          <li>Speicherdauer: nur so lange, wie für den Betrieb und die Sicherheit erforderlich (üblicherweise wenige Tage bis Wochen)</li>
          <li>
            Empfänger/Auftragsverarbeiter: <V>{c.hostingProvider}</V> auf Basis
            eines Auftragsverarbeitungsvertrags (Art. 28 DSGVO)
          </li>
        </ul>
        {!c.hostingInEU && (
          <p>
            Eine Verarbeitung kann in Drittländern (z. B. USA) erfolgen. Die
            Übermittlung stützt sich auf einen Angemessenheitsbeschluss (EU-US
            Data Privacy Framework) bzw. Standardvertragsklauseln gemäß Art. 46
            DSGVO.
          </p>
        )}
      </section>

      <section>
        <h2>3. Schriftarten</h2>
        <p>
          Die verwendeten Schriftarten werden von unserem eigenen Server
          ausgeliefert. Es findet keine Verbindung zu Google-Servern statt.
        </p>
      </section>

      <section>
        <h2>4. Cookies und Tracking</h2>
        <p>
          Wir setzen derzeit keine Cookies und keine Analyse- oder
          Marketing-Werkzeuge ein. Sollte sich dies ändern, holen wir vorab
          Ihre Einwilligung ein (§ 165 Abs. 3 TKG 2021, Art. 6 Abs. 1 lit. a
          DSGVO) und aktualisieren diese Erklärung.
        </p>
      </section>

      <section>
        <h2>4a. Login für Mitarbeitende (interner Bereich)</h2>
        <p>
          Für den internen Bereich verarbeiten wir E-Mail-Adresse, Passwort
          (nur als Hash), Zeitpunkt der Anmeldung und IP-Adresse. Der Zugang
          wird ausschließlich vom Unternehmen vergeben. Dienstleister ist
          Supabase (Authentifizierung und Datenbank, [TODO: Region, z. B. EU
          Frankfurt, und Auftragsverarbeitungsvertrag prüfen]).
        </p>
        <ul>
          <li>Rechtsgrundlage: Durchführung des Beschäftigungs- bzw. Auftragsverhältnisses sowie berechtigtes Interesse an der Systemsicherheit (Art. 6 Abs. 1 lit. b und f DSGVO)</li>
          <li>Speicherdauer: bis zur Deaktivierung des Zugangs, Logdaten kurzfristig</li>
          <li>Im Browser wird ein technisch notwendiges Sitzungstoken im lokalen Speicher abgelegt; es ist für den Login erforderlich und nicht einwilligungspflichtig (§ 165 Abs. 3 TKG 2021).</li>
        </ul>
      </section>

      <section>
        <h2>5. Kontaktaufnahme per E-Mail oder Telefon</h2>
        <p>
          Wenn Sie uns kontaktieren, verarbeiten wir Ihre Angaben zur
          Bearbeitung Ihrer Anfrage und für den Fall von Anschlussfragen.
          Rechtsgrundlage ist die Vertragsanbahnung bzw. Vertragserfüllung
          (Art. 6 Abs. 1 lit. b DSGVO) oder unser berechtigtes Interesse an
          der Beantwortung (lit. f). Die Daten werden nicht ohne Ihre
          Zustimmung weitergegeben und gelöscht, sobald sie nicht mehr
          benötigt werden, vorbehaltlich gesetzlicher Aufbewahrungsfristen
          (insb. § 132 BAO: 7 Jahre).
        </p>
      </section>

      <section>
        <h2>6. Ihre Rechte</h2>
        <p>Sie haben jederzeit das Recht auf:</p>
        <ul>
          <li>Auskunft (Art. 15 DSGVO)</li>
          <li>Berichtigung (Art. 16)</li>
          <li>Löschung (Art. 17)</li>
          <li>Einschränkung der Verarbeitung (Art. 18)</li>
          <li>Datenübertragbarkeit (Art. 20)</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21)</li>
          <li>Widerruf einer erteilten Einwilligung mit Wirkung für die Zukunft (Art. 7 Abs. 3)</li>
        </ul>
        <p>
          Zur Ausübung wenden Sie sich bitte an <V>{c.email}</V>. Eine
          automatisierte Entscheidungsfindung einschließlich Profiling findet
          nicht statt.
        </p>
      </section>

      <section>
        <h2>7. Beschwerderecht</h2>
        <p>
          Wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer Daten gegen
          Datenschutzrecht verstößt, können Sie sich bei der Aufsichtsbehörde
          beschweren:
        </p>
        <p>
          {dsb.name}, {dsb.address}
          <br />
          <a href={dsb.web} target="_blank" rel="noopener noreferrer">
            {dsb.web}
          </a>{" "}
          · {dsb.email}
        </p>
      </section>

      <section>
        <p className="text-sm text-stone-500">Stand: [TODO: Datum]</p>
      </section>
    </LegalPage>
  );
}
