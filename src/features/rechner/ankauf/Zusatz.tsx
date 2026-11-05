"use client";

// Ergänzungen zum Ankauf-Rechner (aus dem früheren Fix-&-Flip-Rechner): Rücklagen, Bewertung, Vergleichsobjekte,
// Freigaben, Plan/Ist, Portfolio, Preisspiegel und Objektliste. Logik: ./zusatz.ts
import { useState, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import AddRounded from "@mui/icons-material/AddRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import { cash, eur, num, pct, rechne, type Gewerk, type NkPos, type V } from "./rechne";
import {
  BAU, MODENAME, REF0, bewert, cats, fmtD, freigabe, istCalc, median, portfolio, preisspiegel, reserve,
  type BwMode, type Objekt, type Plan, type Ref, type Zus,
} from "./zusatzRechne";
import { Line, NumField, Section } from "./ui";

const th = { whiteSpace: "nowrap", fontWeight: 700, py: 0.75 } as const;
const tc = { whiteSpace: "nowrap", py: 0.75, fontVariantNumeric: "tabular-nums" } as const;
const n0 = (x: number) => (Number.isFinite(x) ? Math.round(x).toLocaleString("de-AT") : "–");
const GOOD = "success.main", BAD = "error.main", WARN = "warning.main";

function Sel({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (s: string) => void }) {
  return (
    <TextField fullWidth select size="small" label={label} value={options.includes(value) ? value : ""} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <MenuItem key={o} value={o}>{o}</MenuItem>)}
    </TextField>
  );
}

function Kpi({ label, value, sub, color }: { label: string; value: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 1.5, minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", textTransform: "uppercase", letterSpacing: 0.4 }}>{label}</Typography>
      <Typography sx={{ fontWeight: 700, fontSize: 18, color }}>{value}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Box>
  );
}

/** Kopf: Objektname, Adresse, Status, Speichern und PDFs. */
export function ObjektKopf({
  z, setZ, onSave, onSaveNew, onReset, onPdf, onBank, msg, armReset,
}: {
  z: Zus; setZ: (p: Partial<Zus>) => void; onSave: () => void; onSaveNew: () => void; onReset: () => void;
  onPdf: () => void; onBank: () => void; msg: string; armReset: boolean;
}) {
  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2.5 }}>
      <Grid container spacing={2} sx={{ alignItems: "center" }}>
        <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Objekt" value={z.name} onChange={(e) => setZ({ name: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 5 }}><TextField fullWidth label="Adresse" value={z.adresse} onChange={(e) => setZ({ adresse: e.target.value })} /></Grid>
        <Grid size={{ xs: 12, md: 3 }}><Sel label="Status" value={z.status} options={["In Prüfung", "Angebot gelegt", "Gekauft", "In Sanierung", "Im Verkauf", "Verkauft", "Abgelehnt"]} onChange={(s) => setZ({ status: s })} /></Grid>
      </Grid>
      <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", alignItems: "center", mt: 2 }}>
        <Button variant="contained" onClick={onSave}>Objekt speichern</Button>
        <Button variant="outlined" onClick={onSaveNew}>Als neues Objekt</Button>
        <Button variant="outlined" onClick={onPdf}>PDF Objektakte</Button>
        <Button variant="outlined" onClick={onBank}>Kreditanfrage PDF</Button>
        <Button variant="outlined" onClick={onReset}>{armReset ? "Wirklich zurücksetzen?" : "Beispielwerte"}</Button>
        <Typography variant="caption" color="text.secondary">{msg}</Typography>
      </Stack>
    </Box>
  );
}

type P = {
  v: V; set: <K extends keyof V>(k: K) => (x: V[K]) => void; setGes: (i: number, p: Partial<V["ges"][number]>) => void;
  gewerke: Gewerk[]; nk: NkPos[]; z: Zus; setZ: (p: Partial<Zus>) => void;
  REF: Ref; setREF: (r: Ref) => void;
  objs: Objekt[]; currentId: string | null; onLoad: (o: Objekt) => void; onDelete: (id: string) => void;
};

