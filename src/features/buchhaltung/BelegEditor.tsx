"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableFooter from "@mui/material/TableFooter";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import DeleteOutlineRounded from "@mui/icons-material/DeleteOutlineRounded";
import { useBh } from "./BhProvider";
import { aendern, belegBlob, buchen, loeschen, neu, protokollieren, setzen } from "./api";
import { ARTEN, GEGEN, SAETZE, VIER_AUGEN, gsKonto } from "./konten";
import { MERK, aufbewahrungBis, buildLines, needsFreigabe, pflichtMerkmale, validate } from "./logik/buchung";
import { cents, clean, dAT, fmt, fmtE, sumL, today } from "./logik/util";
import { EuroField, Hinweis, Num, Pill, Sel, Txt } from "./ui";
import type { Anlage, Auszug, Beleg, Position, Zeile } from "./types";

const ND: Record<string, number> = { "0010": 3, "0620": 3, "0630": 8, "0660": 10, "0680": 1 };

function Vorschau({ b }: { b: Beleg }) {
  const { sb } = useBh();
  const [url, setUrl] = useState<string | null>(null);
  const id = b.assetId;
  useEffect(() => {
    if (!id) return;
    let u: string | null = null;
    let weg = false;
    belegBlob(sb, id).then((bl) => {
      if (weg) return;
      u = URL.createObjectURL(bl);
      setUrl(u);
    }).catch(() => setUrl(null));
    return () => {
      weg = true;
      if (u) URL.revokeObjectURL(u);
    };
  }, [sb, id]);
  if (!id) return <Typography variant="caption" color="text.secondary">Kein Originalbeleg gespeichert.</Typography>;
  if (!url) return <Typography variant="caption" color="text.secondary">Original wird geladen …</Typography>;
  const bild = /^image\//.test(b.mime || "");
  return (
    <Stack spacing={1}>
      <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden", height: 460, bgcolor: "action.hover" }}>
        {bild ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="Beleg" style={{ width: "100%", display: "block" }} />
        ) : (
          <iframe src={url} title="Beleg" style={{ width: "100%", height: "100%", border: 0 }} />
        )}
      </Box>
      <Stack direction="row" spacing={1}>
        <Button size="small" href={url} target="_blank" rel="noopener">Original öffnen</Button>
        <Button size="small" href={url} download={b.fileName || "beleg"}>Herunterladen</Button>
      </Stack>
    </Stack>
  );
}


