"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useBh } from "../BhProvider";
import { aendern, loeschen, neu, protokollieren } from "../api";
import { projektAuswertung } from "../logik/auswertung";
import { dAT, fmt } from "../logik/util";
import { useNav } from "../nav";
import { EuroField, Hinweis, Kpi, KpiGrid, Leer, Num, Pill, Sel, Txt } from "../ui";
import type { Projekt, ProjektStatus } from "../types";

const STATUS: ProjektStatus[] = ["Ankauf", "Sanierung", "Vermarktung", "Verkauft"];

export function Objekte() {
  const { sb, uid, d, reload, toast } = useBh();
  const { openBeleg, setTab } = useNav();
  const [form, setForm] = useState<Partial<Projekt> | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const auswertung = useMemo(() => d.projekte.map((p) => ({ p, a: projektAuswertung(d.belege, p) })), [d.projekte, d.belege]);
  const aktiv = auswertung.find((x) => x.p.id === sel) ?? null;
  const summe = auswertung.reduce((s, x) => ({ inv: s.inv + x.a.investiert, erl: s.erl + x.a.erloes }), { inv: 0, erl: 0 });

  const speichern = async () => {
    if (!form?.name?.trim()) return toast("Name fehlt.");
    try {
      const data = { name: form.name.trim(), adresse: form.adresse ?? "", status: form.status ?? "Ankauf", ankaufDatum: form.ankaufDatum ?? "", kaufpreisPlan: form.kaufpreisPlan ?? 0, notiz: form.notiz ?? "" };
      if (form.id) await aendern(sb, "projekte", form.id, data);
      else { await neu(sb, "projekte", data); protokollieren(sb, uid, "Projekt angelegt", data.name); }
      setForm(null);
      await reload();
    } catch (e) { toast("Speichern fehlgeschlagen: " + (e as Error).message); }
  };

  const loesche = async (p: Projekt) => {
    try { await loeschen(sb, "projekte", p.id); setSel(null); await reload(); }
    catch (e) { toast((e as Error).message); }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h6">Objekte &amp; Projekte</Typography>
        <Button variant="contained" onClick={() => setForm({ name: "", status: "Ankauf" })}>Projekt anlegen</Button>
      </Stack>
      {form && (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
            <Txt label="Bezeichnung (z. B. Grazbachgasse 5/7)" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Txt label="Adresse" value={form.adresse} onChange={(v) => setForm({ ...form, adresse: v })} />
            <Sel label="Status" value={form.status ?? "Ankauf"} onChange={(v) => setForm({ ...form, status: v as ProjektStatus })} options={STATUS.map((s): [string, string] => [s, s])} />
            <Txt label="Ankaufsdatum" type="date" value={form.ankaufDatum} onChange={(v) => setForm({ ...form, ankaufDatum: v })} />
            <EuroField label="Geplanter Kaufpreis €" value={form.kaufpreisPlan ?? 0} onChange={(v) => setForm({ ...form, kaufpreisPlan: v })} />
            <Txt label="Notiz" value={form.notiz} onChange={(v) => setForm({ ...form, notiz: v })} />
          </Box>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={speichern}>Speichern</Button>
            <Button onClick={() => setForm(null)}>Abbrechen</Button>
          </Stack>
        </Card>
      )}
      <KpiGrid>
        <Kpi label="Projekte" value={d.projekte.length} />
        <Kpi label="Investiertes Kapital gesamt" value={`${fmt(summe.inv)} €`} hint="Ankauf, Nebenkosten, Sanierung, Zinsen" />
        <Kpi label="Erlöse gesamt" value={`${fmt(summe.erl)} €`} />
        <Kpi label="Marge gesamt" value={`${fmt(summe.erl - summe.inv)} €`} negative={summe.erl - summe.inv < 0} hint="Projekte noch im Bestand zählen mit Erlös 0" />
      </KpiGrid>
      {!d.projekte.length ? (
        <Leer titel="Noch keine Projekte" text="Lege pro Wohnung ein Projekt an und ordne Belege im Editor dem Projekt zu. Hier siehst du dann Ankauf, Sanierung, Zinsen, Erlös, Marge und ROI je Objekt." />
      ) : (
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>Projekt</TableCell><TableCell>Status</TableCell><TableCell align="right">Ankauf €</TableCell><TableCell align="right">Nebenkosten €</TableCell>
              <TableCell align="right">Sanierung €</TableCell><TableCell align="right">Zinsen/Sonst. €</TableCell><TableCell align="right">Investiert €</TableCell>
              <TableCell align="right">Erlös €</TableCell><TableCell align="right">Marge €</TableCell><TableCell align="right">ROI</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {auswertung.map(({ p, a }) => (
                <TableRow key={p.id} hover selected={sel === p.id} sx={{ cursor: "pointer" }} onClick={() => setSel(sel === p.id ? null : p.id)}>
                  <TableCell>{p.name}<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{p.adresse}</Typography></TableCell>
                  <TableCell><Pill tone={p.status === "Verkauft" ? "ok" : "neu"}>{p.status}</Pill></TableCell>
                  <TableCell align="right"><Num>{fmt(a.ankauf)}</Num></TableCell>
                  <TableCell align="right"><Num>{fmt(a.nebenkosten)}</Num></TableCell>
                  <TableCell align="right"><Num>{fmt(a.material + a.handwerker)}</Num></TableCell>
                  <TableCell align="right"><Num>{fmt(a.zinsen + a.sonstiges)}</Num></TableCell>
                  <TableCell align="right"><Num>{fmt(a.investiert)}</Num></TableCell>
                  <TableCell align="right"><Num>{fmt(a.erloes)}</Num></TableCell>
                  <TableCell align="right"><Num neg={a.marge < 0}>{a.erloes ? fmt(a.marge) : "–"}</Num></TableCell>
                  <TableCell align="right"><Num>{a.roi == null ? "–" : `${(a.roi * 100).toLocaleString("de-AT", { maximumFractionDigits: 1 })} %`}</Num></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {aktiv && (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>{aktiv.p.name} · Belege</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setForm(aktiv.p)}>Bearbeiten</Button>
              <Button size="small" color="error" disabled={aktiv.a.belege.length > 0} onClick={() => loesche(aktiv.p)}>Löschen</Button>
            </Stack>
          </Stack>
          <Typography variant="caption" color="text.secondary">
            {aktiv.p.ankaufDatum ? `Ankauf ${dAT(aktiv.p.ankaufDatum)}` : ""}{aktiv.p.kaufpreisPlan ? ` · geplanter Kaufpreis ${fmt(Math.round(aktiv.p.kaufpreisPlan * 100))} €` : ""}
          </Typography>
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead><TableRow><TableCell>Datum</TableCell><TableCell>Beleg</TableCell><TableCell>Partner</TableCell><TableCell>Text</TableCell></TableRow></TableHead>
            <TableBody>
              {aktiv.a.belege.sort((x, y) => (y.belegdatum || "").localeCompare(x.belegdatum || "")).map((b) => (
                <TableRow key={b.id} hover sx={{ cursor: "pointer" }} onClick={() => { openBeleg(b); setTab("belege"); }}>
                  <TableCell>{dAT(b.belegdatum)}</TableCell><TableCell>{b.nr}</TableCell><TableCell>{b.partner}</TableCell><TableCell>{b.beschreibung}</TableCell>
                </TableRow>
              ))}
              {!aktiv.a.belege.length && <TableRow><TableCell colSpan={4}><Typography variant="body2" color="text.secondary">Noch keine gebuchten Belege zu diesem Projekt.</Typography></TableCell></TableRow>}
            </TableBody>
          </Table>
        </Card>
      )}
      <Hinweis>Investiert = Ankauf (5000), Nebenkosten (5100), Material (5300), Handwerker (5800), Zinsen (8280) und sonstiger Aufwand mit Projektbezug. Erlös = Klasse 4 mit Projektbezug (z. B. 4000/4020). Objektkosten mit Vorsteuerabzug sind nur richtig, wenn beim Verkauf zur USt optiert wird.</Hinweis>
    </Stack>
  );
}
