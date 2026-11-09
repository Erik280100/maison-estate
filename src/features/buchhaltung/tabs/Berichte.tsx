"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableFooter from "@mui/material/TableFooter";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useBh } from "../BhProvider";
import { KLASSE } from "../konten";
import { bisMonat, monateVon, salden, ustJeMonat } from "../logik/auswertung";
import { csvJournal, csvSalden, journalRows, speichern, toCsv } from "../logik/export";
import { addMonths, dAT, fmt, mName } from "../logik/util";
import { useNav } from "../nav";
import { Hinweis, Kpi, KpiGrid, Leer, Num, Pill, Sel } from "./../ui";

export function Journal() {
  const { d, ctx } = useBh();
  const { openBeleg, setTab } = useNav();
  const [monat, setMonat] = useState("");
  const [projekt, setProjekt] = useState("");
  const rows = useMemo(() => journalRows(d.belege).filter((r) => (!monat || (r.b.belegdatum || "").startsWith(monat)) && (!projekt || r.b.projektId === projekt)), [d.belege, monat, projekt]);
  const so = rows.reduce((a, r) => a + (r.l.soll || 0), 0), ha = rows.reduce((a, r) => a + (r.l.haben || 0), 0);
  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h6">Journal</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ width: 190 }}><Sel label="Monat" value={monat} onChange={setMonat} options={[["", "Alle"], ...monateVon(d.belege).map((m): [string, string] => [m, mName(m)])]} /></Box>
          <Box sx={{ width: 190 }}><Sel label="Projekt" value={projekt} onChange={setProjekt} options={[["", "Alle"], ...d.projekte.map((p): [string, string] => [p.id, p.name])]} /></Box>
          <Button variant="outlined" onClick={() => speichern(`Journal_Maison_Estate_${monat || "gesamt"}.csv`, toCsv(csvJournal(rows, ctx.konten)), "text/csv")}>CSV</Button>
        </Stack>
      </Stack>
      {rows.length ? (
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Datum</TableCell><TableCell>Beleg-Nr.</TableCell><TableCell>Konto</TableCell><TableCell>Text</TableCell><TableCell>Projekt</TableCell><TableCell align="right">Soll €</TableCell><TableCell align="right">Haben €</TableCell></TableRow></TableHead>
            <TableBody>
              {rows.map(({ b, l, i }, n) => (
                <TableRow key={n} hover sx={{ cursor: "pointer" }} onClick={() => { openBeleg(b); setTab("belege"); }}>
                  <TableCell>{i === 0 ? dAT(b.belegdatum) : ""}</TableCell>
                  <TableCell>{i === 0 ? <>{b.nr} {b.storniert && <Pill tone="err">storniert</Pill>}</> : ""}</TableCell>
                  <TableCell>{l.konto} <Typography component="span" variant="caption" color="text.secondary">{d.gesellschafter.length ? "" : ""}</Typography></TableCell>
                  <TableCell>{l.text || b.beschreibung}</TableCell>
                  <TableCell>{d.projekte.find((p) => p.id === b.projektId)?.name ?? b.objekt}</TableCell>
                  <TableCell align="right"><Num>{l.soll ? fmt(l.soll) : ""}</Num></TableCell>
                  <TableCell align="right"><Num>{l.haben ? fmt(l.haben) : ""}</Num></TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter><TableRow><TableCell colSpan={5}>Summe</TableCell><TableCell align="right"><Num>{fmt(so)}</Num></TableCell><TableCell align="right"><Num>{fmt(ha)}</Num></TableCell></TableRow></TableFooter>
          </Table>
        </TableContainer>
      ) : <Leer titel="Noch keine Buchungen" text="Gebuchte Belege erscheinen hier chronologisch mit allen Soll- und Haben-Zeilen." />}
    </Stack>
  );
}

export function Saldenliste() {
  const { d, ctx } = useBh();
  const [monat, setMonat] = useState("");
  const [konto, setKonto] = useState<string | null>(null);
  const f = monat ? bisMonat(monat) : null;
  const s = useMemo(() => salden(d.belege, f), [d.belege, f]);
  const sum = (pre: string[]) => s.filter(([k]) => pre.includes(k[0])).reduce((a, [, v]) => a + (v.s - v.h), 0);
  const erl = -sum(["4"]), aufw = sum(["5", "7", "8"]);
  const sal = (k: string) => { const x = s.find(([kk]) => kk === k); return x ? x[1].s - x[1].h : 0; };
  const blatt = konto ? journalRows(d.belege).filter((r) => r.l.konto === konto && (!f || f(r.b))) : [];
  const blattSaldo = blatt.reduce<{ b: (typeof blatt)[number]["b"]; l: (typeof blatt)[number]["l"]; saldo: number }[]>(
    (a, r) => [...a, { b: r.b, l: r.l, saldo: (a.length ? a[a.length - 1].saldo : 0) + (r.l.soll || 0) - (r.l.haben || 0) }],
    [],
  );
  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h6">Saldenliste</Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ width: 220 }}><Sel label="Stand bis" value={monat} onChange={setMonat} options={[["", "heute"], ...monateVon(d.belege).map((m): [string, string] => [m, `Ende ${mName(m)}`])]} /></Box>
          <Button variant="outlined" onClick={() => speichern(`Saldenliste_Maison_Estate_${monat || "aktuell"}.csv`, toCsv(csvSalden(d.belege, f, ctx.konten)), "text/csv")}>CSV</Button>
        </Stack>
      </Stack>
      <KpiGrid>
        <Kpi label="Erlöse (Klasse 4)" value={`${fmt(erl)} €`} />
        <Kpi label="Aufwand (Klassen 5–8)" value={`${fmt(aufw)} €`} />
        <Kpi label="Vorläufiges Ergebnis" value={`${fmt(erl - aufw)} €`} negative={erl - aufw < 0} />
        <Kpi label="Bank (2800)" value={`${fmt(sal("2800"))} €`} negative={sal("2800") < 0} />
        <Kpi label="Kredite (3150)" value={`${fmt(-sal("3150"))} €`} />
      </KpiGrid>
      {konto && (
        <Box>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}><Typography sx={{ fontWeight: 700 }}>Kontoblatt {konto} · {ctx.konten[konto]}</Typography><Button size="small" onClick={() => setKonto(null)}>Schließen</Button></Stack>
          <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2, mt: 1 }}>
            <Table size="small">
              <TableHead><TableRow><TableCell>Datum</TableCell><TableCell>Beleg-Nr.</TableCell><TableCell>Text</TableCell><TableCell align="right">Soll €</TableCell><TableCell align="right">Haben €</TableCell><TableCell align="right">Saldo €</TableCell></TableRow></TableHead>
              <TableBody>
                {blattSaldo.map(({ b, l, saldo: run }, i) => { return (
                  <TableRow key={i}><TableCell>{dAT(b.belegdatum)}</TableCell><TableCell>{b.nr}</TableCell><TableCell>{l.text || b.beschreibung}</TableCell>
                    <TableCell align="right"><Num>{l.soll ? fmt(l.soll) : ""}</Num></TableCell><TableCell align="right"><Num>{l.haben ? fmt(l.haben) : ""}</Num></TableCell><TableCell align="right"><Num neg={run < 0}>{fmt(run)}</Num></TableCell></TableRow>
                ); })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      {s.length ? (
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Konto</TableCell><TableCell>Bezeichnung</TableCell><TableCell align="right">Soll €</TableCell><TableCell align="right">Haben €</TableCell><TableCell align="right">Saldo €</TableCell></TableRow></TableHead>
            <TableBody>
              {s.map(([k, v], idx) => {
                const head = idx === 0 || s[idx - 1][0][0] !== k[0] ? (<TableRow key={"h" + k}><TableCell colSpan={5} sx={{ bgcolor: "action.hover", fontWeight: 700 }}>Klasse {k[0]} · {KLASSE[k[0]] ?? ""}</TableCell></TableRow>) : null;
                const sl = v.s - v.h;
                return [head, <TableRow key={k} hover sx={{ cursor: "pointer" }} onClick={() => setKonto(k)}><TableCell>{k}</TableCell><TableCell>{ctx.konten[k] ?? "Unbekanntes Konto"}</TableCell>
                  <TableCell align="right"><Num>{fmt(v.s)}</Num></TableCell><TableCell align="right"><Num>{fmt(v.h)}</Num></TableCell><TableCell align="right"><Num>{fmt(Math.abs(sl))} {sl >= 0 ? "S" : "H"}</Num></TableCell></TableRow>];
              })}
            </TableBody>
            <TableFooter><TableRow><TableCell colSpan={2}>Summe</TableCell><TableCell align="right"><Num>{fmt(s.reduce((a, [, v]) => a + v.s, 0))}</Num></TableCell><TableCell align="right"><Num>{fmt(s.reduce((a, [, v]) => a + v.h, 0))}</Num></TableCell><TableCell /></TableRow></TableFooter>
          </Table>
        </TableContainer>
      ) : <Leer titel="Noch keine Salden" text="Sobald Belege gebucht sind, zeigt die Saldenliste jedes bebuchte Konto mit Soll, Haben und Saldo." />}
      <Hinweis>Das vorläufige Ergebnis rechnet Ankäufe und Sanierungen als Aufwand; den Bestand unverkaufter Wohnungen bucht Mag. Hauser beim Jahresabschluss ein. Kontenplan angelehnt an den österreichischen Einheitskontenrahmen – vor dem ersten Abschluss mit Mag. Hauser abstimmen.</Hinweis>
    </Stack>
  );
}

export function Umsatzsteuer() {
  const { d } = useBh();
  const m = useMemo(() => ustJeMonat(d.belege), [d.belege]);
  const ms = Object.keys(m).sort().reverse();
  return (
    <Stack spacing={2}>
      <Typography variant="h6">Umsatzsteuer je Monat</Typography>
      <Hinweis>Kontrollrechnung aus den gebuchten Belegen nach Belegdatum. Die UVA ist bis zum 15. des zweitfolgenden Monats fällig und wird von Mag. Hauser abgegeben – diese Werte dienen zum Abgleich.</Hinweis>
      {ms.length ? (
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Monat</TableCell><TableCell>UVA fällig</TableCell><TableCell align="right">Umsatzsteuer €</TableCell><TableCell align="right">davon Reverse Charge €</TableCell><TableCell align="right">Vorsteuer €</TableCell><TableCell align="right">Zahllast / Gutschrift €</TableCell></TableRow></TableHead>
            <TableBody>
              {ms.map((k) => { const x = m[k], z = x.ust - x.vst; return (
                <TableRow key={k}><TableCell>{mName(k)}</TableCell><TableCell>{dAT(addMonths(k + "-15", 2))}</TableCell>
                  <TableCell align="right"><Num>{fmt(x.ust)}</Num></TableCell><TableCell align="right"><Num>{fmt(x.rc)}</Num></TableCell><TableCell align="right"><Num>{fmt(x.vst)}</Num></TableCell>
                  <TableCell align="right">{z >= 0 ? <Pill tone="warn">Zahllast</Pill> : <Pill tone="ok">Gutschrift</Pill>} <Num>{fmt(Math.abs(z))}</Num></TableCell></TableRow>
              ); })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : <Leer titel="Noch keine Umsatzsteuer gebucht" text="Vorsteuer aus Eingangsrechnungen und USt aus Ausgangsrechnungen werden hier pro Monat gegenübergestellt." />}
    </Stack>
  );
}
