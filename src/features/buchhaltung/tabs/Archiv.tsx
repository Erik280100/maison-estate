"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useBh } from "../BhProvider";
import { ARTEN } from "../konten";
import { aufbewahrungBis } from "../logik/buchung";
import { jahreVon } from "../logik/auswertung";
import { dAT, fmt, sumL } from "../logik/util";
import { useNav } from "../nav";
import { Leer, Num, Pill, Sel, Txt } from "../ui";

export function Archiv() {
  const { d, who } = useBh();
  const { openBeleg, setTab } = useNav();
  const [q, setQ] = useState("");
  const [jahr, setJahr] = useState("");
  const [art, setArt] = useState("");
  const [projekt, setProjekt] = useState("");
  const [gs, setGs] = useState("");

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return d.belege
      .filter((b) => (!jahr || (b.belegdatum || "").startsWith(jahr)) && (!art || b.art === art) && (!projekt || b.projektId === projekt) && (!gs || b.gs === gs))
      .filter((b) => !s || [b.partner, b.rechnungsnr, b.beschreibung, b.nr, b.fileName, b.objekt].some((x) => (x || "").toLowerCase().includes(s)))
      .sort((a, b) => (b.belegdatum || "").localeCompare(a.belegdatum || "") || (b.seq || 0) - (a.seq || 0));
  }, [d.belege, q, jahr, art, projekt, gs]);

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Belegarchiv</Typography>
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
        <Txt label="Suche (Partner, Rechnungsnr., Text …)" value={q} onChange={setQ} />
        <Sel label="Jahr" value={jahr} onChange={setJahr} options={[["", "Alle"], ...jahreVon(d.belege).map((j): [string, string] => [j, j])]} />
        <Sel label="Art" value={art} onChange={setArt} options={[["", "Alle"], ...Object.entries(ARTEN)]} />
        <Sel label="Projekt" value={projekt} onChange={setProjekt} options={[["", "Alle"], ...d.projekte.map((p): [string, string] => [p.id, p.name])]} />
        <Sel label="Bezahlt von" value={gs} onChange={setGs} options={[["", "Alle"], ...d.gesellschafter.map((g): [string, string] => [g.id, g.name])]} />
      </Box>
      {rows.length ? (
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>Datum</TableCell><TableCell>Beleg-Nr.</TableCell><TableCell>Art</TableCell><TableCell>Partner</TableCell><TableCell>Projekt</TableCell>
              <TableCell>Bezahlt von</TableCell><TableCell align="right">Betrag €</TableCell><TableCell>Status</TableCell><TableCell>Aufbewahrung</TableCell><TableCell>Original</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id} hover sx={{ cursor: "pointer" }} onClick={() => { openBeleg(b); setTab("belege"); }}>
                  <TableCell>{dAT(b.belegdatum)}</TableCell>
                  <TableCell>{b.nr || "–"}</TableCell>
                  <TableCell>{ARTEN[b.art]}</TableCell>
                  <TableCell>{b.partner}<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{b.rechnungsnr}</Typography></TableCell>
                  <TableCell>{d.projekte.find((p) => p.id === b.projektId)?.name ?? b.objekt ?? ""}</TableCell>
                  <TableCell>{b.gs ? d.gesellschafter.find((g) => g.id === b.gs)?.name : ""}</TableCell>
                  <TableCell align="right"><Num>{fmt(b.status === "Gebucht" ? sumL(b.zeilen || [], "soll") : Math.round((b.brutto ?? 0) * 100))}</Num></TableCell>
                  <TableCell>{b.storniert ? <Pill tone="err">storniert</Pill> : b.status === "Gebucht" ? <Pill tone="ok">gebucht</Pill> : <Pill tone="warn">Entwurf</Pill>}</TableCell>
                  <TableCell>{aufbewahrungBis(b).bis}</TableCell>
                  <TableCell>{b.assetId ? "✓" : "–"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : <Leer titel="Keine Belege gefunden" text="Abgelegte Belege erscheinen hier – Original öffnen per Klick auf die Zeile." />}
      <Typography variant="caption" color="text.secondary">{rows.length} Belege · erfasst von {rows.length ? who(rows[0].erfasstVon) : "–"} (neuester)</Typography>
    </Stack>
  );
}
