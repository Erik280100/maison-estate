"use client";

import { useMemo, useRef, useState } from "react";
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
import { aendern, neu, protokollieren } from "../api";
import { manuellerEntwurf } from "../entwurf";
import { gebucht } from "../logik/buchung";
import { kreditRestBuch, planGebucht, tilgungsplan } from "../logik/kredit";
import { cents, dAT, fmt, fmtE, today } from "../logik/util";
import { useNav } from "../nav";
import { dateiAblegen } from "../upload";
import { EuroField, Hinweis, Kpi, KpiGrid, Leer, Num, Pill, Sel, Txt } from "../ui";
import type { Kredit } from "../types";

const LEER: Omit<Kredit, "id"> = {
  bank: "", kreditnr: "", bezeichnung: "", betrag: 0, zinssatz: 3.5, zinsart: "variabel", laufzeitMonate: 240, beginn: "", ersteRate: "", rate: null,
  intervall: "monat", tilgungsart: "annuitaet", gebuehren: [], objekt: "", sicherheiten: "", pfandrecht: null, sondertilgungKostenlos: null,
  pfandtausch: null, bereitstellungsprovision: "", vorfaelligkeit: "", buergen: "", hinweise: [],
};
const JNU: [string, string][] = [["", "nicht geregelt"], ["ja", "ja"], ["nein", "nein"]];
const tri = (v: boolean | null) => (v === true ? "ja" : v === false ? "nein" : "");
const unTri = (s: string) => (s === "ja" ? true : s === "nein" ? false : null);