/** Zeilenraster: schmal = Felder umbrechen (6 Spalten), ab 720 px Containerbreite alles in einer Zeile. */
const ZEILEN_BOX = { border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden", containerType: "inline-size" } as const;
function zeileSx(wide: string, spans: string[], order: number[]) {
  const narrow: Record<string, unknown> = {};
  const reset: Record<string, unknown> = {};
  spans.forEach((sp, i) => {
    narrow[`& > :nth-of-type(${i + 1})`] = { gridColumn: sp, order: order[i] };
    reset[`& > :nth-of-type(${i + 1})`] = { gridColumn: "auto", order: "unset" };
  });
  return {
    display: "grid", gap: 1, p: 1.5, alignItems: "center", gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
    "&:not(:first-of-type)": { borderTop: 1, borderColor: "divider" },
    ...narrow,
    "@container (min-width: 720px)": { gridTemplateColumns: wide, ...reset },
  };
}

export function BelegEditor({ start, onClose }: { start: Beleg & { _lokal?: boolean }; onClose: () => void }) {
  const { sb, uid, holder, d: daten, ctx, kontenListe, who, toast, busy, setBusy, reload } = useBh();
  const [d, setD] = useState<Beleg>(() => clean(start));
  const [lokal, setLokal] = useState(!!start._lokal);
  const [confirm, setConfirm] = useState<"del" | "storno" | null>(null);

  // Live-Updates: Entwurf wurde inzwischen gebucht/geändert
  const aktuell = daten.belege.find((b) => b.id === d.id);
  if (aktuell && aktuell.status === "Gebucht" && d.status === "Entwurf") setD(clean(aktuell));
  else if (aktuell?.storniert && !d.storniert) setD((x) => ({ ...x, storniert: true, storniertDurch: aktuell.storniertDurch }));
  else if (aktuell?.freigabeVon && !d.freigabeVon) setD((x) => ({ ...x, freigabeVon: aktuell.freigabeVon, freigabeAm: aktuell.freigabeAm }));

  const gebuchtB = d.status === "Gebucht";
  const ro = gebuchtB;
  const isMB = ["MB", "ST", "BA", "KR"].includes(d.art);
  const set = <K extends keyof Beleg>(k: K, v: Beleg[K]) => setD((x) => ({ ...x, [k]: v }));
  const v = useMemo(() => validate(d, ctx), [d, ctx]);
  const L = gebuchtB ? d.zeilen || [] : v.L;
  const ab = aufbewahrungBis(d);

  const setPos = (i: number, patch: Partial<Position>) =>
    setD((x) => {
      const positionen = (x.positionen || []).map((p, j) => {
        if (j !== i) return p;
        const n = { ...p, ...patch };
        // USt automatisch nachrechnen, solange sie nicht selbst geändert wird
        if (("netto" in patch || "satz" in patch) && !("ust" in patch) && !x.reverseCharge) n.ust = Math.round(cents(n.netto) * Number(n.satz) / 100) / 100;
        return n;
      });
      // Gesamtbetrag nachziehen, wenn er bisher genau zur Summe passte
      return { ...x, positionen };
    });
  const summePos = (x: Beleg) => (x.positionen || []).reduce((a, p) => a + cents(p.netto) + (x.reverseCharge ? 0 : cents(p.ust)), 0);

  const bezahltOptionen = useMemo(() => {
    const o: [string, string][] = d.art === "AR"
      ? [["2000", "Offen (Forderung)"], ["2800", "Bank bezahlt"], ["2700", "Bar (Kassa)"]]
      : d.art === "KA"
        ? [["2700", "Bar (Kassa)"], ["2800", "Bank bezahlt"]]
        : [["3300", "Offen (Verbindlichkeit)"], ["2800", "Bank bezahlt"], ["2700", "Bar (Kassa)"]];
    if (d.art !== "AR") daten.gesellschafter.forEach((g) => o.push([gsKonto(g), `Privat bezahlt von ${g.name}`]));
    return o;
  }, [d.art, daten.gesellschafter]);

  const bezahltWert = d.gegenkonto || (GEGEN[d.art] || GEGEN.ER)[0];
  const setBezahlt = (konto: string) => {
    const g = daten.gesellschafter.find((x) => gsKonto(x) === konto);
    setD((x) => ({ ...x, gegenkonto: konto, gs: g ? g.id : null }));
  };

  const payload = (x: Beleg) => {
    const p = clean(x) as Beleg & { _lokal?: boolean };
    delete (p as Partial<Beleg>).id;
    delete p._lokal;
    if (!p.manuell) p.zeilen = [];
    return p;
  };

  const speichern = async () => {
    setBusy(true);
    try {
      if (lokal || !d.id) {
        const id = await neu(sb, "belege", payload({ ...d, erfasstVon: uid, erfasstAm: new Date().toISOString() }));
        setD((x) => ({ ...x, id }));
        setLokal(false);
      } else await setzen(sb, "belege", d.id, payload(d));
      toast("Entwurf gespeichert");
      await reload();
    } catch (e) {
      toast("Speichern fehlgeschlagen: " + ((e as Error).message || ""));
    } finally {
      setBusy(false);
    }
  };

  /** Anlagen für Positionen auf Anlagekonten (Klasse 0) im Anlagenverzeichnis anlegen. */
  const anlagenErzeugen = async (): Promise<string | null> => {
    if (d.anlageId || d.manuell) return d.anlageId ?? null;
    let erste: string | null = null;
    for (const p of d.positionen || []) {
      if (!p.konto.startsWith("0")) continue;
      const ak = d.vorsteuer !== false ? p.netto : p.netto + p.ust;
      const a: Omit<Anlage, "id"> = {
        bezeichnung: p.text || d.beschreibung || `${d.partner} ${d.rechnungsnr || ""}`.trim(), konto: p.konto,
        anschaffung: d.belegdatum, ak, nutzungsdauer: ND[p.konto] ?? 5, belegId: d.id || null,
      };
      const id = await neu(sb, "anlagen", a);
      erste ??= id;
    }
    return erste;
  };

  const buchenJetzt = async () => {
    if (v.err.length || busy) return;
    setBusy(true);
    try {
      const anlageId = await anlagenErzeugen();
      const rec = { ...payload(d), zeilen: v.L, anlageId: anlageId ?? d.anlageId ?? null, projektId: d.projektId ?? null, gs: d.gs ?? null } as Beleg;
      if (!rec.erfasstVon) { rec.erfasstVon = uid; rec.erfasstAm = new Date().toISOString(); }
      const r = await buchen(sb, holder, uid, rec, lokal ? null : d.id);
      toast(`Gebucht als ${r.nr}`);
      await reload();
      onClose();
    } catch (e) {
      toast("Buchen fehlgeschlagen: " + ((e as Error).message || ""));
    } finally {
      setBusy(false);
    }
  };

  const verwerfen = async () => {
    if (lokal || !d.id) return onClose();
    try {
      await loeschen(sb, "belege", d.id);
      protokollieren(sb, uid, "Entwurf verworfen", `${d.partner || d.fileName || ""}`);
      await reload();
      onClose();
    } catch (e) {
      toast("Verwerfen fehlgeschlagen: " + (e as Error).message);
    }
  };

  const freigeben = async () => {
    try {
      if (lokal || !d.id) throw new Error("Bitte zuerst den Entwurf speichern.");
      const am = new Date().toISOString();
      await aendern(sb, "belege", d.id, { freigabeVon: uid, freigabeAm: am });
      protokollieren(sb, uid, "Zahlung freigegeben", `${d.nr || d.partner}`);
      setD((x) => ({ ...x, freigabeVon: uid, freigabeAm: am }));
      await reload();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const stornieren = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const rec = {
        art: "ST", belegdatum: today(), partner: d.partner || "", beschreibung: `Storno ${d.nr}: ${d.beschreibung || ""}`.slice(0, 140),
        objekt: d.objekt || "", projektId: d.projektId ?? null, gs: d.gs ?? null, manuell: true, positionen: [], hinweise: [],
        zeilen: (d.zeilen || []).map((l) => ({ konto: l.konto, soll: l.haben || 0, haben: l.soll || 0, text: "Storno " + (l.text || "") })),
        stornoVon: d.nr, kreditId: d.kreditId ?? null, erfasstVon: uid, erfasstAm: new Date().toISOString(),
      } as unknown as Beleg;
      const r = await buchen(sb, holder, uid, rec, null);
      await aendern(sb, "belege", d.id, { storniert: true, storniertDurch: r.nr });
      if (d.bankRef) {
        const a = daten.auszuege.find((x) => (x.posten || []).some((p) => p.belegId === d.id));
        if (a) await aendern(sb, "auszuege", a.id, { posten: a.posten.map((p) => (p.belegId === d.id ? { ...p, belegId: null, belegNr: null } : p)) } satisfies Partial<Auszug>);
      }
      toast(`Storniert mit ${r.nr}`);
      await reload();
      onClose();
    } catch (e) {
      toast("Storno fehlgeschlagen: " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  // ---- manuelle Zeilen
  const setZeile = (i: number, p: Partial<Zeile>) => setD((x) => ({ ...x, zeilen: (x.zeilen || []).map((z, j) => (j === i ? { ...z, ...p } : z)) }));
  const kontoOpts: [string, string][] = kontenListe.map(([k, n]) => [k, `${k} ${n}`]);

  const freigabeNoetig = needsFreigabe(d);
  const kannFreigeben = freigabeNoetig && d.erfasstVon !== uid && !lokal;

  return (
    <Card variant="outlined" sx={{ p: 2.5 }}>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 1 }}>
          <Box>
            <Typography variant="h6">{gebuchtB ? d.nr || "Beleg" : lokal ? "Neue Buchung" : "Beleg prüfen"}</Typography>
            <Typography variant="caption" color="text.secondary">
              {d.fileName}
              {gebuchtB && ` · gebucht ${dAT(d.gebuchtAm)} von ${who(d.gebuchtVon)}`}{" "}
              {d.storniert && <Pill tone="err">{`storniert durch ${d.storniertDurch}`}</Pill>}
            </Typography>
          </Box>
          <Button size="small" onClick={onClose}>Schließen</Button>
        </Stack>

        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", xl: "minmax(0,1fr) 340px" } }}>
          <Stack spacing={2} sx={{ minWidth: 0 }}>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}>
              <Sel label="Belegart" value={d.art} disabled={ro || (isMB && d.art !== "MB")}
                onChange={(a) => setD((x) => ({ ...x, art: a as Beleg["art"], vorsteuer: a === "AR" ? false : x.vorsteuer, gegenkonto: (GEGEN[a] || GEGEN.ER)[0], gs: null }))}
                options={(Object.entries(ARTEN) as [Beleg["art"], string][]).filter(([k]) => ["ER", "AR", "KA", "MB"].includes(k) || k === d.art)} />
              <Txt label="Belegdatum" type="date" value={d.belegdatum} onChange={(x) => set("belegdatum", x)} disabled={ro} />
              <Txt label={d.art === "AR" ? "Kunde" : isMB ? "Partner / Bezug" : "Lieferant"} value={d.partner} onChange={(x) => set("partner", x)} disabled={ro} />
              {!isMB && <Txt label="Rechnungsnummer" value={d.rechnungsnr} onChange={(x) => set("rechnungsnr", x)} disabled={ro} />}
              {!isMB && <Txt label="UID Lieferant" value={d.uid} placeholder="ATU…" onChange={(x) => set("uid", x)} disabled={ro} />}
              {!isMB && <Txt label="Rechnungsempfänger" value={d.empfaenger} onChange={(x) => set("empfaenger", x)} disabled={ro} />}
              {!isMB && <Txt label="Fällig am" type="date" value={d.faellig} onChange={(x) => set("faellig", x)} disabled={ro} />}
              <Sel label="Projekt / Objekt" value={d.projektId ?? ""} disabled={ro}
                onChange={(id) => setD((x) => ({ ...x, projektId: id || null, objekt: daten.projekte.find((p) => p.id === id)?.name ?? "" }))}
                options={[["", "– kein Projekt –"], ...daten.projekte.map((p): [string, string] => [p.id, p.name])]} />
              {!isMB && <Sel label="Bezahlt über" value={bezahltWert} disabled={ro} onChange={setBezahlt} options={bezahltOptionen} />}
              {!isMB && <EuroField label="Betrag laut Beleg (brutto)" value={d.brutto ?? null} disabled={ro} onChange={(n) => set("brutto", n)} />}
            </Box>
            <Txt label="Buchungstext" value={d.beschreibung} onChange={(x) => set("beschreibung", x)} disabled={ro} />

            {!isMB && (
              <Stack direction="row" sx={{ flexWrap: "wrap" }}>
                {d.art !== "AR" && (
                  <>
                    <FormControlLabel control={<Checkbox checked={d.vorsteuer !== false} disabled={ro} onChange={(e) => set("vorsteuer", e.target.checked)} />} label="Vorsteuerabzug" />
                    <FormControlLabel control={<Checkbox checked={!!d.reverseCharge} disabled={ro}
                      onChange={(e) => setD((x) => ({ ...x, reverseCharge: e.target.checked, positionen: e.target.checked ? (x.positionen || []).map((p) => ({ ...p, ust: 0, satz: 20 })) : x.positionen }))} />} label="Reverse Charge (§ 19 Abs 1a)" />
                  </>
                )}
                <FormControlLabel control={<Checkbox checked={!!d.manuell} disabled={ro}
                  onChange={(e) => setD((x) => ({ ...x, manuell: e.target.checked, zeilen: e.target.checked ? buildLines({ ...x, manuell: false }) : x.zeilen }))} />} label="Buchungszeilen manuell bearbeiten" />
              </Stack>
            )}

            {!isMB && !d.manuell && (
              <Box>
                <Typography variant="overline" color="text.secondary">Positionen</Typography>
                <Box sx={{ ...ZEILEN_BOX }}>
                  {(d.positionen || []).map((p, i) => (
                    <Box key={i} sx={zeileSx("minmax(0,1.2fr) minmax(0,2fr) 120px 90px 110px 40px", ["span 6", "span 5", "span 2", "span 2", "span 2", "span 1"], [3, 1, 4, 5, 6, 2])}>
                      <Box><Txt label="Text" value={p.text} onChange={(x) => setPos(i, { text: x })} disabled={ro} /></Box>
                      <Box><Sel label="Konto" value={p.konto} onChange={(x) => setPos(i, { konto: x })} options={kontoOpts} disabled={ro} /></Box>
                      <Box><EuroField label="Netto €" value={p.netto} onChange={(x) => setPos(i, { netto: x })} disabled={ro} /></Box>
                      <Box><Sel label="USt %" value={Number(p.satz)} onChange={(x) => setPos(i, { satz: Number(x) })} options={SAETZE.map((s): [number, string] => [s, String(s)])} disabled={ro} /></Box>
                      <Box><EuroField label="USt €" value={p.ust} onChange={(x) => setPos(i, { ust: x })} disabled={ro || !!d.reverseCharge} /></Box>
                      <Box sx={{ textAlign: "right" }}>{!ro && <IconButton size="small" aria-label="Position entfernen" onClick={() => setD((x) => ({ ...x, positionen: (x.positionen || []).filter((_, j) => j !== i) }))}><DeleteOutlineRounded fontSize="small" /></IconButton>}</Box>
                    </Box>
                  ))}
                </Box>
                {!ro && (
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Button size="small" onClick={() => setD((x) => ({ ...x, positionen: [...(x.positionen || []), { text: "", konto: x.art === "AR" ? "4880" : "7890", netto: 0, satz: 20, ust: 0 }] }))}>+ Position</Button>
                    <Button size="small" onClick={() => setD((x) => ({ ...x, brutto: summePos(x) / 100 }))}>Betrag aus Positionen übernehmen</Button>
                  </Stack>
                )}
              </Box>
            )}

            {d.manuell && (
              <Box>
                <Typography variant="overline" color="text.secondary">Buchungszeilen</Typography>
                <Box sx={{ ...ZEILEN_BOX }}>
                  {(d.zeilen || []).map((z, i) => (
                    <Box key={i} sx={zeileSx("minmax(0,2fr) 130px 130px minmax(0,1.5fr) 40px", ["span 5", "span 3", "span 3", "span 6", "span 1"], [1, 3, 3, 6, 2])}>
                      <Box><Sel label="Konto" value={z.konto} onChange={(x) => setZeile(i, { konto: x })} options={kontoOpts} disabled={ro} /></Box>
                      <Box><EuroField label="Soll €" value={z.soll ? z.soll / 100 : null} onChange={(x) => setZeile(i, { soll: cents(x) })} disabled={ro} /></Box>
                      <Box><EuroField label="Haben €" value={z.haben ? z.haben / 100 : null} onChange={(x) => setZeile(i, { haben: cents(x) })} disabled={ro} /></Box>
                      <Box><Txt label="Text" value={z.text} onChange={(x) => setZeile(i, { text: x })} disabled={ro} /></Box>
                      <Box sx={{ textAlign: "right" }}>{!ro && <IconButton size="small" aria-label="Zeile entfernen" onClick={() => setD((x) => ({ ...x, zeilen: (x.zeilen || []).filter((_, j) => j !== i) }))}><DeleteOutlineRounded fontSize="small" /></IconButton>}</Box>
                    </Box>
                  ))}
                </Box>
                {!ro && <Button size="small" sx={{ mt: 1 }} onClick={() => setD((x) => ({ ...x, zeilen: [...(x.zeilen || []), { konto: "2800", soll: 0, haben: 0, text: "" }] }))}>+ Zeile</Button>}
              </Box>
            )}

            {d.merkmale && !isMB && d.art !== "AR" && (
              <Box>
                <Typography variant="overline" color="text.secondary">Rechnungsmerkmale § 11 UStG</Typography>
                <Box sx={{ display: "grid", gap: 0.5, gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
                  {pflichtMerkmale(d).map((k) => (
                    <FormControlLabel key={k} sx={{ m: 0 }} disabled={ro}
                      control={<Checkbox size="small" checked={d.merkmale![k] === true} onChange={(e) => setD((x) => ({ ...x, merkmale: { ...x.merkmale, [k]: e.target.checked } }))} />}
                      label={<Typography variant="body2">{MERK.find((m) => m[0] === k)![1]}</Typography>} />
                  ))}
                </Box>
              </Box>
            )}
            {!d.merkmale && !isMB && d.art !== "AR" && !ro && (
              <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => set("merkmale", Object.fromEntries(MERK.map(([k]) => [k, true])))}>Rechnungsmerkmale nach § 11 UStG prüfen</Button>
            )}

            <Box>
              <Typography variant="overline" color="text.secondary">Buchungssatz</Typography>
              <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Konto</TableCell><TableCell>Bezeichnung</TableCell><TableCell align="right">Soll €</TableCell><TableCell align="right">Haben €</TableCell></TableRow></TableHead>
                  <TableBody>
                    {L.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell>{l.konto}</TableCell>
                        <TableCell>{ctx.konten[l.konto] ?? "Unbekanntes Konto"}{l.text && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{l.text}</Typography>}</TableCell>
                        <TableCell align="right"><Num>{l.soll ? fmt(l.soll) : ""}</Num></TableCell>
                        <TableCell align="right"><Num>{l.haben ? fmt(l.haben) : ""}</Num></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter><TableRow><TableCell colSpan={2}>Summe</TableCell><TableCell align="right"><Num>{fmt(sumL(L, "soll"))}</Num></TableCell><TableCell align="right"><Num>{fmt(sumL(L, "haben"))}</Num></TableCell></TableRow></TableFooter>
                </Table>
              </TableContainer>
            </Box>

            {!gebuchtB && (
              <Stack spacing={0.75}>
                {v.err.map((m, i) => <Alert key={"e" + i} severity="error" sx={{ py: 0 }}>{m}</Alert>)}
                {v.warn.map((m, i) => <Alert key={"w" + i} severity="warning" sx={{ py: 0 }}>{m}</Alert>)}
                {!v.err.length && !v.warn.length && <Alert severity="success" sx={{ py: 0 }}>Alles stimmig: Soll und Haben ausgeglichen, Beträge passen zum Beleg.</Alert>}
                {(d.positionen || []).some((p) => p.konto.startsWith("0")) && !d.manuell && (
                  <Alert severity="info" sx={{ py: 0 }}>Beim Buchen wird die Anschaffung automatisch im Anlagenverzeichnis angelegt (AfA-Plan im Reiter „Anlagen“).</Alert>
                )}
              </Stack>
            )}
          </Stack>

          <Stack spacing={1.5} sx={{ minWidth: 0 }}>
            <Vorschau b={d} />
            <Card variant="outlined" sx={{ p: 1.5, bgcolor: "action.hover" }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>Aufbewahrung bis {ab.bis}</Typography>
              <Hinweis>{ab.grund ? "12 Jahre (Grundstücksbezug, § 18 Abs 10 UStG)" : "7 Jahre nach § 132 BAO"}</Hinweis>
              {d.dateiHash && <Typography variant="caption" sx={{ display: "block", wordBreak: "break-all", fontFamily: "monospace", mt: 0.5 }}>SHA-256 Original: {d.dateiHash}</Typography>}
              {d.hash && <Typography variant="caption" sx={{ display: "block", wordBreak: "break-all", fontFamily: "monospace", mt: 0.5 }}>Siegel Nr. {d.seq}: {d.hash}</Typography>}
            </Card>
            {d.gs && <Alert severity="info" sx={{ py: 0 }}>Privat bezahlt von {daten.gesellschafter.find((g) => g.id === d.gs)?.name} – wird als Auslage im Reiter „Gesellschafter“ geführt.</Alert>}
            {d.freigabeVon && <Alert severity="success" sx={{ py: 0 }}>Zahlung freigegeben von {who(d.freigabeVon)} am {dAT(d.freigabeAm)} (Vier-Augen-Prinzip)</Alert>}
          </Stack>
        </Box>

        {/* Aktionen */}
        {confirm === "del" ? (
          <Alert severity="warning" action={<><Button color="error" size="small" onClick={verwerfen}>Ja, verwerfen</Button><Button size="small" onClick={() => setConfirm(null)}>Abbrechen</Button></>}>
            Entwurf wirklich verwerfen? Der Vorgang wird protokolliert.
          </Alert>
        ) : confirm === "storno" ? (
          <Alert severity="warning" action={<><Button color="error" size="small" onClick={stornieren} disabled={busy}>Ja, stornieren</Button><Button size="small" onClick={() => setConfirm(null)}>Abbrechen</Button></>}>
            Storno-Buchung zu {d.nr} mit heutigem Datum anlegen?
          </Alert>
        ) : (
          <Stack direction="row" spacing={1} useFlexGap sx={{ justifyContent: "flex-end", alignItems: "center", flexWrap: "wrap" }}>
            {freigabeNoetig && (
              <>
                <Hinweis>{kannFreigeben ? `Rechnung ab ${fmt(VIER_AUGEN)} €: Zahlung braucht deine Freigabe als zweiter Gesellschafter.` : `Rechnung ab ${fmt(VIER_AUGEN)} €: Zahlungsfreigabe durch einen zweiten Gesellschafter offen.`}</Hinweis>
                {kannFreigeben && <Button variant="outlined" onClick={freigeben}>Zahlung freigeben</Button>}
              </>
            )}
            {!gebuchtB ? (
              <>
                <Button color="error" onClick={() => (lokal ? onClose() : setConfirm("del"))}>{lokal ? "Abbrechen" : "Verwerfen"}</Button>
                <Button variant="outlined" onClick={speichern} disabled={busy}>Entwurf speichern</Button>
                <Button variant="contained" onClick={buchenJetzt} disabled={busy || v.err.length > 0}>Buchen</Button>
              </>
            ) : d.art !== "ST" && !d.storniert ? (
              <>
                <Hinweis>Gebuchte Belege sind unveränderbar (§ 131 BAO). Fehler werden per Storno korrigiert und neu erfasst.</Hinweis>
                <Button color="error" variant="outlined" onClick={() => setConfirm("storno")}>Stornieren</Button>
              </>
            ) : null}
          </Stack>
        )}
        <Hinweis>Soll {fmt(v.so)} € · Haben {fmt(v.ha)} € · Positionen {fmtE(summePos(d) / 100)} €</Hinweis>
      </Stack>
    </Card>
  );
}
