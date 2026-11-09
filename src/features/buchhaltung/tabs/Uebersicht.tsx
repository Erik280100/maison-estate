"use client";

import { useMemo, useState } from "react";
import { BarElement, CategoryScale, Chart as ChartJS, Legend, LinearScale, Tooltip } from "chart.js";
import { Bar } from "react-chartjs-2";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useBh } from "../BhProvider";
import { gsSalden, jahreVon, uebersicht, ustJeMonat } from "../logik/auswertung";
import { dAT, fmt } from "../logik/util";
import { Kpi, KpiGrid, Leer, Num, Sel } from "../ui";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const MONATE = ["Jän", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];

export function Uebersicht() {
  const { d, ctx } = useBh();
  const jahre = useMemo(() => jahreVon(d.belege), [d.belege]);
  const [jahr, setJahr] = useState(jahre[0]);
  const u = useMemo(() => uebersicht(d.belege, jahr), [d.belege, jahr]);
  const gs = useMemo(() => gsSalden(d.belege, d.gesellschafter), [d.belege, d.gesellschafter]);
  const ust = useMemo(() => ustJeMonat(d.belege), [d.belege]);
  const offenGs = gs.reduce((a, g) => a + Math.max(0, g.saldo), 0);
  const zahllast = Object.entries(ust).filter(([m]) => m.startsWith(jahr)).reduce((a, [, x]) => a + x.ust - x.vst, 0);
  const ergebnis = u.summe.einnahmen - u.summe.ausgaben;
  const keine = !d.belege.some((b) => b.status === "Gebucht");

  const labels = Object.keys(u.monate).map((m) => MONATE[Number(m.slice(5)) - 1]);
  const vals = Object.values(u.monate);
  const data = {
    labels,
    datasets: [
      { label: "Einnahmen", data: vals.map((m) => m.einnahmen / 100), backgroundColor: "#4c9a6a" },
      { label: "Ausgaben", data: vals.map((m) => m.ausgaben / 100), backgroundColor: "#c25b5b" },
      { label: "Investition Objekte", data: vals.map((m) => m.invObjekte / 100), backgroundColor: "#c2a467" },
      { label: "Investition Anlagen", data: vals.map((m) => m.invAnlagen / 100), backgroundColor: "#6d7fa8" },
    ],
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h6">Übersicht {jahr}</Typography>
        <Box sx={{ width: 140 }}><Sel label="Jahr" value={jahr} onChange={setJahr} options={jahre.map((j): [string, string] => [j, j])} /></Box>
      </Stack>
      {keine && <Leer titel="Noch keine Buchungen" text="Sobald Belege gebucht sind, zeigt die Übersicht Einnahmen, Ausgaben und Investitionen." />}
      <KpiGrid>
        <Kpi label="Einnahmen" value={`${fmt(u.summe.einnahmen)} €`} hint="Erlöse (Klasse 4)" />
        <Kpi label="Ausgaben" value={`${fmt(u.summe.ausgaben)} €`} hint="laufender Aufwand ohne Objektkosten" />
        <Kpi label="Investition Objekte" value={`${fmt(u.summe.invObjekte)} €`} hint="Ankauf, Nebenkosten, Sanierung" />
        <Kpi label="Investition Anlagevermögen" value={`${fmt(u.summe.invAnlagen)} €`} hint="Zugänge Klasse 0" />
        <Kpi label="Ergebnis laufend" value={`${fmt(ergebnis)} €`} negative={ergebnis < 0} hint="Einnahmen − Ausgaben (ohne Investitionen)" />
        <Kpi label="Bank (2800)" value={`${fmt(u.bank)} €`} negative={u.bank < 0} />
        <Kpi label="Kassa (2700)" value={`${fmt(u.kassa)} €`} negative={u.kassa < 0} />
        <Kpi label="Offene Auslagen Gesellschafter" value={`${fmt(offenGs)} €`} hint="privat bezahlt, noch nicht erstattet" />
        <Kpi label="USt-Zahllast (Gutschrift −)" value={`${fmt(zahllast)} €`} negative={zahllast < 0} />
      </KpiGrid>
      <Card variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ height: 300 }}>
          <Bar data={data} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } }, scales: { y: { ticks: { callback: (v) => `${Number(v).toLocaleString("de-AT")} €` } } } }} />
        </Box>
      </Card>
      <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Größte Kostenarten</Typography>
          {u.topKosten.length ? (
            <Table size="small"><TableBody>
              {u.topKosten.map((k) => (
                <TableRow key={k.konto}><TableCell>{k.konto} {ctx.konten[k.konto]}</TableCell><TableCell align="right"><Num>{fmt(k.betrag)} €</Num></TableCell></TableRow>
              ))}
            </TableBody></Table>
          ) : <Typography variant="body2" color="text.secondary">Keine Kosten in diesem Jahr.</Typography>}
        </Card>
        <Card variant="outlined" sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">Zuletzt gebucht</Typography>
          <Table size="small"><TableBody>
            {d.belege.filter((b) => b.status === "Gebucht").sort((a, b) => (b.seq || 0) - (a.seq || 0)).slice(0, 8).map((b) => (
              <TableRow key={b.id}><TableCell>{dAT(b.belegdatum)}</TableCell><TableCell>{b.nr}</TableCell><TableCell>{b.partner}</TableCell></TableRow>
            ))}
          </TableBody></Table>
        </Card>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Vorläufige Werte aus den gebuchten Belegen. Objektankäufe zählen als Investition, nicht als Aufwand; den Bestand bucht Mag. Hauser beim Jahresabschluss.
      </Typography>
    </Stack>
  );
}
