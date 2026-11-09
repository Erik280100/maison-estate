"use client";

import { useMemo } from "react";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useBh } from "../BhProvider";
import { VIER_AUGEN } from "../konten";
import { offenePosten } from "../logik/op";
import { dAT, fmt, today } from "../logik/util";
import { useNav } from "../nav";
import { Hinweis, Kpi, KpiGrid, Leer, Num, Pill } from "../ui";

export function OffenePosten() {
  const { d } = useBh();
  const { openBeleg, setTab } = useNav();
  const ops = useMemo(() => offenePosten(d.belege), [d.belege]);
  const td = today();
  const ueber = ops.filter((o) => o.b.faellig && o.b.faellig < td).length;
  const sV = ops.filter((o) => o.konto === "3300").reduce((a, o) => a + o.offen, 0);
  const sF = ops.filter((o) => o.konto === "2000").reduce((a, o) => a + o.offen, 0);
  return (
    <Stack spacing={2}>
      <Typography variant="h6">Offene Posten</Typography>
      <KpiGrid>
        <Kpi label="Offene Verbindlichkeiten" value={`${fmt(sV)} €`} />
        <Kpi label="Offene Forderungen" value={`${fmt(sF)} €`} />
        <Kpi label="Überfällig" value={ueber} negative={ueber > 0} />
      </KpiGrid>
      {ops.length ? (
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Fällig</TableCell><TableCell>Beleg</TableCell><TableCell>Partner</TableCell><TableCell>Art</TableCell><TableCell align="right">Betrag €</TableCell><TableCell align="right">Offen €</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
            <TableBody>
              {ops.map((o) => {
                const f = o.b.faellig || "";
                const fg = o.konto === "3300" && o.offen >= VIER_AUGEN ? (o.b.freigabeVon ? <Pill tone="ok">freigegeben</Pill> : <Pill tone="warn">Freigabe fehlt</Pill>) : null;
                return (
                  <TableRow key={o.b.id} hover sx={{ cursor: "pointer" }} onClick={() => { openBeleg(o.b); setTab("belege"); }}>
                    <TableCell>{dAT(f || o.b.belegdatum)}</TableCell>
                    <TableCell>{o.b.nr}</TableCell>
                    <TableCell>{o.b.partner}<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{o.b.rechnungsnr}</Typography></TableCell>
                    <TableCell>{o.typ}</TableCell>
                    <TableCell align="right"><Num>{fmt(o.betrag)}</Num></TableCell>
                    <TableCell align="right"><Num>{fmt(o.offen)}</Num></TableCell>
                    <TableCell>{f && f < td ? <Pill tone="err">überfällig</Pill> : <Pill tone="neu">offen</Pill>} {fg}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : <Leer titel="Keine offenen Posten" text="Gebuchte Rechnungen auf 3300 bzw. 2000 erscheinen hier, bis die Zahlung über den Kontoauszug gebucht ist." />}
      <Hinweis>Rechnungen ab 5.000 € brauchen vor der Zahlung die Freigabe eines zweiten Gesellschafters (Vier-Augen-Prinzip). Privat bezahlte Rechnungen stehen nicht hier, sondern im Reiter „Gesellschafter“.</Hinweis>
    </Stack>
  );
}
