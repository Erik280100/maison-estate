"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
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
import { manuellerEntwurf } from "../entwurf";
import { ANLAGE_KONTEN } from "../konten";
import { afaBelegDatum, afaGebuchtMap, afaKontoFuer, afaPlan, istGwg, mindestNutzungsdauer, naechsteAfa } from "../logik/auswertung";
import { cents, dAT, fmt, today } from "../logik/util";
import { useNav } from "../nav";
import { EuroField, Hinweis, Kpi, KpiGrid, Leer, Num, Pill, Sel, Txt } from "../ui";
import type { Anlage } from "../types";

export function Anlagen() {
  const { sb, uid, d, ctx, reload, toast } = useBh();
  const { openBeleg, setTab } = useNav();
  const [form, setForm] = useState<Partial<Anlage> | null>(null);
  const [sel, setSel] = useState<string | null>(null);

  const zeilen = useMemo(
    () => d.anlagen.map((a) => {
      const gebucht = Object.values(afaGebuchtMap(d.belege, a)).reduce((s, x) => s + x, 0);
      return { a, gebucht, rest: cents(a.ak) - gebucht, plan: afaPlan(a) };
    }).sort((x, y) => y.a.anschaffung.localeCompare(x.a.anschaffung)),
    [d.anlagen, d.belege],
  );
  const aktiv = zeilen.find((z) => z.a.id === sel) ?? null;
  const summeAk = zeilen.reduce((s, z) => s + cents(z.a.ak), 0);
  const summeRest = zeilen.reduce((s, z) => s + z.rest, 0);

  const speichern = async () => {
    if (!form?.bezeichnung?.trim() || !form.ak) return toast("Bezeichnung und Anschaffungskosten fehlen.");
    const konto = form.konto ?? "0620";
    const min = mindestNutzungsdauer(konto);
    const data = { bezeichnung: form.bezeichnung.trim(), konto, anschaffung: form.anschaffung || today(), ak: form.ak, nutzungsdauer: Math.max(min, form.nutzungsdauer ?? 3), belegId: form.belegId ?? null };
    try {
      if (form.id) await aendern(sb, "anlagen", form.id, data);
      else { await neu(sb, "anlagen", data); protokollieren(sb, uid, "Anlage angelegt", data.bezeichnung); }
      setForm(null);
      await reload();
    } catch (e) { toast("Speichern fehlgeschlagen: " + (e as Error).message); }
  };

  const afaEntwurf = async (a: Anlage) => {
    const n = naechsteAfa(d.belege, a);
    if (!n) return toast("Keine weitere AfA offen.");
    try {
      const b = await manuellerEntwurf(sb, uid, {
        belegdatum: afaBelegDatum(n.jahr), partner: a.bezeichnung, anlageId: a.id, afaJahr: n.jahr,
        beschreibung: `AfA ${n.jahr}: ${a.bezeichnung}`,
        zeilen: [{ konto: afaKontoFuer(a), soll: n.afa, haben: 0, text: `AfA ${n.jahr}` }, { konto: a.konto, soll: 0, haben: n.afa, text: a.bezeichnung }],
        hinweise: ["Jahres-AfA zum 31.12. – Steuerberater stimmt Nutzungsdauer und Halbjahresregel im Jahresabschluss ab."],
      });
      await reload();
      openBeleg(b);
      setTab("belege");
    } catch (e) { toast("Fehler: " + (e as Error).message); }
  };

  const loesche = async (a: Anlage) => {
    try { await loeschen(sb, "anlagen", a.id); setSel(null); await reload(); }
    catch (e) { toast((e as Error).message); }
  };

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h6">Anlagenverzeichnis</Typography>
        <Button variant="contained" onClick={() => setForm({ konto: "0620", anschaffung: today(), nutzungsdauer: 3, ak: 0 })}>Anlage erfassen</Button>
      </Stack>
      <Alert severity="info">
        Rechnungen mit Positionen auf Anlagenkonten (0010–0680) legen beim Buchen automatisch eine Anlage an. Hier kannst du zusätzlich Anlagen von Hand erfassen. Die AfA
        wird je Jahr als Buchungsentwurf erzeugt (Halbjahresregel, GWG bis 1.000 € sofort, PKW mindestens 8 Jahre).
      </Alert>
      {form && (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
            <Txt label="Bezeichnung" value={form.bezeichnung} onChange={(v) => setForm({ ...form, bezeichnung: v })} />
            <Sel label="Anlagenkonto" value={form.konto ?? "0620"} onChange={(v) => setForm({ ...form, konto: v, nutzungsdauer: Math.max(form.nutzungsdauer ?? 1, mindestNutzungsdauer(v)) })}
              options={ANLAGE_KONTEN.map((k): [string, string] => [k, `${k} ${ctx.konten[k]}`])} />
            <Txt label="Anschaffung" type="date" value={form.anschaffung} onChange={(v) => setForm({ ...form, anschaffung: v })} />
            <EuroField label="Anschaffungskosten netto €" value={form.ak ?? 0} onChange={(v) => setForm({ ...form, ak: v })} />
            <Sel label="Nutzungsdauer (Jahre)" value={form.nutzungsdauer ?? 3} onChange={(v) => setForm({ ...form, nutzungsdauer: Number(v) })}
              options={[1, 3, 4, 5, 8, 10, 15].filter((j) => j >= mindestNutzungsdauer(form.konto ?? "0620")).map((j): [number, string] => [j, String(j)])} />
          </Box>
          {form.konto === "0630" && <Hinweis>PKW: Mindestnutzungsdauer 8 Jahre, kein Vorsteuerabzug; Anschaffungskosten über der Luxustangente (ca. 40.000 €) sind nicht abschreibbar – mit Mag. Hauser klären.</Hinweis>}
          {form.ak != null && istGwg(form.ak) && form.ak > 0 && <Hinweis>Bis 1.000 € netto: geringwertiges Wirtschaftsgut, Sofortabschreibung im Jahr der Anschaffung.</Hinweis>}
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={speichern}>Speichern</Button>
            <Button onClick={() => setForm(null)}>Abbrechen</Button>
          </Stack>
        </Card>
      )}
      <KpiGrid>
        <Kpi label="Anlagen" value={zeilen.length} />
        <Kpi label="Anschaffungskosten" value={`${fmt(summeAk)} €`} />
        <Kpi label="Restbuchwert (laut Buchungen)" value={`${fmt(summeRest)} €`} />
      </KpiGrid>
      {!zeilen.length ? (
        <Leer titel="Noch keine Anlagen" text="Büroausstattung, EDV, Fahrzeuge oder Software erscheinen hier, sobald sie gebucht oder erfasst sind." />
      ) : (
        <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
          <Table size="small">
            <TableHead><TableRow><TableCell>Anlage</TableCell><TableCell>Konto</TableCell><TableCell>Anschaffung</TableCell><TableCell align="right">AK €</TableCell><TableCell align="right">ND</TableCell><TableCell align="right">AfA gebucht €</TableCell><TableCell align="right">Restbuchwert €</TableCell><TableCell>AfA</TableCell></TableRow></TableHead>
            <TableBody>
              {zeilen.map(({ a, gebucht, rest }) => {
                const n = naechsteAfa(d.belege, a);
                return (
                  <TableRow key={a.id} hover selected={sel === a.id} sx={{ cursor: "pointer" }} onClick={() => setSel(sel === a.id ? null : a.id)}>
                    <TableCell>{a.bezeichnung}</TableCell><TableCell>{a.konto}</TableCell><TableCell>{dAT(a.anschaffung)}</TableCell>
                    <TableCell align="right"><Num>{fmt(cents(a.ak))}</Num></TableCell><TableCell align="right">{a.nutzungsdauer}</TableCell>
                    <TableCell align="right"><Num>{fmt(gebucht)}</Num></TableCell><TableCell align="right"><Num>{fmt(rest)}</Num></TableCell>
                    <TableCell>{n ? <Pill tone="warn">{`offen ${n.jahr}`}</Pill> : <Pill tone="ok">erledigt</Pill>}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      {aktiv && (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>AfA-Plan · {aktiv.a.bezeichnung}</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" disabled={!naechsteAfa(d.belege, aktiv.a)} onClick={() => afaEntwurf(aktiv.a)}>
                {naechsteAfa(d.belege, aktiv.a) ? `AfA ${naechsteAfa(d.belege, aktiv.a)!.jahr} als Entwurf anlegen` : "AfA vollständig"}
              </Button>
              <Button size="small" onClick={() => setForm(aktiv.a)}>Bearbeiten</Button>
              <Button size="small" color="error" disabled={aktiv.gebucht > 0} onClick={() => loesche(aktiv.a)}>Löschen</Button>
            </Stack>
          </Stack>
          <Table size="small" sx={{ mt: 1 }}>
            <TableHead><TableRow><TableCell>Jahr</TableCell><TableCell align="right">AfA € (Plan)</TableCell><TableCell align="right">Restbuchwert € (Plan)</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
            <TableBody>
              {aktiv.plan.map((r) => {
                const m = afaGebuchtMap(d.belege, aktiv.a)[r.jahr];
                const entwurf = d.belege.some((b) => b.status === "Entwurf" && b.anlageId === aktiv.a.id && b.afaJahr === r.jahr);
                return (
                  <TableRow key={r.jahr}><TableCell>{r.jahr}</TableCell><TableCell align="right"><Num>{fmt(r.afa)}</Num></TableCell><TableCell align="right"><Num>{fmt(r.restbuchwert)}</Num></TableCell>
                    <TableCell>{m ? <Pill tone="ok">gebucht</Pill> : entwurf ? <Pill tone="warn">Entwurf</Pill> : <Pill tone="neu">offen</Pill>}</TableCell></TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
      <Hinweis>Lineare AfA; im Jahr der Anschaffung volle AfA bei Anschaffung bis 30.6., sonst die Hälfte (Halbjahresregel, § 7 Abs 2 EStG). Nutzungsdauern sind Richtwerte – Kontenplan und AfA-Methode einmal mit Mag. Hauser abstimmen.</Hinweis>
    </Stack>
  );
}