export function Zusatz({ v, set, setGes, gewerke, nk, z, setZ, REF, setREF, objs, currentId, onLoad, onDelete }: P) {
  const r = rechne(v, gewerke, nk), C = cash(v, gewerke, nk), res = reserve(v, r), ziel = num(v.ziel);
  const [armPlan, setArmPlan] = useState(false);
  const [refMsg, setRefMsg] = useState("");
  const [armDel, setArmDel] = useState<string | null>(null);
  const [armRef, setArmRef] = useState(false);
  const [pf, setPf] = useState<{ rahmen: number; ek: number }>(() => {
    try { return { rahmen: 0, ek: 0, ...JSON.parse(localStorage.getItem("maison-margin-portfolio") || "{}") }; } catch { return { rahmen: 0, ek: 0 }; }
  });
  const setPF = (p: Partial<typeof pf>) => {
    const n = { ...pf, ...p }; setPf(n);
    try { localStorage.setItem("maison-margin-portfolio", JSON.stringify(n)); } catch { /* ignorieren */ }
  };

  // ---- Rücklagen ----
  const nw = num(z.nwAnteil) / 100, rlA = num(z.rlHaus) * nw;
  const koest = r.gewinn > 0 ? (r.gewinn * num(v.koest)) / 100 : 0;
  const gwSum = v.sanModus === "pausch" ? 0 : r.gewerkeNetto;
  const hrl = (gwSum * num(z.haftrl)) / 100;

  // ---- Bewertung ----
  const A = r.A, N = bewert(REF, z, A, z.bwNach), Vb = bewert(REF, z, A, z.bwVor);
  const vg = z.vergleiche.filter((x) => num(x.m2) > 0 && num(x.preis) > 0), qms = vg.map((x) => x.preis / x.m2), w = num(z.bwGewicht) / 100;
  const useV = qms.length >= 3 && w > 0, gew = useV ? N.qm * (1 - w) + median(qms) * w : N.qm;
  const sp = num(REF.spanne) / 100, glo = gew * (1 - sp), ghi = gew * (1 + sp);
  const verk = num(v.verkM2), kauf = r.vers ? num(v.kauf) / A : num(v.kauf) / A;
  const dv = verk / gew - 1, dk = kauf / Vb.qm - 1, med = median(qms);
  const setRefPart = (p: Partial<Ref>) => { setREF({ ...REF, ...p }); setRefMsg("Geändert und in diesem Browser gespeichert."); };

  // ---- Freigaben, Plan/Ist ----
  const F = freigabe(v, z, r), bought = ["Gekauft", "In Sanierung", "Im Verkauf", "Verkauft"].includes(z.status);
  const ist = istCalc(v, z, gewerke, nk), I = cats(ist), Pl: Omit<Plan, "am"> = z.plan || cats(r), hasPlan = !!z.plan;
  const rowsPI: [string, keyof Omit<Plan, "am">, number, string?][] = [
    ["Ankauf + Nebenkosten", "ank", 1], ["Sanierung", "san", 1], ["Finanzierung", "fin", 1], ["Haltekosten", "halte", 1], ["Vertrieb + Rücklage", "vertr", 1],
    ["Sonstige Mehrkosten", "mehr", 1], ["Gesamtkosten", "tot", 1, "total"], ["Erlös", "erl", -1], ["Gewinn vor Steuern", "gew", -1], ["Marge vor Steuer", "marge", -1, "p"], ["Dauer", "M", 1, "m"],
  ];

  // ---- Portfolio ----
  const PF = portfolio(objs), cp = PF.C.concat(PF.P);
  const sum = (a: typeof PF.C, f: (l: (typeof PF.C)[number]) => number) => a.reduce((t, l) => t + f(l), 0);
  const avg = (a: typeof PF.C, f: (l: (typeof PF.C)[number]) => number) => (a.length ? sum(a, f) / a.length : NaN);
  const ekC = sum(PF.C, (l) => l.peak), krC = sum(PF.C, (l) => l.x.kredit), ekP = sum(PF.P, (l) => l.peak), krP = sum(PF.P, (l) => l.x.kredit);
  const by: Record<string, { haft: number; ek: number; gew: number; n: number }> = {};
  PF.C.forEach((l) => (l.v.ges || []).forEach((g) => {
    const k = (g.name || "").trim() || "ohne Namen", b = by[k] || (by[k] = { haft: 0, ek: 0, gew: 0, n: 0 });
    b.haft += (l.x.kredit * num(g.haft)) / 100; b.ek += (l.peak * num(g.ek)) / 100; b.gew += (l.x.gewinn * num(g.gew)) / 100; b.n++;
  }));
  const bench = preisspiegel(objs);

  const gewCls = (m: number) => (m >= ziel - 1e-9 ? GOOD : m >= 0 ? WARN : BAD);

  return (
    <Stack spacing={3}>
      <Section title="Rücklagen" intro="Geld, das gebunden ist oder zurückgelegt werden muss, auch wenn es keine Kosten sind. Die Liquiditätsreserve (im Abschnitt Liquiditätsplan einstellbar) kommt zum Spitzenbedarf dazu.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}><NumField label="Rücklage des Hauses" suffix="€" value={z.rlHaus} onChange={(x) => setZ({ rlHaus: x })} helper="Stand laut Hausverwaltung" /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><NumField label="Nutzwertanteil der Wohnung" suffix="%" value={z.nwAnteil} onChange={(x) => setZ({ nwAnteil: x })} helper="laut Nutzwertgutachten" /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><NumField label="Haftrücklass bei Handwerkern" suffix="%" value={z.haftrl} onChange={(x) => setZ({ haftrl: x })} helper="von den Gewerken, bis zu deren Gewährleistung" /></Grid>
        </Grid>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="overline" color="text.secondary">Für dieses Objekt</Typography>
            <Stack spacing={0.5}>
              <Line label={`Liquiditätsreserve (${num(v.liqRes)} %)`} value={eur(res)} />
              <Line strong label="Eigenkapital inkl. Reserve" value={eur(C.peak + res)} />
              <Line label="KöSt-Rückstellung beim Verkauf" value={eur(koest)} />
              <Line label="Frei verfügbar nach Verkauf und KöSt" value={eur(C.R[C.N].verk - koest)} />
              <Line label="Gewährleistungsvorsorge" value={r.rl ? eur(r.rl) + " · Kostenansatz, 3 Jahre Gewährleistung" : "nicht aktiviert"} />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Typography variant="overline" color="text.secondary">Haus und Gewährleistung</Typography>
            <Stack spacing={0.5}>
              <Line label="Hausrücklage gesamt" value={eur(num(z.rlHaus))} />
              <Line label="Anteil eurer Wohnung" value={nw ? `${eur(rlA)} (${eur(rlA / A)}/m²)` : "Nutzwertanteil eintragen"} />
              <Line label="Sonderumlage (in den Kosten)" value={eur(num(v.sonder))} />
              <Line strong label="Haftrücklass bei Handwerkern einbehalten" value={eur(hrl)} />
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Die Hausrücklage bleibt beim Haus und geht mit der Wohnung an den Käufer über – eine hohe Rücklage ist ein Verkaufsargument, eine niedrige mit anstehenden Sanierungen ein Sonderumlagen-Risiko (Eigentümerprotokolle prüfen).
            </Typography>
          </Grid>
        </Grid>
      </Section>

      <Section title="Bewertung" intro="Vergleichswert-Schätzung aus amtlichen Transaktionsdaten (Grundbuch, Statistik Austria / Land Steiermark) mit Lagefaktor je Grazer Bezirk und Zu- und Abschlägen. Der Modus legt fest, wie streng bewertet wird. Eine Plausibilitätsprüfung, kein Gutachten: Für die Beleihung verlangt die Bank meist ein Gutachten eines Sachverständigen.">
        <ToggleButtonGroup exclusive size="small" value={z.bwMode} onChange={(_, m: BwMode | null) => m && setZ({ bwMode: m })}>
          {(Object.keys(MODENAME) as BwMode[]).map((m) => <ToggleButton key={m} value={m}>{MODENAME[m]}</ToggleButton>)}
        </ToggleButtonGroup>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={1.5}>
              <Sel label="Region" value={z.bwRegion} options={REF.regionen} onChange={(s) => setZ({ bwRegion: s })} />
              {z.bwRegion === "Graz-Stadt" && <Sel label="Grazer Bezirk" value={z.bwBezirk} options={REF.bezirke.map((b) => b[0])} onChange={(s) => setZ({ bwBezirk: s })} />}
              <Sel label="Baujahr (laut Baubewilligung)" value={z.bwBau} options={BAU} onChange={(s) => setZ({ bwBau: s })} />
              <FormControlLabel control={<Switch checked={z.bwAussen} onChange={(e) => setZ({ bwAussen: e.target.checked })} />} label="Mit Außenfläche (Balkon, Loggia, Terrasse, Garten)" />
              <Sel label="Lage im Bezirk" value={z.bwLage} options={Object.keys(REF.lage)} onChange={(s) => setZ({ bwLage: s })} />
              <Sel label="Zustand beim Ankauf" value={z.bwVor} options={Object.keys(REF.zustand)} onChange={(s) => setZ({ bwVor: s })} />
              <Sel label="Zustand nach Sanierung" value={z.bwNach} options={Object.keys(REF.zustand)} onChange={(s) => setZ({ bwNach: s })} />
              <Sel label="Stockwerk" value={z.bwStock} options={Object.keys(REF.stock)} onChange={(s) => setZ({ bwStock: s })} />
              <Sel label="Energieklasse" value={z.bwEnergie} options={Object.keys(REF.energie)} onChange={(s) => setZ({ bwEnergie: s })} />
              <Sel label="Störfaktoren" value={z.bwStoer} options={Object.keys(REF.stoer)} onChange={(s) => setZ({ bwStoer: s })} />
              <NumField label="Stellplatz / Garage" suffix="€" value={z.bwStell} onChange={(x) => setZ({ bwStell: x })} helper="Wert zusätzlich, falls dabei" />
              <NumField label="Gewicht Vergleichsobjekte" suffix="%" value={z.bwGewicht} onChange={(x) => setZ({ bwGewicht: x })} helper="ab 3 Vergleichen" />
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={1.5}>
              <Grid container spacing={1}>
                <Grid size={{ xs: 12, sm: 6 }}><Kpi label={`Wert nach Sanierung (${z.bwNach})`} value={`${n0(gew)} €/m²`} sub={`${eur(gew * A + num(z.bwStell))} · Spanne ${n0(glo)}–${n0(ghi)} €/m²`} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Kpi label={`Wert im Ist-Zustand (${z.bwVor})`} value={`${n0(Vb.qm)} €/m²`} sub={`${eur(Vb.tot)} · Spanne ${n0(Vb.lo)}–${n0(Vb.hi)} €/m²`} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Kpi label="Euer Verkaufsansatz" value={`${dv >= 0 ? "+" : ""}${pct(dv * 100)}`} sub={`${n0(verk)} €/m² zum Modellwert`} color={verk > ghi ? BAD : verk > gew * 1.02 ? WARN : GOOD} /></Grid>
                <Grid size={{ xs: 12, sm: 6 }}><Kpi label="Euer Einkauf" value={`${dk >= 0 ? "+" : ""}${pct(dk * 100)}`} sub={`${n0(kauf)} €/m² zum Wert im Ist-Zustand`} color={dk <= -0.1 ? GOOD : dk <= 0 ? WARN : BAD} /></Grid>
              </Grid>
              <Alert severity={verk > ghi ? "warning" : "info"} sx={{ fontSize: 13 }}>
                {verk > ghi ? `Euer Verkaufspreis liegt über der Spanne des Modells (${MODENAME[z.bwMode]}). Mit Vergleichsobjekten belegen oder senken.` : verk > gew * 1.02 ? "Euer Verkaufspreis liegt über dem Modellwert, aber in der Spanne." : "Euer Verkaufspreis ist durch das Modell gedeckt."}
                {useV ? ` Gewichtet mit ${Math.round(w * 100)} % Vergleichsmedian (${n0(med)} €/m², ${qms.length} Objekte); reines Modell ${n0(N.qm)} €/m².` : qms.length ? ` Für die Gewichtung mit Vergleichsobjekten braucht es mindestens 3 (jetzt ${qms.length}).` : ""}
              </Alert>
              <Button variant="contained" sx={{ alignSelf: "flex-start" }} onClick={() => set("verkM2")(Math.round(gew / 10) * 10)}>Wert als Verkaufspreis übernehmen</Button>
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow><TableCell sx={th}>Herleitung (nach Sanierung)</TableCell><TableCell sx={th} align="right">Parameter</TableCell><TableCell sx={th} align="right">angesetzt</TableCell><TableCell sx={th} align="right">€/m²</TableCell></TableRow></TableHead>
                  <TableBody>
                    <TableRow><TableCell colSpan={3} sx={{ py: 0.75 }}>{N.hin}</TableCell><TableCell sx={tc} align="right">{n0(N.base)}</TableCell></TableRow>
                    {N.adj.map(([nm, p, q], i) => {
                      const val = N.adj.slice(0, i + 1).reduce((acc, x) => acc * (1 + x[2] / 100), N.base);
                      return (
                        <TableRow key={nm}>
                          <TableCell sx={{ py: 0.75 }}>{nm}</TableCell>
                          <TableCell sx={tc} align="right">{p >= 0 ? "+" : ""}{p.toLocaleString("de-AT", { maximumFractionDigits: 1 })} %</TableCell>
                          <TableCell sx={{ ...tc, color: q > 0 ? GOOD : q < 0 ? BAD : undefined }} align="right">{q >= 0 ? "+" : ""}{q.toLocaleString("de-AT", { maximumFractionDigits: 1 })} %</TableCell>
                          <TableCell sx={tc} align="right">{n0(val)}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow><TableCell colSpan={3} sx={{ ...th }}>Modellwert nach Sanierung</TableCell><TableCell sx={{ ...tc, fontWeight: 700 }} align="right">{n0(N.qm)}</TableCell></TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          </Grid>
        </Grid>

        <details>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Referenzdaten und Bewertungsparameter</summary>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">{REF.quelle}</Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" type="date" label="Datenstand" value={REF.stand} onChange={(e) => setRefPart({ stand: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><NumField label="Marktentwicklung seit Datenstand" suffix="%" value={REF.markt} onChange={(x) => setRefPart({ markt: x })} helper={REF.marktQ} /></Grid>
              <Grid size={{ xs: 12, sm: 4 }}><NumField label="Bewertungsspanne ±" suffix="%" value={REF.spanne} onChange={(x) => setRefPart({ spanne: x })} /></Grid>
            </Grid>
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="overline" color="text.secondary">Lagefaktor je Bezirk (1,00 = Graz-Durchschnitt)</Typography>
                <TableContainer><Table size="small"><TableBody>
                  {REF.bezirke.map((b, i) => (
                    <TableRow key={b[0]}>
                      <TableCell sx={{ py: 0.5 }}>{b[0]}</TableCell>
                      <TableCell sx={{ py: 0.5, width: 90 }}><TextField size="small" type="number" value={b[1]} slotProps={{ htmlInput: { step: 0.01, min: 0 } }} onChange={(e) => setRefPart({ bezirke: REF.bezirke.map((x, j) => (j === i ? [x[0], +e.target.value || 0, x[2]] : x)) as Ref["bezirke"] })} /></TableCell>
                      <TableCell sx={{ py: 0.5 }}><TextField size="small" fullWidth value={b[2]} onChange={(e) => setRefPart({ bezirke: REF.bezirke.map((x, j) => (j === i ? [x[0], x[1], e.target.value] : x)) as Ref["bezirke"] })} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody></Table></TableContainer>
                <Typography variant="overline" color="text.secondary" sx={{ display: "block", mt: 2 }}>Basiswerte Graz-Stadt (€/m², Transaktionen 2021–2025)</Typography>
                <TableContainer><Table size="small">
                  <TableHead><TableRow><TableCell sx={th}>Baujahr</TableCell>{["ohne AF <58", "58–78", ">78", "mit AF <58", "58–78", ">78"].map((h, i) => <TableCell key={i} sx={th} align="right">{h}</TableCell>)}</TableRow></TableHead>
                  <TableBody>{REF.basis["Graz-Stadt"].map((row, i) => <TableRow key={i}><TableCell sx={tc}>{BAU[i]}</TableCell>{row.map((x, j) => <TableCell key={j} sx={tc} align="right">{n0(x)}</TableCell>)}</TableRow>)}</TableBody>
                </Table></TableContainer>
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="overline" color="text.secondary">Zu- und Abschläge</Typography>
                {([["zustand", "Zustand (Abschlag, Verjüngung Richtung Neubauniveau)"], ["lage", "Lage im Bezirk"], ["stock", "Stockwerk"], ["energie", "Energieklasse (HWB)"], ["stoer", "Störfaktoren"]] as const).map(([g, t]) => (
                  <Box key={g} sx={{ mb: 1.5 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700 }}>{t}</Typography>
                    <Table size="small"><TableBody>
                      {Object.keys(REF[g]).map((k) => {
                        const val = REF[g][k as keyof (typeof REF)[typeof g]] as unknown;
                        const pair = Array.isArray(val) ? (val as [number, number]) : null;
                        const upd = (i: number, x: number) => {
                          const cur = { ...REF[g] } as Record<string, number | [number, number]>;
                          cur[k] = pair ? (i === 0 ? [x, pair[1]] : [pair[0], x]) : x;
                          setRefPart({ [g]: cur } as Partial<Ref>);
                        };
                        return (
                          <TableRow key={k}>
                            <TableCell sx={{ py: 0.5 }}>{k}</TableCell>
                            <TableCell sx={{ py: 0.5, width: 90 }}><TextField size="small" type="number" value={pair ? pair[0] : (val as number)} onChange={(e) => upd(0, +e.target.value || 0)} /></TableCell>
                            <TableCell sx={{ py: 0.5, width: 110 }}>{pair ? <TextField size="small" type="number" value={pair[1]} onChange={(e) => upd(1, +e.target.value || 0)} /> : null}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody></Table>
                  </Box>
                ))}
                <Typography variant="caption" color="text.secondary">
                  Modus: <b>Streng realistisch</b> setzt Zuschläge und Marktentwicklung nur zur Hälfte an, Abschläge voll, dazu −5 %. <b>Neutral</b> setzt alles voll an. <b>Optimistisch</b> setzt Zuschläge voll, Abschläge zur Hälfte, dazu +3 %.
                </Typography>
              </Grid>
            </Grid>
            <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
              <Button variant="outlined" size="small" onClick={() => { if (!armRef) { setArmRef(true); setTimeout(() => setArmRef(false), 4000); return; } setArmRef(false); setREF(REF0); setRefMsg("Standardwerte geladen."); }}>
                {armRef ? "Wirklich zurücksetzen?" : "Standardwerte laden"}
              </Button>
              <Typography variant="caption" color="text.secondary">{refMsg || `Standardwerte (Stand ${fmtD(REF0.stand)}). Änderungen gelten in diesem Browser.`}</Typography>
            </Stack>
          </Stack>
        </details>
      </Section>

      <Section title="Verkaufspreis aus Vergleichsobjekten" intro="3–5 vergleichbare sanierte Wohnungen eintragen. Transaktionspreise bevorzugen (Preisspiegel, Grundbuch, IMMOunited), Angebotspreise nur als Tendenz. Der Median dokumentiert euren Verkaufspreis für Bank und Objektakte.">
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell sx={th}>Lage / Objekt</TableCell><TableCell sx={th}>m²</TableCell><TableCell sx={th}>Preis €</TableCell><TableCell sx={th} align="right">€/m²</TableCell><TableCell sx={th}>Quelle, Datum</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {z.vergleiche.length === 0 && <TableRow><TableCell colSpan={6} sx={{ color: "text.secondary" }}>Noch keine Vergleichsobjekte. Mit „Vergleich“ das erste eintragen.</TableCell></TableRow>}
              {z.vergleiche.map((x, i) => {
                const patch = (p: Partial<typeof x>) => setZ({ vergleiche: z.vergleiche.map((y, j) => (j === i ? { ...y, ...p } : y)) });
                return (
                  <TableRow key={i}>
                    <TableCell sx={{ py: 0.5 }}><TextField size="small" value={x.lage} placeholder="Bezirk, Zustand" onChange={(e) => patch({ lage: e.target.value })} sx={{ minWidth: 200 }} /></TableCell>
                    <TableCell sx={{ py: 0.5, width: 90 }}><TextField size="small" type="number" value={x.m2 || ""} onChange={(e) => patch({ m2: +e.target.value || 0 })} /></TableCell>
                    <TableCell sx={{ py: 0.5, width: 130 }}><TextField size="small" type="number" value={x.preis || ""} onChange={(e) => patch({ preis: +e.target.value || 0 })} /></TableCell>
                    <TableCell sx={tc} align="right">{num(x.m2) > 0 && num(x.preis) > 0 ? n0(x.preis / x.m2) + " €" : "–"}</TableCell>
                    <TableCell sx={{ py: 0.5 }}><TextField size="small" value={x.quelle} placeholder="z. B. Grundbuch 09/2026" onChange={(e) => patch({ quelle: e.target.value })} sx={{ minWidth: 180 }} /></TableCell>
                    <TableCell sx={{ py: 0.5 }}><IconButton size="small" aria-label="Vergleich entfernen" onClick={() => setZ({ vergleiche: z.vergleiche.filter((_, j) => j !== i) })}><CloseRounded fontSize="small" /></IconButton></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack direction="row" sx={{ gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <Button size="small" startIcon={<AddRounded />} onClick={() => setZ({ vergleiche: [...z.vergleiche, { lage: "", m2: 0, preis: 0, quelle: "" }] })}>Vergleich</Button>
          <Button size="small" variant="contained" disabled={!qms.length} onClick={() => set("verkM2")(Math.round(med / 10) * 10)}>Median als Verkaufspreis übernehmen</Button>
          <Typography variant="caption" color="text.secondary">
            {qms.length ? `Median ${n0(med)} €/m² · Spanne ${n0(Math.min(...qms))}–${n0(Math.max(...qms))} €/m² · euer Ansatz ${n0(verk)} €/m² (${verk / med - 1 >= 0 ? "+" : ""}${pct((verk / med - 1) * 100)})` : "Noch keine Vergleiche mit Fläche und Preis."}
          </Typography>
        </Stack>
      </Section>

      <Section title="Freigaben und Ankaufsbeschluss" intro="Laut Prozesshandbuch: Kalkulation bestätigen, Finanzierung schriftlich freigeben, die Gesellschafter beschließen. Namen und die nötige Stimmenzahl sind änderbar. Wird mit dem Objekt gespeichert.">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 7 }}>
            <Stack spacing={1.5}>
              <Grid container spacing={1}>
                <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth size="small" label="Kalkulation bestätigt von" value={z.frKalkBy} onChange={(e) => setZ({ frKalkBy: e.target.value })} /></Grid>
                <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" type="date" label="Datum" value={z.frKalkAm} onChange={(e) => setZ({ frKalkAm: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
                <Grid size={{ xs: 12, sm: 8 }}><TextField fullWidth size="small" label="Finanzierung freigegeben von" value={z.frFinBy} onChange={(e) => setZ({ frFinBy: e.target.value })} /></Grid>
                <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" type="date" label="Datum" value={z.frFinAm} onChange={(e) => setZ({ frFinAm: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
              </Grid>
              <FormControlLabel control={<Switch checked={z.frBank} onChange={(e) => setZ({ frBank: e.target.checked })} />} label="Schriftliche Bankzusage liegt vor" />
              {r.vers && <NumField label="Bieterlimit laut Beschluss" suffix="€" value={z.frLimit} onChange={(x) => setZ({ frLimit: x })} />}
              <Grid container spacing={1}>
                <Grid size={{ xs: 12, sm: 8 }}><NumField label="Beschluss: nötige Ja-Stimmen" suffix="" value={z.quorum} onChange={(x) => setZ({ quorum: x })} /></Grid>
                <Grid size={{ xs: 12, sm: 4 }}><TextField fullWidth size="small" type="date" label="Datum Beschluss" value={z.frBeschlAm} onChange={(e) => setZ({ frBeschlAm: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} /></Grid>
              </Grid>
              {(v.ges || []).map((g, i) => (
                <TextField key={i} select size="small" label={g.name || "Gesellschafter " + (i + 1)} value={g.vote || ""} onChange={(e) => setGes(i, { vote: e.target.value as "" | "ja" | "nein" })}>
                  <MenuItem value="">offen</MenuItem><MenuItem value="ja">Ja</MenuItem><MenuItem value="nein">Nein</MenuItem>
                </TextField>
              ))}
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 5 }}>
            <Alert severity={F.ok ? "success" : bought ? "error" : "warning"} sx={{ mb: 1.5, fontWeight: 600 }}>
              {F.ok ? "Ankauf freigegeben" : bought ? `Status „${z.status}“, aber Freigaben fehlen` : "Noch nicht freigegeben"}
            </Alert>
            <Stack spacing={0.75}>
              {F.L.map(([ok, t]) => (
                <Stack key={t} direction="row" sx={{ gap: 1 }}>
                  <Typography sx={{ color: ok ? GOOD : BAD, fontWeight: 700 }}>{ok ? "✓" : "✗"}</Typography>
                  <Typography variant="body2">{t}</Typography>
                </Stack>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Section>

      <Section title="Plan / Ist" intro="Beim Kauf die Kalkulation als Plan einfrieren. Danach laufen die Ist-Kosten der Gewerke (Spalte „Ist“ in der Sanierungs-Aufstellung) automatisch mit; Verkaufspreis, Dauer und Mehrkosten hier eintragen. Am Ende steht die echte Marge – die Grundlage für euren Track Record.">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5 }}>
            <Stack spacing={1.5}>
              <NumField label="Tatsächlicher Verkaufspreis" suffix="€" value={z.istVk} onChange={(x) => setZ({ istVk: x })} helper="gesamt, 0 = Plan" />
              <NumField label="Tatsächliche Dauer" suffix="Mon." value={z.istDauer} onChange={(x) => setZ({ istDauer: x })} helper="Ankauf bis Übergabe, 0 = Plan" />
              <NumField label="Sonstige Mehrkosten" suffix="€" value={z.istMehr} onChange={(x) => setZ({ istMehr: x })} helper="nicht in Gewerken erfasst" />
              <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                <Button variant="contained" size="small" onClick={() => {
                  if (z.plan && !armPlan) { setArmPlan(true); setTimeout(() => setArmPlan(false), 4000); return; }
                  setArmPlan(false); setZ({ plan: { am: new Date().toISOString().slice(0, 10), ...cats(r) } });
                }}>{armPlan ? "Plan wirklich überschreiben?" : "Kalkulation als Plan einfrieren"}</Button>
                <Button variant="outlined" size="small" disabled={!hasPlan} onClick={() => setZ({ plan: null })}>Plan löschen</Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">{hasPlan ? `Plan eingefroren am ${fmtD(z.plan!.am)}. Ist-Kosten der Gewerke fließen automatisch ein.` : "Noch kein Plan eingefroren. Vergleich läuft gegen die aktuelle Kalkulation."}</Typography>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, md: 7 }}>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell sx={th}>Position</TableCell><TableCell sx={th} align="right">{hasPlan ? "Plan" : "Aktuell"}</TableCell><TableCell sx={th} align="right">Ist</TableCell><TableCell sx={th} align="right">Abweichung</TableCell></TableRow></TableHead>
                <TableBody>
                  {rowsPI.map(([nm, k, dir, t]) => {
                    const a = Pl[k] || 0, b = I[k] || 0, d = b - a, bad = d * dir > 1e-6, zero = Math.abs(d) < 1e-6;
                    const f = (x: number) => (t === "p" ? pct(x) : t === "m" ? x.toLocaleString("de-AT") + " Mon." : eur(x));
                    const fd = t === "p" ? pct(d).replace(" %", " %-P.") : t === "m" ? (d >= 0 ? "+" : "") + d.toLocaleString("de-AT") + " Mon." : (d >= 0 ? "+" : "") + eur(d);
                    return (
                      <TableRow key={nm}>
                        <TableCell sx={{ ...tc, fontWeight: t === "total" ? 700 : 400 }}>{nm}</TableCell>
                        <TableCell sx={tc} align="right">{f(a)}</TableCell><TableCell sx={tc} align="right">{f(b)}</TableCell>
                        <TableCell sx={{ ...tc, color: zero ? undefined : bad ? BAD : GOOD }} align="right">{zero ? "–" : fd}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>
      </Section>

      <Section title="Portfolio" intro="Alle gespeicherten Objekte zusammen. „Gebunden“ zählt Objekte mit Status Gekauft, In Sanierung und Im Verkauf; „Pipeline“ zusätzlich In Prüfung und Angebot gelegt. Grundlage für den monatlichen KPI-Bericht.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}><NumField label="Kreditrahmen gesamt" suffix="€" value={pf.rahmen} onChange={(x) => setPF({ rahmen: x })} helper="Gilt für alle Objekte in diesem Browser" /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><NumField label="Verfügbares Eigenkapital" suffix="€" value={pf.ek} onChange={(x) => setPF({ ek: x })} /></Grid>
        </Grid>
        <Grid container spacing={1}>
          {([
            ["Objekte gebunden", String(PF.C.length), `${PF.P.length} in Pipeline · ${PF.V.length} verkauft`, undefined],
            ["Eigenkapital gebunden", eur(ekC), pf.ek ? `${pct((ekC / pf.ek) * 100, 0)} von ${eur(pf.ek)}` : "Rahmen eintragen", pf.ek && ekC > pf.ek ? BAD : undefined],
            ["Kredit genutzt", eur(krC), pf.rahmen ? `${pct((krC / pf.rahmen) * 100, 0)} von ${eur(pf.rahmen)}` : "Rahmen eintragen", pf.rahmen && krC > pf.rahmen ? BAD : undefined],
            ["Wenn Pipeline gekauft wird", eur(ekC + ekP) + " EK", eur(krC + krP) + " Kredit", (pf.ek && ekC + ekP > pf.ek) || (pf.rahmen && krC + krP > pf.rahmen) ? WARN : undefined],
            ["Erwarteter Gewinn", eur(sum(PF.C, (l) => l.x.gewinn)), "gebundene Objekte, vor Steuern", undefined],
            ["Pipeline-Wert", eur(sum(cp, (l) => l.x.vk)), "Verkaufswerte gebunden + Pipeline", undefined],
            ["Ø geplante Marge", pct(avg(cp, (l) => l.x.marge)), `Ø Dauer ${Number.isFinite(avg(cp, (l) => l.x.M)) ? avg(cp, (l) => l.x.M).toLocaleString("de-AT", { maximumFractionDigits: 1 }) + " Mon." : "–"}`, undefined],
            ["Verkauft: Ø Ist-Marge", pct(avg(PF.V, (l) => l.ist!.marge)), PF.V.length ? `Ø Ist-Dauer ${avg(PF.V, (l) => l.ist!.M).toLocaleString("de-AT", { maximumFractionDigits: 1 })} Mon.` : "noch keine Verkäufe", undefined],
          ] as [string, string, string, string | undefined][]).map(([a, b, c, col]) => <Grid key={a} size={{ xs: 12, sm: 6, md: 3 }}><Kpi label={a} value={b} sub={c} color={col} /></Grid>)}
        </Grid>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>{["Objekt", "Status", "EK-Spitze", "Kredit", "Gewinn", "Marge", "Dauer", "Freigabe"].map((h) => <TableCell key={h} sx={th}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {PF.C.concat(PF.P, PF.V).length === 0 && <TableRow><TableCell colSpan={8} sx={{ color: "text.secondary" }}>Noch keine gespeicherten Objekte. Gespeicherte Kalkulationen erscheinen hier.</TableCell></TableRow>}
              {PF.C.concat(PF.P, PF.V).map((l) => {
                const x = l.ist || l.x;
                return (
                  <TableRow key={l.o.id}>
                    <TableCell sx={tc}>{l.o.name}</TableCell><TableCell sx={tc}><Chip size="small" label={l.o.status} /></TableCell>
                    <TableCell sx={tc}>{eur(l.peak)}</TableCell><TableCell sx={tc}>{eur(l.x.kredit)}</TableCell>
                    <TableCell sx={tc}>{eur(x.gewinn)}{l.ist ? " (Ist)" : ""}</TableCell>
                    <TableCell sx={{ ...tc, color: x.marge >= num(l.v.ziel) - 1e-9 ? GOOD : x.marge >= 0 ? WARN : BAD }}>{pct(x.marge)}</TableCell>
                    <TableCell sx={tc}>{x.M} Mon.</TableCell><TableCell sx={{ ...tc, color: l.F.ok ? GOOD : WARN }}>{l.F.ok ? "✓" : "offen"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>{["Gesellschafter", "Objekte", "Bürgschaften gesamt", "Eigenkapital gebunden", "Erwarteter Gewinnanteil"].map((h) => <TableCell key={h} sx={th}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {Object.keys(by).length === 0 && <TableRow><TableCell colSpan={5} sx={{ color: "text.secondary" }}>Sobald Objekte gekauft sind, steht hier die Haftung je Gesellschafter.</TableCell></TableRow>}
              {Object.keys(by).map((k) => <TableRow key={k}><TableCell sx={tc}>{k}</TableCell><TableCell sx={tc}>{by[k].n}</TableCell><TableCell sx={tc}>{eur(by[k].haft)}</TableCell><TableCell sx={tc}>{eur(by[k].ek)}</TableCell><TableCell sx={tc}>{eur(by[k].gew)}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Section title="Euer Preisspiegel" intro="Durchschnittliche Einheitspreise aus allen gespeicherten Objekten, je Gewerk. Mit jedem Objekt wird er genauer.">
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>{["Gewerk", "Einheit", "Ø Preis je Einheit", "Angebote", "Firmen"].map((h) => <TableCell key={h} sx={th}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {bench.length === 0 && <TableRow><TableCell colSpan={5} sx={{ color: "text.secondary" }}>Noch keine gespeicherten Objekte mit Gewerken.</TableCell></TableRow>}
              {bench.map((b) => <TableRow key={b.gewerk}><TableCell sx={tc}>{b.gewerk}</TableCell><TableCell sx={tc}>{b.einh || "–"}</TableCell><TableCell sx={tc}>{Number.isFinite(b.ep) ? eur(b.ep) : "–"}</TableCell><TableCell sx={tc}>{b.n}</TableCell><TableCell sx={tc}>{b.firmen || "–"}</TableCell></TableRow>)}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Section title="Objektliste" intro="Gespeicherte Kalkulationen in diesem Browser. Laden übernimmt alle Werte ins Blatt.">
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>{["Objekt", "Status", "Fläche", "Kaufpreis", "Verkauf", "Marge", "Gespeichert", ""].map((h) => <TableCell key={h} sx={th}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {objs.length === 0 && <TableRow><TableCell colSpan={8} sx={{ color: "text.secondary" }}>Noch keine Objekte gespeichert. Füllt das Blatt aus und klickt oben auf „Objekt speichern“.</TableCell></TableRow>}
              {objs.map((o) => (
                <TableRow key={o.id} selected={o.id === currentId}>
                  <TableCell sx={tc}><b>{o.name}</b>{o.adresse && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{o.adresse}</Typography>}</TableCell>
                  <TableCell sx={tc}><Chip size="small" label={o.status} /></TableCell>
                  <TableCell sx={tc}>{n0(o.a)} m²</TableCell><TableCell sx={tc}>{eur(o.kp)}</TableCell><TableCell sx={tc}>{eur(o.vk)}</TableCell>
                  <TableCell sx={{ ...tc, color: gewCls(o.marge) }}>{pct(o.marge)}</TableCell>
                  <TableCell sx={tc}>{new Date(o.updatedAt).toLocaleDateString("de-AT")}</TableCell>
                  <TableCell sx={tc}>
                    <Button size="small" onClick={() => onLoad(o)}>Laden</Button>
                    <Button size="small" color="error" onClick={() => { if (armDel !== o.id) { setArmDel(o.id); setTimeout(() => setArmDel((a) => (a === o.id ? null : a)), 4000); return; } setArmDel(null); onDelete(o.id); }}>{armDel === o.id ? "Sicher?" : "Löschen"}</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <details>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Datenquellen und Methodik der Bewertung</summary>
        <Stack spacing={1.25} sx={{ mt: 1.5, maxWidth: "80ch" }}>
          {[
            ["Grundlage.", "Die Basiswerte sind amtliche Kaufpreise aus dem Grundbuch für 2021–2025, aufgeschlüsselt nach Region, Baujahr, Wohnungsgröße und Außenfläche, für Graz-Stadt, Graz-Umgebung, alle steirischen Bezirke und Österreich gesamt. Die Daten stammen von Statistik Austria, veröffentlicht im Bericht des Landes Steiermark (geometrisches Mittel). Stand der Referenzdaten: " + fmtD(REF.stand) + "."],
            ["Zustand.", "Wird über ein fiktives Baujahr gerechnet: Eine sanierte Wohnung rückt 50 % Richtung Neubauniveau (Baujahr ab 1991), eine kernsanierte 100 % mit 5 % Abschlag, statt nur einen Pauschalzuschlag zu bekommen."],
            ["Marktentwicklung.", "Fortschreibung der Basiswerte mit der Preisentwicklung gebrauchter Wohnungen in Graz laut WKO Steiermark, Immobilienpreisspiegel 2026 (+4,06 %)."],
            ["Lage in Graz.", "Für einzelne Grazer Bezirke gibt es keine amtlichen Kaufpreise. Die Bezirksfaktoren stammen aus Angebotsmedianen (grazjournal 06/2026, IMMOXX 10/2026) relativ zum Graz-Median. St. Leonhard, Geidorf, Jakomini und Eggenberg sind Annahmen und mit „prüfen“ markiert."],
            ["Warum das Modell niedriger liegt als Portale.", "Grundbuchpreise sind Durchschnitte aller Verkäufe, auch unsanierter Wohnungen. Portale zeigen für Graz Angebotsmediane um 4.460–4.830 €/m² – das sind Inseratspreise, keine erzielten Kaufpreise."],
            ["Zu- und Abschläge und Modus.", "Lage, Stockwerk, Energieklasse und Störfaktoren sind Erfahrungswerte aus der Bewertungspraxis (Vergleichswertverfahren nach Liegenschaftsbewertungsgesetz und ÖNORM B 1802), keine amtlichen Sätze, und oben änderbar."],
            ["Grenzen.", "Das Ergebnis ist eine Plausibilitätsprüfung, kein Gutachten. Für die Beleihung verlangt die Bank meist ein Gutachten eines Sachverständigen."],
          ].map(([h, t]) => <Typography key={h} variant="body2"><b>{h}</b> {t}</Typography>)}
          <Typography variant="body2"><b>Quellen:</b> Land Steiermark, Immobiliendurchschnittspreise auf regionaler Ebene 2021–25; Statistik Austria, Immobiliendurchschnittspreise 2025 (28.05.2026); WKO Steiermark, Immobilienpreisspiegel 2026; grazjournal, Immobilienpreise Graz 2026; IMMOXX, Immobilienpreise Graz 2026.</Typography>
        </Stack>
      </details>
    </Stack>
  );
}