export function Kredite() {
  const { sb, uid, d, reload, toast } = useBh();
  const { openBeleg, setTab } = useNav();
  const [selId, setSelId] = useState<string | null>(null);
  const [form, setForm] = useState<(Partial<Kredit> & { _datei?: File }) | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const sel = d.kredite.find((k) => k.id === selId) ?? d.kredite[0];
  const plan = useMemo(() => (sel ? tilgungsplan(sel) : { rows: [], warn: [] }), [sel]);

  const speichern = async () => {
    if (!form?.bank?.trim() || !form.betrag) return toast("Bank und Kreditbetrag fehlen.");
    try {
      const { _datei, ...rest } = form;
      const data: Omit<Kredit, "id"> = { ...LEER, ...rest, bezeichnung: rest.bezeichnung || rest.bank || "Kredit" };
      if (_datei) Object.assign(data, await dateiAblegen(sb, _datei).then((x) => ({ assetId: x.assetId, dateiHash: x.dateiHash, fileName: _datei.name })));
      let id = form.id;
      if (id) { const { id: _i, ...patch } = { ...data, id }; void _i; await aendern(sb, "kredite", id, patch); }
      else { id = await neu(sb, "kredite", data); protokollieren(sb, uid, "Kredit erfasst", `${data.bank} ${fmtE(data.betrag)} €`); }
      setForm(null);
      setSelId(id ?? null);
      await reload();
    } catch (e) { toast("Speichern fehlgeschlagen: " + (e as Error).message); }
  };

  const auszahlung = async (k: Kredit) => {
    const K = cents(k.betrag);
    const einb = (k.gebuehren || []).filter((g) => g.einbehalten);
    const z = [{ konto: "2800", soll: K - einb.reduce((a, g) => a + cents(g.betrag), 0), haben: 0, text: "Auszahlung " + (k.bezeichnung || k.bank) },
      ...einb.map((g) => ({ konto: "8280", soll: cents(g.betrag), haben: 0, text: g.text })),
      { konto: "3150", soll: 0, haben: K, text: `${k.bank} ${k.kreditnr || ""}`.trim() }];
    try {
      const b = await manuellerEntwurf(sb, uid, {
        art: "KR", belegdatum: k.beginn || today(), partner: k.bank, beschreibung: "Kreditauszahlung " + (k.bezeichnung || ""), objekt: k.objekt || "",
        kreditId: k.id, zeilen: z, assetId: k.assetId ?? null, dateiHash: k.dateiHash ?? null, fileName: k.fileName ?? "",
        hinweise: ["Auszahlungsbetrag mit Kontoauszug abgleichen; liegt die Auszahlung schon auf dem Auszug, diesen Entwurf verwerfen und dort buchen."],
      });
      await reload(); openBeleg(b); setTab("belege");
    } catch (e) { toast("Fehler: " + (e as Error).message); }
  };

  const f = <K extends keyof Kredit>(k: K, v: Kredit[K]) => setForm((x) => ({ ...x, [k]: v }));
  const rest = sel ? kreditRestBuch(d.belege, sel.id) : 0;
  const ausz = sel ? gebucht(d.belege).find((b) => b.kreditId === sel.id && !b.storniert && (b.zeilen || []).some((l) => l.konto === "3150" && l.haben)) : undefined;
  const zinsSum = plan.rows.reduce((a, r) => a + r.zins, 0);
  const geb = (sel?.gebuehren || []).reduce((a, g) => a + cents(g.betrag), 0);

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h6">Kredite</Typography>
        <Button variant="contained" onClick={() => setForm({ ...LEER })}>Kredit erfassen</Button>
      </Stack>

      {form && (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
              <Txt label="Bank" value={form.bank} onChange={(v) => f("bank", v)} />
              <Txt label="Bezeichnung" value={form.bezeichnung} onChange={(v) => f("bezeichnung", v)} />
              <Txt label="Kreditnummer" value={form.kreditnr} onChange={(v) => f("kreditnr", v)} />
              <EuroField label="Kreditbetrag €" value={form.betrag ?? 0} onChange={(v) => f("betrag", v)} />
              <EuroField label="Zinssatz % p. a." value={form.zinssatz ?? 0} onChange={(v) => f("zinssatz", v)} />
              <Sel label="Zinsart" value={form.zinsart ?? "variabel"} onChange={(v) => f("zinsart", v as Kredit["zinsart"])} options={[["fix", "fix"], ["variabel", "variabel"]]} />
              <EuroField label="Laufzeit (Monate)" value={form.laufzeitMonate ?? 0} onChange={(v) => f("laufzeitMonate", Math.round(v))} />
              <EuroField label="Rate € (leer = berechnen)" value={form.rate ?? null} onChange={(v) => f("rate", v || null)} />
              <Txt label="Auszahlung" type="date" value={form.beginn} onChange={(v) => f("beginn", v)} />
              <Txt label="Erste Rate" type="date" value={form.ersteRate} onChange={(v) => f("ersteRate", v)} />
              <Sel label="Tilgung" value={form.tilgungsart ?? "annuitaet"} onChange={(v) => f("tilgungsart", v as Kredit["tilgungsart"])} options={[["annuitaet", "Annuität"], ["raten", "gleiche Tilgung"], ["endfaellig", "endfällig"]]} />
              <Sel label="Intervall" value={form.intervall ?? "monat"} onChange={(v) => f("intervall", v as Kredit["intervall"])} options={[["monat", "monatlich"], ["quartal", "quartalsweise"]]} />
              <Txt label="Objekt" value={form.objekt} onChange={(v) => f("objekt", v)} />
              <Txt label="Sicherheiten" value={form.sicherheiten} onChange={(v) => f("sicherheiten", v)} />
              <EuroField label="Pfandrecht (Höchstbetrag) €" value={form.pfandrecht ?? null} onChange={(v) => f("pfandrecht", v || null)} />
              <Sel label="Kostenlose Sondertilgung" value={tri(form.sondertilgungKostenlos ?? null)} onChange={(v) => f("sondertilgungKostenlos", unTri(v))} options={JNU} />
              <Sel label="Pfandtausch auf Folgeobjekte" value={tri(form.pfandtausch ?? null)} onChange={(v) => f("pfandtausch", unTri(v))} options={JNU} />
              <Txt label="Bereitstellungsprovision" value={form.bereitstellungsprovision} onChange={(v) => f("bereitstellungsprovision", v)} />
              <Txt label="Vorzeitige Rückzahlung" value={form.vorfaelligkeit} onChange={(v) => f("vorfaelligkeit", v)} />
              <Txt label="Bürgen" value={form.buergen} onChange={(v) => f("buergen", v)} />
            </Box>
            <Box>
              <Typography variant="overline" color="text.secondary">Gebühren (bei Auszahlung einbehalten)</Typography>
              {(form.gebuehren ?? []).map((g, i) => (
                <Stack key={i} direction="row" spacing={1} sx={{ mt: 1 }}>
                  <Txt label="Text" value={g.text} onChange={(v) => f("gebuehren", (form.gebuehren ?? []).map((x, j) => (j === i ? { ...x, text: v } : x)))} />
                  <EuroField label="Betrag €" value={g.betrag} onChange={(v) => f("gebuehren", (form.gebuehren ?? []).map((x, j) => (j === i ? { ...x, betrag: v } : x)))} />
                  <Button color="error" onClick={() => f("gebuehren", (form.gebuehren ?? []).filter((_, j) => j !== i))}>×</Button>
                </Stack>
              ))}
              <Button size="small" onClick={() => f("gebuehren", [...(form.gebuehren ?? []), { text: "Bearbeitungsgebühr", betrag: 0, einbehalten: true }])}>+ Gebühr</Button>
            </Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Button onClick={() => input.current?.click()}>{form._datei ? form._datei.name : "Kreditvertrag (PDF) ablegen"}</Button>
              <input ref={input} type="file" hidden accept="application/pdf,image/*" onChange={(e) => { const x = e.target.files?.[0]; if (x) setForm((y) => ({ ...y, _datei: x })); e.target.value = ""; }} />
            </Stack>
            <Stack direction="row" spacing={1}><Button variant="contained" onClick={speichern}>Speichern</Button><Button onClick={() => setForm(null)}>Abbrechen</Button></Stack>
          </Stack>
        </Card>
      )}

      {d.kredite.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {d.kredite.map((k) => <Button key={k.id} size="small" variant={k.id === sel?.id ? "contained" : "outlined"} onClick={() => setSelId(k.id)}>{k.bezeichnung || k.bank} · {fmtE(k.betrag)} €</Button>)}
        </Stack>
      )}

      {sel ? (
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography variant="body2" color="text.secondary">{sel.bank}{sel.kreditnr ? ` · Nr. ${sel.kreditnr}` : ""}{sel.objekt ? ` · ${sel.objekt}` : ""}</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setForm(sel)}>Bearbeiten</Button>
              {ausz ? <Pill tone="ok">{`Auszahlung gebucht ${ausz.nr}`}</Pill> : <Button size="small" variant="contained" onClick={() => auszahlung(sel)}>Auszahlung als Entwurf anlegen</Button>}
            </Stack>
          </Stack>
          <KpiGrid>
            <Kpi label="Kreditbetrag" value={`${fmtE(sel.betrag)} €`} />
            <Kpi label={`Zins ${sel.zinsart}`} value={`${Number(sel.zinssatz || 0).toLocaleString("de-AT", { maximumFractionDigits: 3 })} %`} />
            <Kpi label="Restschuld laut Buchhaltung (3150)" value={`${fmt(rest)} €`} />
            <Kpi label="Zinsen laut Plan + Gebühren" value={`${fmt(zinsSum + geb)} €`} />
          </KpiGrid>
          {(sel.sondertilgungKostenlos === false || sel.pfandtausch === false) && (
            <Alert severity="warning">Für Fix &amp; Flip ungünstig: Ohne kostenlose Sondertilgung bzw. Pfandtausch wird jeder Verkauf teurer. Vor Unterschrift nachverhandeln.</Alert>
          )}
          {[...plan.warn, ...(sel.hinweise || [])].map((h, i) => <Alert key={i} severity="warning" sx={{ py: 0 }}>{h}</Alert>)}
          <Typography variant="overline" color="text.secondary">Tilgungsplan</Typography>
          {plan.rows.length ? (
            <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2, maxHeight: 460 }}>
              <Table size="small" stickyHeader>
                <TableHead><TableRow><TableCell>Nr.</TableCell><TableCell>Fällig</TableCell><TableCell align="right">Rate €</TableCell><TableCell align="right">Zinsen €</TableCell><TableCell align="right">Tilgung €</TableCell><TableCell align="right">Restschuld €</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                <TableBody>
                  {plan.rows.map((r) => {
                    const g = planGebucht(d.belege, sel.id, r.nr);
                    return (
                      <TableRow key={r.nr}><TableCell>{r.nr}</TableCell><TableCell>{dAT(r.datum)}</TableCell>
                        <TableCell align="right"><Num>{fmt(r.rate)}</Num></TableCell><TableCell align="right"><Num>{fmt(r.zins)}</Num></TableCell>
                        <TableCell align="right"><Num>{fmt(r.tilgung)}</Num></TableCell><TableCell align="right"><Num>{fmt(r.rest)}</Num></TableCell>
                        <TableCell>{g ? <Pill tone="ok">{`gebucht ${g.nr}`}</Pill> : r.datum < today() ? <Pill tone="warn">fällig – Kontoauszug einlesen</Pill> : <Pill tone="neu">offen</Pill>}</TableCell></TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : <Alert severity="info">Für den Tilgungsplan fehlen Betrag, Laufzeit oder Auszahlungsdatum.</Alert>}
          <Hinweis>Zinsen nach der 30/360-Methode gerechnet. Bei variablem Zins weicht die Bankabrechnung ab – maßgeblich ist der tatsächliche Abbuchungsbetrag, den das Bankmodul in Zinsen und Tilgung aufteilt. Zinsen zum Jahresende abgrenzen: Mag. Hauser.</Hinweis>
        </Stack>
      ) : !form && <Leer titel="Noch kein Kredit erfasst" text="Erfasse einen Kredit mit Betrag, Zins und Laufzeit. Danach entsteht der Tilgungsplan, und Raten auf dem Kontoauszug werden automatisch in Zinsen und Tilgung aufgeteilt." />}
    </Stack>
  );
}
