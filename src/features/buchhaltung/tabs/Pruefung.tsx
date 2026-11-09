"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useBh } from "../BhProvider";
import { belegBlob, protokollieren, setzen } from "../api";
import { ARTEN } from "../konten";
import { jahreVon, gsSalden } from "../logik/auswertung";
import { csvN, csvS, csvJournal, csvSalden, journalRows, speichern, toCsv } from "../logik/export";
import { gebucht } from "../logik/buchung";
import { integritaet, sha256Hex, type Integritaet } from "../logik/hash";
import { tilgungsplan } from "../logik/kredit";
import { offenePosten } from "../logik/op";
import { addMonths, dAT, mName, sumL, today } from "../logik/util";
import { Hinweis, Kpi, KpiGrid, Sel, Txt } from "../ui";

export function Pruefung() {
  const { sb, uid, d, ctx, who, reload, toast } = useBh();
  const [integ, setInteg] = useState<Integritaet | null>(null);
  const [dateien, setDateien] = useState<string | null>(null);
  const [jahr, setJahr] = useState(jahreVon(d.belege)[0]);
  const [orig, setOrig] = useState(true);
  const [fest, setFest] = useState(() => { const x = new Date(); x.setDate(1); x.setMonth(x.getMonth() - 1); return x.toISOString().slice(0, 7); });
  const [confirmFest, setConfirmFest] = useState(false);
  const [zipMsg, setZipMsg] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const td = today();
  const drafts = d.belege.filter((b) => b.status === "Entwurf");
  const ueber = drafts.filter((b) => b.belegdatum && td > addMonths(b.belegdatum.slice(0, 7) + "-15", 2));
  const bankOffen = d.auszuege.reduce((n, a) => n + a.posten.filter((p) => !p.belegId).length, 0);
  const G = useMemo(() => gebucht(d.belege), [d.belege]);

  const pruefen = async () => {
    setWorking(true);
    const r = await integritaet(d.belege, d.kopfHash);
    setInteg(r);
    protokollieren(sb, uid, "Integritätsprüfung", r.ok ? `${r.geprueft} Buchungen in Ordnung` : `${r.fehler.length} Auffälligkeiten`);
    setWorking(false);
  };

  const dateienPruefen = async () => {
    setWorking(true);
    setDateien("Originaldateien werden geprüft …");
    const mit = G.filter((b) => b.assetId && b.dateiHash && b.art !== "BA");
    let ok = 0;
    const bad: string[] = [];
    for (const b of mit) {
      try { const h = await sha256Hex(await (await belegBlob(sb, b.assetId!)).arrayBuffer()); if (h === b.dateiHash) ok++; else bad.push(b.nr ?? b.id); }
      catch { bad.push(`${b.nr} (nicht abrufbar)`); }
    }
    setDateien(bad.length ? `Abweichend oder fehlend: ${bad.join(", ")}` : `${ok} von ${mit.length} Originaldateien unverändert (Prüfsumme stimmt).`);
    setWorking(false);
  };

  const festschreiben = async () => {
    try {
      await setzen(sb, "system", "perioden", { gesperrtBis: fest, von: uid, am: new Date().toISOString() });
      protokollieren(sb, uid, "Festgeschrieben", `Zeitraum bis ${mName(fest)}`);
      setConfirmFest(false);
      toast(`Bis ${mName(fest)} festgeschrieben`);
      await reload();
    } catch (e) { toast("Fehler: " + (e as Error).message); }
  };

  const exportZip = async () => {
    setWorking(true);
    setZipMsg("Export wird erstellt …");
    try {
      const JSZip = (await import("jszip")).default;
      const inJ = (b: { belegdatum: string }) => (b.belegdatum || "").startsWith(jahr);
      const bel = G.filter(inJ).sort((a, b) => (a.seq || 0) - (b.seq || 0));
      const zip = new JSZip();
      const I = await integritaet(d.belege, d.kopfHash);
      zip.file("journal.csv", toCsv(csvJournal(journalRows(d.belege).filter((r) => inJ(r.b)), ctx.konten)));
      zip.file("saldenliste.csv", toCsv(csvSalden(d.belege, inJ, ctx.konten)));
      zip.file("kontenplan.csv", toCsv(["Konto;Bezeichnung", ...Object.entries(ctx.konten).map(([k, n]) => `${k};${csvS(n)}`)]));
      zip.file("belege.csv", toCsv(["Lfd;Belegnummer;Belegart;Belegdatum;Partner;Rechnungsnummer;UID;Betrag;Projekt;Gesellschafter (privat bezahlt);Gebucht am;Gebucht von;Datei;SHA-256 Datei;Siegel;Vorgänger-Siegel;Storniert durch",
        ...bel.map((b) => [b.seq ?? "", b.nr, ARTEN[b.art] || b.art, dAT(b.belegdatum), csvS(b.partner), csvS(b.rechnungsnr), b.uid || "", csvN(sumL(b.zeilen || [], "soll")),
          csvS(d.projekte.find((p) => p.id === b.projektId)?.name ?? b.objekt), csvS(d.gesellschafter.find((g) => g.id === b.gs)?.name), b.gebuchtAm || "", csvS(who(b.gebuchtVon)),
          csvS(b.fileName), b.dateiHash || "", b.hash || "", b.prevHash || "", b.storniertDurch || ""].join(";"))]));
      zip.file("offene_posten.csv", toCsv(["Belegnummer;Partner;Rechnungsnummer;Fällig;Betrag;Offen", ...offenePosten(d.belege).map((o) => [o.b.nr, csvS(o.b.partner), csvS(o.b.rechnungsnr), dAT(o.b.faellig), csvN(o.betrag), csvN(o.offen)].join(";"))]));
      zip.file("gesellschafter.csv", toCsv(["Name;Verrechnungskonto;Ausgelegt;Erstattet;Offen", ...gsSalden(d.belege, d.gesellschafter).map((s) => [csvS(s.g.name), 3180 + s.g.nr, csvN(s.auslagen), csvN(s.erstattet), csvN(s.saldo)].join(";"))]));
      zip.file("projekte.json", JSON.stringify(d.projekte, null, 2));
      zip.file("anlagen.json", JSON.stringify(d.anlagen, null, 2));
      zip.file("protokoll.csv", toCsv(["Zeit;Person;Vorgang;Details", ...d.protokoll.map((p) => [p.zeit, csvS(who(p.user)), csvS(p.aktion), csvS(p.details)].join(";"))]));
      zip.file("kredite.json", JSON.stringify(d.kredite.map((k) => ({ ...k, tilgungsplan: tilgungsplan(k).rows })), null, 2));
      zip.file("daten_vollstaendig.json", JSON.stringify({ firma: "Maison Estate GmbH", jahr, erstellt: new Date().toISOString(), belege: bel, auszuege: d.auszuege.filter((a) => (a.bis || "").startsWith(jahr) || (a.von || "").startsWith(jahr)), integritaet: I }, null, 2));
      let n = 0, fail = 0;
      if (orig) {
        const seen = new Set<string>();
        const quellen: { assetId?: string | null; nr?: string; bank?: string; fileName?: string; belegdatum?: string }[] = [...bel, ...d.auszuege, ...d.kredite];
        for (const b of quellen) {
          if (!b.assetId || seen.has(b.assetId)) continue;
          if (b.belegdatum && !inJ({ belegdatum: b.belegdatum })) continue;
          seen.add(b.assetId);
          setZipMsg(`Originalbelege werden eingepackt (${n + 1}) …`);
          try {
            const name = `${b.nr || b.bank || "beleg"}_${b.fileName || b.assetId}`.replace(/[^\w.\-äöüÄÖÜß]/g, "_");
            zip.file("originalbelege/" + name, await (await belegBlob(sb, b.assetId)).arrayBuffer());
            n++;
          } catch { fail++; }
        }
      }
      zip.file("LIESMICH.txt", `Maison Estate GmbH – Buchhaltungsexport ${jahr}\nErstellt: ${new Date().toLocaleString("de-AT")}\n\nInhalt: journal.csv (alle Buchungszeilen), belege.csv (Belegliste mit SHA-256-Siegeln), saldenliste.csv, kontenplan.csv, offene_posten.csv, gesellschafter.csv, projekte.json, anlagen.json, protokoll.csv (Änderungsprotokoll), kredite.json (mit Tilgungsplänen), daten_vollstaendig.json, originalbelege/.\n\nIntegrität: Jede Buchung trägt ein SHA-256-Siegel über ihre Kerndaten und das Siegel der vorigen Buchung (Feld "Vorgänger-Siegel"). Die Kette beginnt mit 64 Nullen. Prüfergebnis bei Export: ${I.ok ? `unverändert und lückenlos (${I.geprueft} Buchungen)` : "Auffälligkeiten: " + I.fehler.join(" | ")}.\nDie Spalte "SHA-256 Datei" erlaubt den Abgleich jeder Originaldatei.\n\nCSV: Semikolon-getrennt, UTF-8 mit BOM, Dezimalkomma.\nAufbewahrung: 7 Jahre (§ 132 BAO), Unterlagen mit Grundstücksbezug 12 bzw. 22 Jahre.\n`);
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      protokollieren(sb, uid, "Prüfer-Export", `Jahr ${jahr} · ${bel.length} Belege · ${n} Originale`);
      speichern(`Maison_Estate_Buchhaltung_${jahr}.zip`, blob);
      setZipMsg(fail ? `${fail} Originaldatei(en) konnten nicht eingepackt werden.` : "Export gespeichert.");
    } catch (e) { setZipMsg("Export fehlgeschlagen: " + (e as Error).message); }
    setWorking(false);
  };

  return (
    <Stack spacing={2.5}>
      <Typography variant="h6">Prüfung &amp; Ordnungsmäßigkeit</Typography>
      <KpiGrid>
        <Kpi label="Gebuchte Belege" value={G.length} />
        <Kpi label="Entwürfe / davon über Frist" value={`${drafts.length} / ${ueber.length}`} negative={ueber.length > 0} />
        <Kpi label="Ungebuchte Bankumsätze" value={bankOffen} />
        <Kpi label="Festgeschrieben bis" value={d.perioden.gesperrtBis ? mName(d.perioden.gesperrtBis) : "–"} />
      </KpiGrid>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 700 }}>Integrität der Buchhaltung</Typography>
            <Hinweis>Prüft die SHA-256-Kette aller Buchungen, die lückenlosen Nummernkreise und ob der Kettenkopf zur letzten Buchung passt. So wird jede nachträgliche Änderung oder Löschung erkennbar (§ 131 Abs 1 Z 8 BAO).</Hinweis>
            <Stack direction="row" spacing={1}><Button variant="contained" onClick={pruefen} disabled={working}>Integrität prüfen</Button><Button variant="outlined" onClick={dateienPruefen} disabled={working}>Originaldateien prüfen</Button></Stack>
            {integ && (integ.ok ? <Alert severity="success">Alle {integ.geprueft} Buchungen unverändert, Kette und Nummernkreise lückenlos. Geprüft {dAT(integ.zeit)} {integ.zeit.slice(11, 16)} UTC.</Alert> : integ.fehler.map((f, i) => <Alert key={i} severity="error" sx={{ py: 0 }}>{f}</Alert>))}
            {integ?.ohneSiegel ? <Alert severity="warning">{integ.ohneSiegel} Buchung(en) ohne Siegel (vor Einführung der Kette gebucht).</Alert> : null}
            {dateien && <Alert severity={dateien.startsWith("Abweichend") ? "error" : "info"}>{dateien}</Alert>}
          </Stack>
        </Card>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 700 }}>Festschreibung</Typography>
            <Hinweis>Nach Abgabe der UVA einen Monat festschreiben: Danach ist darin keine Buchung mehr möglich, Korrekturen erfolgen im laufenden Monat.</Hinweis>
            {confirmFest ? (
              <Alert severity="warning" action={<><Button color="error" size="small" onClick={festschreiben}>Ja, festschreiben</Button><Button size="small" onClick={() => setConfirmFest(false)}>Abbrechen</Button></>}>
                Zeitraum bis einschließlich {mName(fest)} festschreiben? Das lässt sich nicht rückgängig machen.
              </Alert>
            ) : (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
                <Box sx={{ width: 190 }}><Txt label="Bis einschließlich" type="month" value={fest} onChange={setFest} /></Box>
                <Button variant="outlined" onClick={() => (d.perioden.gesperrtBis && fest <= d.perioden.gesperrtBis ? toast("Dieser Zeitraum ist bereits festgeschrieben.") : setConfirmFest(true))}>Festschreiben</Button>
              </Stack>
            )}
          </Stack>
        </Card>
      </Box>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Stack spacing={1.5}>
          <Typography sx={{ fontWeight: 700 }}>Export für Steuerberater und Betriebsprüfung</Typography>
          <Hinweis>Datenträgerüberlassung nach § 131 Abs 3 BAO: ZIP mit Journal, Belegliste mit Siegeln, Saldenliste, Kontenplan, Offenen Posten, Gesellschafter-Salden, Krediten, Projekten, Anlagen, Änderungsprotokoll, vollständigen Daten (JSON) und den Originalbelegen. Monatlich an Mag. Hauser schicken und zusätzlich ablegen.</Hinweis>
          <Stack direction="row" spacing={2} useFlexGap sx={{ alignItems: "center", flexWrap: "wrap" }}>
            <Box sx={{ width: 140 }}><Sel label="Jahr" value={jahr} onChange={setJahr} options={jahreVon(d.belege).map((j): [string, string] => [j, j])} /></Box>
            <FormControlLabel control={<Checkbox checked={orig} onChange={(e) => setOrig(e.target.checked)} />} label="Originalbelege beilegen" />
            <Button variant="contained" onClick={exportZip} disabled={working}>Prüfer-Export erstellen</Button>
          </Stack>
          {zipMsg && <Alert severity={zipMsg.startsWith("Export fehlgeschlagen") ? "error" : "info"}>{zipMsg}</Alert>}
        </Stack>
      </Card>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ mb: 1, fontWeight: 700 }}>Änderungsprotokoll</Typography>
        {d.protokoll.length ? (
          <TableContainer sx={{ maxHeight: 420 }}>
            <Table size="small" stickyHeader>
              <TableHead><TableRow><TableCell>Zeit</TableCell><TableCell>Wer</TableCell><TableCell>Vorgang</TableCell><TableCell>Details</TableCell></TableRow></TableHead>
              <TableBody>{d.protokoll.map((p) => <TableRow key={p.id}><TableCell sx={{ whiteSpace: "nowrap" }}>{dAT(p.zeit)} {(p.zeit || "").slice(11, 16)}</TableCell><TableCell>{who(p.user)}</TableCell><TableCell>{p.aktion}</TableCell><TableCell>{p.details}</TableCell></TableRow>)}</TableBody>
            </Table>
          </TableContainer>
        ) : <Typography variant="body2" color="text.secondary">Noch keine Einträge. Jeder Upload, jede Buchung, Freigabe, Storno und Festschreibung wird hier mit Person und Zeit festgehalten.</Typography>}
      </Card>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Typography sx={{ mb: 1, fontWeight: 700 }}>Was dieses Tool sicherstellt – und was nicht</Typography>
        <Stack spacing={1}>
          <Alert severity="info" icon={false}>Vollständig, richtig, zeitgerecht, geordnet (§ 190 UGB, § 131 BAO): lückenlose Belegnummern je Nummernkreis, Verweis jeder Buchung auf ihren Beleg, Warnung bei Überschreiten der Buchungsfrist (Monatsende + 1 Monat + 15 Tage), Kassa darf nie negativ werden.</Alert>
          <Alert severity="info" icon={false}>Unveränderbarkeit: Gebuchtes kann in der Oberfläche nicht geändert werden, nur storniert. Jede Buchung ist per SHA-256 mit der vorigen verkettet, die Originaldatei per Prüfsumme gesichert – eine Manipulation direkt an der Datenbank würde bei der Integritätsprüfung sichtbar.</Alert>
          <Alert severity="info" icon={false}>Aufbewahrung (§ 132 BAO): 7 Jahre, mit Grundstücksbezug 12 Jahre (bei bestimmten Grundstücken 22). Originale liegen im privaten Speicher; zur Sicherheit den monatlichen Prüfer-Export zusätzlich bei Mag. Hauser und in eurer Ablage speichern.</Alert>
          <Alert severity="warning" icon={false}>Kein zertifiziertes Buchhaltungsprogramm: Für den Jahresabschluss, die UVA und die Bilanz bleibt Mag. Hauser zuständig. Kontenplan und die Buchungslogik einmal mit ihm abstimmen, bevor ihr live geht.</Alert>
        </Stack>
      </Card>
    </Stack>
  );
}
