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
import { aendern, buchen, neu, protokollieren } from "../api";
import { gsKonto } from "../konten";
import { autoMapping, csvZuPosten, parseCsv, vorschlag, type CsvMapping } from "../logik/bank";
import { validate } from "../logik/buchung";
import { cents, dAT, fmt, fmtE, norm } from "../logik/util";
import { dateiAblegen } from "../upload";
import { EuroField, Hinweis, Kpi, KpiGrid, Leer, Num, Pill, Sel, Txt } from "../ui";
import type { Auszug, Beleg, Posten } from "../types";

type Entwurf = { file: File | null; rows: string[][]; map: CsvMapping; bank: string; von: string; bis: string; anfang: number | null; ende: number | null };

export function Bank() {
  const { sb, uid, holder, d, ctx, konten, kontenListe, reload, toast, busy, setBusy } = useBh();
  const [selId, setSelId] = useState<string | null>(null);
  const [neuA, setNeuA] = useState<Entwurf | null>(null);
  const [manuell, setManuell] = useState<Partial<Posten> | null>(null);
  /** lokale Auswahl (Gegenkonto, Gesellschafter) je Umsatz – wird erst beim Buchen übernommen */
  const [ov, setOv] = useState<Record<string, { gk?: string; gs?: string }>>({});
  const input = useRef<HTMLInputElement>(null);

  const az = useMemo(() => [...d.auszuege].sort((a, b) => (b.bis || "").localeCompare(a.bis || "")), [d.auszuege]);
  const sel = az.find((a) => a.id === selId) ?? az[0];
  const bctx = useMemo(() => ({ belege: d.belege, kredite: d.kredite, gesellschafter: d.gesellschafter, konten }), [d.belege, d.kredite, d.gesellschafter, konten]);
  const mit = (a: Auszug, p: Posten): Posten => ({ ...p, ...ov[`${a.id}:${p.i}`] });
  const rows = useMemo(() => (sel?.posten ?? []).map((p0) => { const p = mit(sel!, p0); return { p, v: p.belegId ? null : vorschlag(p, bctx) }; }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sel, bctx, ov]);
  const bankSaldo = useMemo(() => {
    if (!sel) return 0;
    let s = 0;
    d.belege.filter((b) => b.status === "Gebucht" && (b.belegdatum || "") <= sel.bis).forEach((b) => (b.zeilen || []).forEach((l) => { if (l.konto === "2800") s += (l.soll || 0) - (l.haben || 0); }));
    return s;
  }, [d.belege, sel]);
  const diff = sel && sel.endsaldo != null ? cents(sel.endsaldo) - bankSaldo : null;
  const bereit = rows.filter((r) => r.v?.sicher).length;

  const datei = async (f: File) => {
    const csv = /\.(csv|txt)$/i.test(f.name) || /^text\//.test(f.type);
    if (!csv) return setNeuA({ file: f, rows: [], map: { datum: -1, betrag: -1, partner: -1, zweck: -1, valuta: -1, headerRows: 1 }, bank: "", von: "", bis: "", anfang: null, ende: null });
    let t = new TextDecoder("utf-8").decode(await f.arrayBuffer());
    if ((t.match(/�/g) || []).length > 3) t = new TextDecoder("windows-1252").decode(await f.arrayBuffer());
    const rows = parseCsv(t);
    setNeuA({ file: f, rows, map: autoMapping(rows), bank: "", von: "", bis: "", anfang: null, ende: null });
  };

  const anlegen = async () => {
    if (!neuA) return;
    setBusy(true);
    try {
      let posten: Posten[] = [];
      if (neuA.rows.length) {
        if (neuA.map.datum < 0 || neuA.map.betrag < 0) throw new Error("Bitte Spalten für Datum und Betrag wählen.");
        posten = csvZuPosten(neuA.rows, neuA.map);
        if (!posten.length) throw new Error("Keine Umsätze erkannt – Spaltenzuordnung prüfen.");
      }
      const dat = posten.map((p) => p.datum).sort();
      let meta: Partial<Auszug> = {};
      if (neuA.file) {
        const { assetId, dateiHash } = await dateiAblegen(sb, neuA.file);
        if (d.auszuege.some((a) => a.dateiHash === dateiHash)) throw new Error("Dieser Kontoauszug wurde schon eingelesen.");
        meta = { assetId, dateiHash, fileName: neuA.file.name };
      }
      posten.forEach((p) => {
        const dup = d.belege.find((b) => b.status === "Gebucht" && b.bankRef === p.ref && !b.storniert);
        if (dup) Object.assign(p, { belegId: dup.id, belegNr: dup.nr, dup: true });
      });
      const a: Omit<Auszug, "id"> = { bank: neuA.bank, von: neuA.von || dat[0] || "", bis: neuA.bis || dat[dat.length - 1] || "", anfangssaldo: neuA.anfang, endsaldo: neuA.ende, posten, ...meta };
      const id = await neu(sb, "auszuege", a);
      protokollieren(sb, uid, "Kontoauszug erfasst", `${neuA.file?.name ?? "manuell"} · ${posten.length} Umsätze`);
      setNeuA(null);
      setSelId(id);
      await reload();
      toast(`${posten.length} Umsätze erfasst`);
    } catch (e) { toast((e as Error).message); }
    finally { setBusy(false); }
  };

  const addManuell = async () => {
    if (!sel || !manuell?.datum || !manuell.betrag) return toast("Datum und Betrag fehlen.");
    const p: Posten = { i: sel.posten.length ? Math.max(...sel.posten.map((x) => x.i)) + 1 : 0, datum: manuell.datum, betrag: manuell.betrag, partner: manuell.partner ?? "", verwendungszweck: manuell.verwendungszweck ?? "", belegId: null, belegNr: null };
    p.ref = `${p.datum}|${cents(p.betrag)}|${norm(p.verwendungszweck).slice(0, 40)}`;
    await aendern(sb, "auszuege", sel.id, { posten: [...sel.posten, p] });
    setManuell(null);
    await reload();
  };

  const setPosten = (a: Auszug, i: number, patch: { gk?: string; gs?: string }) =>
    setOv((o) => ({ ...o, [`${a.id}:${i}`]: { ...o[`${a.id}:${i}`], ...patch } }));

  const buchePosten = async (a: Auszug, i: number): Promise<void> => {
    const p0 = a.posten.find((x) => x.i === i);
    if (!p0 || p0.belegId) return;
    const p = mit(a, p0);
    const v = vorschlag(p, bctx);
    let z = v.zeilen.map((l) => ({ ...l }));
    const gk = p.gk;
    if (gk && !v.ausgleich && !v.kreditId && !v.gs) z = z.map((l) => (l.konto !== "2800" ? { ...l, konto: gk } : l));
    const gsId = v.gs ?? p.gs ?? null;
    const gsObj = d.gesellschafter.find((g) => g.id === gsId);
    const rec = {
      art: "BA", belegdatum: p.datum, partner: p.partner, beschreibung: (p.verwendungszweck || "").slice(0, 140), manuell: true, positionen: [], hinweise: v.warn,
      zeilen: z, bankRef: p.ref, auszugId: a.id, assetId: a.assetId ?? null, previewId: null, dateiHash: a.dateiHash ?? null, fileName: a.fileName ?? "",
      ausgleich: v.ausgleich ?? null, kreditId: v.kreditId ?? null, planNr: v.planNr ?? null, gs: gsObj ? gsObj.id : null,
      erfasstVon: uid, erfasstAm: new Date().toISOString(),
    } as unknown as Beleg;
    const val = validate({ ...rec, status: "Entwurf" }, ctx);
    if (val.err.length) throw new Error(val.err[0]);
    const r = await buchen(sb, holder, uid, rec, null);
    p0.belegId = r.id;
    p0.belegNr = r.nr;
    await aendern(sb, "auszuege", a.id, { posten: a.posten });
  };

  const buche = async (a: Auszug, i: number | "alle") => {
    if (busy) return;
    setBusy(true);
    try {
      if (i === "alle") {
        const used = new Set<string>();
        let n = 0;
        for (const p of a.posten.filter((x) => !x.belegId).map((x) => mit(a, x))) {
          const v = vorschlag(p, bctx);
          if (!v.sicher) continue;
          const key = v.ausgleich ? "op" + v.ausgleich : v.kreditId ? `k${v.kreditId}-${v.planNr}` : "";
          if (key && used.has(key)) continue;
          if (key) used.add(key);
          await buchePosten(a, p.i);
          n++;
        }
        toast(`${n} Bankumsätze gebucht`);
      } else {
        await buchePosten(a, i);
        toast("Bankumsatz gebucht");
      }
    } catch (e) { toast("Buchen fehlgeschlagen: " + (e as Error).message); }
    finally { setBusy(false); await reload(); }
  };

  const kOpts: [string, string][] = kontenListe.map(([k, n]) => [k, `${k} ${n}`]);

  return (
    <Stack spacing={2}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h6">Bank</Typography>
        <Button variant="contained" onClick={() => input.current?.click()}>Kontoauszug hinzufügen</Button>
        <input ref={input} type="file" hidden accept=".csv,.txt,text/csv,text/plain,application/pdf,image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) void datei(f); e.target.value = ""; }} />
      </Stack>

      {neuA && (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1.5}>
            <Typography sx={{ fontWeight: 700 }}>{neuA.file?.name ?? "Neuer Kontoauszug"}</Typography>
            {!neuA.rows.length && <Alert severity="info">PDF/Bild wird als Original abgelegt; die Umsätze erfasst du danach einzeln. Mit einem CSV-Export aus dem Online-Banking geht es automatisch.</Alert>}
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
              <Txt label="Bank" value={neuA.bank} onChange={(v) => setNeuA({ ...neuA, bank: v })} />
              <Txt label="Von" type="date" value={neuA.von} onChange={(v) => setNeuA({ ...neuA, von: v })} />
              <Txt label="Bis" type="date" value={neuA.bis} onChange={(v) => setNeuA({ ...neuA, bis: v })} />
              <EuroField label="Anfangssaldo laut Bank €" value={neuA.anfang} onChange={(v) => setNeuA({ ...neuA, anfang: v })} />
              <EuroField label="Endsaldo laut Bank €" value={neuA.ende} onChange={(v) => setNeuA({ ...neuA, ende: v })} />
            </Box>
            {neuA.rows.length > 0 && (
              <>
                <Typography variant="overline" color="text.secondary">Spalten zuordnen</Typography>
                <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
                  {(["datum", "betrag", "partner", "zweck", "valuta"] as const).map((k) => (
                    <Sel key={k} label={{ datum: "Buchungsdatum", betrag: "Betrag", partner: "Partner / Name", zweck: "Verwendungszweck", valuta: "Valuta (optional)" }[k]}
                      value={neuA.map[k]} onChange={(v) => setNeuA({ ...neuA, map: { ...neuA.map, [k]: Number(v) } })}
                      options={[[-1, "– keine –"], ...neuA.rows[0].map((h, i): [number, string] => [i, h || `Spalte ${i + 1}`])]} />
                  ))}
                  <Sel label="Kopfzeilen" value={neuA.map.headerRows} onChange={(v) => setNeuA({ ...neuA, map: { ...neuA.map, headerRows: Number(v) } })} options={[[0, "keine"], [1, "1 Zeile"], [2, "2 Zeilen"]]} />
                </Box>
                <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2, maxHeight: 200 }}>
                  <Table size="small"><TableBody>
                    {neuA.rows.slice(0, 5).map((r, i) => <TableRow key={i}>{r.map((c, j) => <TableCell key={j} sx={{ whiteSpace: "nowrap" }}>{c}</TableCell>)}</TableRow>)}
                  </TableBody></Table>
                </TableContainer>
                <Hinweis>{csvZuPosten(neuA.rows, neuA.map).length} Umsätze erkannt (Vorschau der ersten Zeilen oben).</Hinweis>
              </>
            )}
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={anlegen} disabled={busy}>Übernehmen</Button>
              <Button onClick={() => setNeuA(null)}>Abbrechen</Button>
            </Stack>
          </Stack>
        </Card>
      )}

      {az.length > 0 && (
        <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
          {az.map((a) => {
            const offen = a.posten.filter((p) => !p.belegId).length;
            return <Button key={a.id} size="small" variant={a.id === sel?.id ? "contained" : "outlined"} onClick={() => setSelId(a.id)}>{a.bank || "Auszug"} {dAT(a.von)}–{dAT(a.bis)} {offen ? `(${offen} offen)` : "✓"}</Button>;
          })}
        </Stack>
      )}

      {sel ? (
        <Stack spacing={2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
            <Typography variant="caption" color="text.secondary">{sel.fileName}</Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" onClick={() => setManuell({ datum: sel.bis, betrag: 0 })}>Umsatz hinzufügen</Button>
              <Button variant="contained" disabled={!bereit || busy} onClick={() => buche(sel, "alle")}>{bereit} sichere Zuordnungen buchen</Button>
            </Stack>
          </Stack>
          {manuell && (
            <Card variant="outlined" sx={{ p: 2 }}>
              <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))" }}>
                <Txt label="Datum" type="date" value={manuell.datum} onChange={(v) => setManuell({ ...manuell, datum: v })} />
                <EuroField label="Betrag € (Abbuchung negativ)" value={manuell.betrag ?? 0} onChange={(v) => setManuell({ ...manuell, betrag: v })} />
                <Txt label="Partner" value={manuell.partner} onChange={(v) => setManuell({ ...manuell, partner: v })} />
                <Txt label="Verwendungszweck" value={manuell.verwendungszweck} onChange={(v) => setManuell({ ...manuell, verwendungszweck: v })} />
              </Box>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}><Button variant="contained" onClick={addManuell}>Hinzufügen</Button><Button onClick={() => setManuell(null)}>Abbrechen</Button></Stack>
            </Card>
          )}
          <KpiGrid>
            <Kpi label="Anfangssaldo laut Bank" value={sel.anfangssaldo != null ? `${fmtE(sel.anfangssaldo)} €` : "–"} />
            <Kpi label="Endsaldo laut Bank" value={sel.endsaldo != null ? `${fmtE(sel.endsaldo)} €` : "–"} />
            <Kpi label={`Konto 2800 bis ${dAT(sel.bis)}`} value={`${fmt(bankSaldo)} €`} />
            <Kpi label="Abstimmung" value={diff == null ? "–" : diff === 0 ? <Pill tone="ok">abgestimmt</Pill> : <Pill tone="warn">{`Differenz ${fmt(diff)} €`}</Pill>} />
          </KpiGrid>
          {rows.length ? (
            <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Datum</TableCell><TableCell>Partner / Zweck</TableCell><TableCell align="right">Betrag €</TableCell><TableCell>Zuordnung</TableCell><TableCell sx={{ minWidth: 260 }}>Gegenkonto</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {rows.map(({ p, v }) => {
                    if (!v) return (
                      <TableRow key={p.i}><TableCell>{dAT(p.datum)}</TableCell><TableCell>{p.partner}<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{p.verwendungszweck}</Typography></TableCell>
                        <TableCell align="right"><Num neg={p.betrag < 0}>{fmtE(p.betrag)}</Num></TableCell><TableCell colSpan={3}><Pill tone="ok">{`gebucht ${p.belegNr ?? ""}`}</Pill>{p.dup && <Typography component="span" variant="caption" color="text.secondary"> (schon früher gebucht)</Typography>}</TableCell></TableRow>
                    );
                    const gkAkt = p.betrag < 0 ? v.zeilen[0].konto : v.zeilen[v.zeilen.length - 1].konto;
                    const frei = !v.ausgleich && !v.kreditId && !v.gs;
                    const gsFrage = frei && ["9000", "9100", "3180"].includes(p.gk ?? gkAkt);
                    return (
                      <TableRow key={p.i}>
                        <TableCell>{dAT(p.datum)}</TableCell>
                        <TableCell sx={{ minWidth: 200 }}>{p.partner}<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{p.verwendungszweck}</Typography></TableCell>
                        <TableCell align="right"><Num neg={p.betrag < 0}>{fmtE(p.betrag)}</Num></TableCell>
                        <TableCell sx={{ minWidth: 170 }}>{v.sicher ? <Pill tone="ok">sicher</Pill> : <Pill tone="warn">prüfen</Pill>} <Typography component="span" variant="caption">{v.info}</Typography>
                          {v.warn.map((w, i) => <Alert key={i} severity="warning" sx={{ mt: 0.5, py: 0 }}>{w}</Alert>)}</TableCell>
                        <TableCell>
                          {frei ? (
                            <Stack spacing={0.75}>
                              <Sel label="" value={p.gk ?? gkAkt} onChange={(k) => setPosten(sel, p.i, { gk: k })} options={kOpts} />
                              {gsFrage && <Sel label="Gesellschafter" value={p.gs ?? ""} onChange={(g) => setPosten(sel, p.i, { gs: g })} options={[["", "– wählen –"], ...d.gesellschafter.map((g): [string, string] => [g.id, g.name])]} />}
                            </Stack>
                          ) : <Typography variant="caption" color="text.secondary">{v.zeilen.filter((l) => l.konto !== "2800").map((l) => l.konto).join(" + ")}{v.gs ? ` (${gsKonto(d.gesellschafter.find((g) => g.id === v.gs)!)})` : ""}</Typography>}
                        </TableCell>
                        <TableCell><Button size="small" variant="outlined" disabled={busy} onClick={() => buche(sel, p.i)}>Buchen</Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : <Leer titel="Keine Umsätze" text="Füge Umsätze hinzu oder lade den CSV-Export der Bank." />}
          <Hinweis>Zuordnung: zuerst offene Rechnungen (Betrag, Rechnungsnummer, Partner), dann Erstattungen an Gesellschafter (Name/IBAN), Kreditraten laut Tilgungsplan (Zinsen 8280, Tilgung 3150), sonst Kontovorschlag. Jeder Umsatz wird als eigener Bankbeleg mit Verweis auf den Kontoauszug gebucht.</Hinweis>
        </Stack>
      ) : !neuA && <Leer titel="Noch kein Kontoauszug" text="Lade einen CSV-Export aus dem Online-Banking (George, ELBA, Raiffeisen …) hoch. Jeder Umsatz wird offenen Rechnungen, Erstattungen oder Kreditraten zugeordnet und mit einem Klick gebucht." />}
    </Stack>
  );
}
