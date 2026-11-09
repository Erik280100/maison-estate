"use client";

// Umschuldungsrechner: bestehenden Kredit mit allen Vertragsdaten gegen ein neues Angebot rechnen.
// Rechenlogik: ./umschuldung/rechne.ts
import { useMemo, useState } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Tooltip as ChartTooltip, Legend, Filler,
} from "chart.js";
import { Line as LineChart } from "react-chartjs-2";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
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
import { brand } from "@/theme/theme";
import { Line, Section } from "./ankauf/ui";
import { Fields, Selects, Switches, type CF, type NF, type SF } from "./felder";
import {
  DEFAULTS, PRESETS, calc, deNum, dur, eur, eur2, pct, summary, zNow, zText, zinsPlan, type Art, type S, type Sched,
} from "./umschuldung/rechne";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ChartTooltip, Legend, Filler);

const num = (v: unknown) => +(v as number) || 0;
const th = { fontWeight: 700, whiteSpace: "nowrap", fontSize: 12 } as const;
const td = { whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", fontSize: 13 } as const;

const ARTEN: [string, string][] = [["fix", "Fixzins ganze Laufzeit"], ["var", "Variabel: Euribor + Aufschlag"], ["misch", "Fix, danach variabel"]];
const MONATE = ["Jänner", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

const zinsFelder = (X: "A" | "N"): NF<S>[] => {
  const art = (s: S) => s[("art" + X) as "artA" | "artN"] as Art;
  return [
    { k: ("z" + X) as keyof S, label: "Sollzins (Nominalzins) p.a.", unit: "%", helper: "bei Mischform: Fixzins", when: (s) => art(s) !== "var" },
    { k: ("fix" + X) as keyof S, label: X === "A" ? "Fixzinsphase noch" : "Fixzinsphase", unit: "J.", when: (s) => art(s) === "misch" },
    { k: ("auf" + X) as keyof S, label: "Aufschlag auf den Euribor", unit: "%", helper: "Marge der Bank", when: (s) => art(s) !== "fix" },
    { k: ("floor" + X) as keyof S, label: "Zinsuntergrenze", unit: "%", helper: "0 = keine", when: (s) => art(s) !== "fix" },
    { k: ("cap" + X) as keyof S, label: "Zinsobergrenze", unit: "%", helper: "0 = keine", when: (s) => art(s) !== "fix" },
  ];
};

export function UmschuldungsRechner() {
  const [s, setS] = useState<S>(DEFAULTS);
  const [msg, setMsg] = useState("Start mit Standardwerten.");
  const [presetMsg, setPresetMsg] = useState("Vermittlungsprovision und Sollzins bleiben unverändert.");
  const [armed, setArmed] = useState(false);
  const [text, setText] = useState("");

  const setN = (k: keyof S, v: number) => setS((o) => ({ ...o, [k]: v }));
  const setB = (k: keyof S, v: boolean) => setS((o) => ({ ...o, [k]: v }));
  const setV = (k: keyof S, v: string | number) => setS((o) => ({ ...o, [k]: v }) as S);

  const r = useMemo(() => calc(s), [s]);
  const A = r.A, ok = !r.alt.inf && !r.neu.inf;
  const Ra = r.alt.Rstart || r.alt.R, Rn = r.neu.Rstart || r.neu.R;
  const mon = Ra + r.feeA - (Rn + r.feeN);
  const cls = !ok ? "bad" : r.sav > 0 && r.be ? "good" : r.sav > 0 ? "warn" : "bad";
  const color = { good: "success.main", warn: "warning.main", bad: "error.main" }[cls];

  // Bereits abbezahlt
  const kb = A.kb > 0 ? A.kb : NaN, tq = isFinite(kb) ? A.tilg / kb : NaN;

  // Beleihung
  const wert = num(s.wert), grenze = (wert * num(s.quote)) / 100, reserve = grenze - r.B0, au = num(s.aufst);
  const rA = au > 0 ? calc(s, { aufst: true, light: true }) : null;
  const rAok = rA && !rA.neu.inf;

  // Kostenleiter
  const z0 = { feeN: 0, versN: 0, kontoN: 0, bearb: 0, verm: 0, pfandOn: false, schaetz: 0, notar: 0, sonst: 0, vfe: 0, vfeFix: 0 };
  const steps: [string, string, number | null, Partial<S>][] = [
    ["Sollzins", zText(s, "N").split(" =")[0].split(" fix")[0], 0, z0],
    ["Kontoführung / Spesen", eur2(num(s.feeN)) + "/M", num(s.feeN) * r.neu.n, { versN: 0, kontoN: 0, bearb: 0, verm: 0, pfandOn: false, schaetz: 0, notar: 0, sonst: 0, vfe: 0, vfeFix: 0 }],
    ["Versicherung, Gehaltskonto", eur2(num(s.versN) + num(s.kontoN)) + "/M", (num(s.versN) + num(s.kontoN)) * r.neu.n, { bearb: 0, verm: 0, pfandOn: false, schaetz: 0, notar: 0, sonst: 0, vfe: 0, vfeFix: 0 }],
    ["Bearbeitungsgebühr", deNum(num(s.bearb)) + " % vom Kredit", null, { verm: 0, pfandOn: false, schaetz: 0, notar: 0, sonst: 0, vfe: 0, vfeFix: 0 }],
    ["Pfandrecht", s.pfandOn ? deNum(num(s.pfand)) + " % von " + s.pfandH + " %" : "übernommen", null, { verm: 0, schaetz: 0, notar: 0, sonst: 0, vfe: 0, vfeFix: 0 }],
    ["Schätzung, Notar, Sonstiges", "Fixbeträge", null, { verm: 0, vfe: 0, vfeFix: 0 }],
    ["Vermittlungsprovision", deNum(num(s.verm)) + " % vom Kredit", null, { vfe: 0, vfeFix: 0 }],
    ["Pönale alter Kredit", deNum(num(s.vfe)) + " %" + (num(s.vfeFix) ? " + " + eur(num(s.vfeFix)) : ""), null, {}],
  ];
  let prev: number | null = null, prevKost = 0;
  const ladder = steps.map(([name, grund, amt, ov], idx) => {
    const x = calc({ ...s, ...ov }, { effOnly: true }), e = x.effN;
    const betrag = amt !== null ? amt : x.kost - prevKost;
    prevKost = amt !== null ? prevKost : x.kost;
    if (idx === 0) prevKost = x.kost;
    const d = prev === null ? NaN : e - prev;
    prev = e;
    return { name, grund, betrag, e, d, first: idx === 0 };
  });

  // Euribor-Stress
  const anyVar = s.artA !== "fix" || s.artN !== "fix";
  const rateAfter = (sch: Sched, F: number) => (sch.inf ? NaN : sch.rows.slice(-Math.max(sch.n - F, 1))[0]?.pay ?? NaN);
  const stress = [-0.5, 0, 0.5, 1, 2, 3].map((dE) => {
    const x = calc(s, { dEur: dE, light: true });
    return {
      dE, x,
      zA: zinsPlan(s, "A", { dEur: dE }).i2 * 12, zN: zinsPlan(s, "N", { dEur: dE }).i2 * 12,
      rA: rateAfter(x.alt, zinsPlan(s, "A").F), rN: rateAfter(x.neu, zinsPlan(s, "N").F),
    };
  });

  // Jahresvergleich
  const years: { y: number; pa: number; pn: number; ba: number; bb: number; vorteil: number; be: boolean }[] = [];
  if (ok) {
    const N = Math.max(r.alt.n, r.neu.n), Yn = Math.ceil(N / 12), beY = r.be ? Math.ceil(r.be / 12) : null;
    for (let y = 1; y <= Yn; y++) {
      const t = y * 12;
      let pa = 0, pn = 0;
      for (let m = t - 11; m <= t; m++) { if (m <= r.alt.n) pa += r.alt.rows[m - 1].pay; if (m <= r.neu.n) pn += r.neu.rows[m - 1].pay; }
      const a = r.alt.rows[Math.min(t, r.alt.n) - 1], b = r.neu.rows[Math.min(t, r.neu.n) - 1];
      const ba = t < r.alt.n ? a.B : 0, bb = t < r.neu.n ? b.B : 0;
      const ca = (a ? a.paid : 0) + ba, cb = r.cash + (b ? b.paid : 0) + bb;
      years.push({ y, pa, pn, ba, bb, vorteil: ca - cb, be: y === beY });
    }
  }

  // Sensitivität
  const zN0 = Math.round(zNow(s, "N") * 10000) / 100, zs = [-0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6].map((d) => Math.round((zN0 + d) * 100) / 100).filter((z) => z >= 0);
  const lzBase = s.ziel === "lz" && ok ? Math.max(Math.round(r.neu.n / 12), 1) : num(s.lzN) || 20;
  const ls = [...new Set([lzBase - 10, lzBase - 5, lzBase, lzBase + 5].filter((l) => l >= 1 && l <= 40))];
  const sens = zs.map((z) => ls.map((l) => calc(s, { zN: z / 100, lzN: l, ziel: "rate", light: true })));

  // Hinweise
  const vfeHint =
    s.artA === "var" && (num(s.vfe) > 0 || num(s.vfeFix) > 0)
      ? "Variabler Altkredit: Bei Verbraucher- und Wohnkrediten mit variablem Zins darf die Bank in der Regel keine Pönale verlangen. Bei Fixzins ist sie für Verbraucher auf höchstens 1 % begrenzt (Verträge vor 11.6.2010 ausgenommen). Für Firmenkredite gilt der Vertrag. Ablöseschreiben anfordern."
      : num(s.vfe) > 1
        ? "Pönale über 1 %: Bei Verbraucherkrediten ab 11.6.2010 ist die Vorfälligkeitsentschädigung gesetzlich auf höchstens 1 % begrenzt. Vertragsdatum und Kreditart prüfen."
        : "";

  let belSev: "info" | "warning" = "info", belText: string;
  if (!wert) belText = "Objektwert eintragen, um den freien Rahmen zu sehen.";
  else if (reserve <= 0) { belSev = "warning"; belText = `Kein freier Rahmen. Die Restschuld liegt über ${deNum(num(s.quote))} % des Objektwerts. Erst nach weiterer Tilgung oder Wertsteigerung ist eine Aufstockung realistisch.`; }
  else if (rA && rA.B1 > grenze) { belSev = "warning"; belText = `Aufstockung zu hoch: Inklusive Kosten liegt der neue Kredit ${eur(rA.B1 - grenze)} über der Beleihungsgrenze. Ohne zusätzliche Sicherheit gehen etwa ${eur(Math.max(au - (rA.B1 - grenze), 0))}.`; }
  else belText = `Rund ${eur(reserve)} sind fürs nächste Objekt beleihbar, davon wurden ${eur(isFinite(A.tilg) ? Math.max(A.tilg, 0) : NaN)} bereits getilgt; der Rest kommt aus der Wertsteigerung. Als Eigenmittel oder Sicherheit für ein neues Objekt nutzbar, wenn die Bank die Bonität mitträgt.`;

  let hint: string;
  if (!ok) hint = "Die Rate deckt die Zinsen nicht. Monatsrate, Laufzeit oder Anschlusszins prüfen.";
  else if (cls === "good") hint = `Umschuldung lohnt sich. Die Kosten von ${eur(r.kost)} sind nach ${dur(r.be as number)} hereingespielt. ` + (s.ziel === "lz" ? `Gleiche Rate, Kredit ${dur(Math.max(r.alt.n - r.neu.n, 0))} früher abbezahlt.` : `Die Rate sinkt um ${eur2(mon)} pro Monat.`) + (isFinite(r.zMax) ? ` Das Angebot rechnet sich bis ${pct(r.zMax)} Sollzins.` : "");
  else if (r.sav > 0) hint = "Knapp: Über die Laufzeit gespart, aber die Kosten werden erst spät hereingespielt. Ein früherer Verkauf oder eine weitere Umschuldung frisst den Vorteil.";
  else hint = "So lohnt sich die Umschuldung nicht. " + (isFinite(r.zMax) ? `Der neue Sollzins müsste unter ${pct(r.zMax)} liegen. ` : "") + "Kosten senken oder das bestehende Pfandrecht übernehmen hilft; eine längere Laufzeit senkt die Rate, kostet aber Zinsen.";
  if (s.artN !== "fix" || num(s.fixN) > 0) hint += " Nach der Fixzinsphase bzw. bei variablem Zins gilt der angenommene Zins; steigt er, sinkt die Ersparnis.";

  const dv = (v: number, x: number) => (x > 0 && isFinite(v) ? ` (Vertrag ${deNum(x)} %)` : "");

  // Chart
  const a = r.alt.inf ? [] : [r.B0, ...r.alt.rows.map((x) => x.B)], b = r.neu.inf ? [] : [r.B1, ...r.neu.rows.map((x) => x.B)];
  const N = Math.max(a.length, b.length, 13);
  const chartData = {
    labels: Array.from({ length: N }, (_, i) => i),
    datasets: [
      { label: "Bestehender Kredit", data: a, borderColor: brand.navy700, pointRadius: 0, borderWidth: 2, tension: 0 },
      { label: "Neuer Kredit", data: b, borderColor: brand.gold600, backgroundColor: "rgba(194,164,103,.14)", fill: true, pointRadius: 0, borderWidth: 2.5, tension: 0 },
    ],
  };

  const copy = async () => {
    const t = summary(s); setText(t);
    try { await navigator.clipboard.writeText(t); setMsg("Zusammenfassung kopiert."); } catch { setMsg("Text markiert, bitte mit Kopieren übernehmen."); }
  };
  const reset = () => {
    if (!armed) { setArmed(true); setTimeout(() => setArmed(false), 4000); return; }
    setArmed(false); setS(DEFAULTS); setMsg("Beispielwerte geladen.");
  };
  const toBank = () => {
    const x = calc(s, { light: true });
    setS((o) => (o.quelle !== "bank"
      ? { ...o, quelle: "bank", rest: Math.round(x.B0), lzA: Math.round((x.alt.n / 12) * 2) / 2, rateA: Math.round((x.alt.R || 0) * 100) / 100, kbA2: o.kbA }
      : o));
  };
  const preset = (k: keyof typeof PRESETS) => {
    const { t, ...v } = PRESETS[k];
    setS((o) => ({ ...o, ...v })); setPresetMsg("Marktwerte für " + t + " übernommen. Vermittlungsprovision und Fixzins bitte selbst setzen.");
  };

  const bankFelder: NF<S>[] = [
    { k: "rest", label: "Offene Restschuld", unit: "€", helper: "laut Kontoauszug oder Ablöseschreiben" },
    { k: "lzA", label: "Restlaufzeit", unit: "J.", when: (x) => x.kennt !== "rate" },
    { k: "rateA", label: "Monatsrate", unit: "€", helper: "Zins und Tilgung", when: (x) => x.kennt === "rate" },
    { k: "kbA2", label: "Ursprünglicher Kreditbetrag", unit: "€", helper: "für „bereits getilgt“, optional" },
  ];
  const vertragFelder: NF<S>[] = [
    { k: "kbA", label: "Ursprünglicher Kreditbetrag", unit: "€" },
    { k: "lzGes", label: "Laufzeit laut Vertrag", unit: "J." },
    { k: "startJ", label: "Jahr der ersten Rate", unit: "" },
    { k: "sondBisher", label: "Sondertilgungen bisher", unit: "€", helper: "Summe, falls geleistet" },
  ];
  const nebenA: NF<S>[] = [
    { k: "effAv", label: "Effektivzins laut Vertrag", unit: "%", helper: "optional, zum Abgleich" },
    { k: "feeA", label: "Kontoführung / Spesen", unit: "€/M" },
    { k: "versA", label: "Kredit-/Ablebensversicherung", unit: "€/M" },
    { k: "kontoA", label: "Gehaltskonto / Pflichtprodukte", unit: "€/M", helper: "nur wenn an den Kredit gebunden" },
  ];
  const neuFelder: NF<S>[] = [
    { k: "lzN", label: "Laufzeit neu", unit: "J.", when: (x) => x.ziel !== "lz" },
    { k: "tfN", label: "Tilgungsfreie Zeit", unit: "Mon.", helper: "am Anfang nur Zinsen" },
    { k: "sondN", label: "Sondertilgung pro Jahr", unit: "€", helper: "verkürzt die Laufzeit" },
    { k: "effNv", label: "Effektivzins laut Angebot", unit: "%", helper: "optional, zum Abgleich" },
    { k: "feeN", label: "Kontoführung / Spesen", unit: "€/M" },
    { k: "versN", label: "Kredit-/Ablebensversicherung", unit: "€/M" },
    { k: "kontoN", label: "Gehaltskonto / Pflichtprodukte", unit: "€/M", helper: "z. B. Kontowechsel als Bedingung" },
  ];
  const kostenFelder: NF<S>[] = [
    { k: "vfe", label: "Pönale / Vorfälligkeitsentschädigung", unit: "%", helper: "in % vom abgelösten Betrag" },
    { k: "vfeFix", label: "Pönale fix", unit: "€", helper: "falls als Betrag vereinbart" },
    { k: "bearb", label: "Bearbeitungsgebühr neue Bank", unit: "%" },
    { k: "verm", label: "Vermittlungsprovision", unit: "%", helper: "vom neuen Kreditbetrag" },
    { k: "pfand", label: "Eintragungsgebühr Pfandrecht", unit: "%", helper: "gesetzlich 1,2 % der Pfandrechtshöhe", when: (x) => x.pfandOn },
    { k: "pfandH", label: "Pfandrechtshöhe", unit: "%", helper: "in % vom Kredit, meist 100–130 %", when: (x) => x.pfandOn },
    { k: "schaetz", label: "Schätzgebühr", unit: "€" },
    { k: "notar", label: "Notar / Treuhand / Löschung", unit: "€" },
    { k: "sonst", label: "Sonstige Einmalkosten", unit: "€", helper: "z. B. Bereitstellung, Bonitätsprüfung" },
  ];
  const kostenSwitch: CF<S>[] = [
    { k: "pfandOn", label: "Neues Pfandrecht eintragen", helper: "Wird das bestehende Pfandrecht übernommen, kann die Gebühr entfallen. Mit der Bank klären." },
    { k: "mitfin", label: "Kosten mitfinanzieren", helper: "Kreditbetrag steigt um die Kosten, kein Bargeld nötig" },
  ];
  const artSel = (X: "A" | "N"): SF<S>[] => [{ k: ("art" + X) as keyof S, label: "Zinsart", options: ARTEN }];
  const kenntSel: SF<S>[] = [{ k: "kennt", label: "Bekannt ist", options: [["lz", "Restlaufzeit"], ["rate", "Monatsrate"]] }];

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Kunde / Objekt" value={s.kunde} onChange={(e) => setV("kunde", e.target.value)} /></Grid>
          <Grid size={{ xs: 12, md: 6 }}><TextField fullWidth label="Neue Bank / Angebot" value={s.bank} onChange={(e) => setV("bank", e.target.value)} /></Grid>
        </Grid>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Vorbelegt mit Beispielwerten (Wohnkredit über 220.000 €, seit 2020 laufend). Vertragsdaten aus Kreditvertrag, Tilgungsplan und neuem Angebot eintragen.
        </Typography>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={3}>
            <Section title="Bestehender Kredit · Vertragsdaten">
              <ToggleButtonGroup exclusive size="small" value={s.quelle} onChange={(_, v) => { if (v === "bank") toBank(); else if (v) setV("quelle", v); }}>
                <ToggleButton value="vertrag">Aus Kreditvertrag rechnen</ToggleButton>
                <ToggleButton value="bank">Restschuld laut Bank</ToggleButton>
              </ToggleButtonGroup>
              {s.quelle === "vertrag" ? (
                <>
                  <Fields s={s} set={setN} list={vertragFelder.filter((f) => f.k !== "startJ")} />
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Selects s={s} set={setV} list={[{ k: "startM", label: "Erste Rate: Monat", options: MONATE.map((m, i) => [i + 1, m] as [number, string]) }]} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <Fields s={s} set={setN} list={vertragFelder.filter((f) => f.k === "startJ").map((f) => ({ ...f, label: "Erste Rate: Jahr", unit: "J." }))} />
                    </Grid>
                  </Grid>
                </>
              ) : (
                <>
                  <Selects s={s} set={setV} list={kenntSel} />
                  <Fields s={s} set={setN} list={bankFelder} />
                </>
              )}
              <Selects s={s} set={setV} list={artSel("A")} />
              <Fields s={s} set={setN} list={zinsFelder("A")} />
              <Line label="Sollzins (Nominalzins)" value={zText(s, "A")} />
              <Fields s={s} set={setN} list={nebenA} />
              <Line label="Rate · Restlaufzeit · Restschuld" value={r.alt.inf ? "Rate deckt die Zinsen nicht" : `${eur2(Ra)} · ${dur(r.alt.n)} · ${eur(r.B0)}`} />
            </Section>

            <Section title="Bereits abbezahlt">
              <Grid container spacing={1}>
                {([
                  ["Ursprünglich", eur(kb), ""],
                  ["Getilgt", eur(A.tilg), isFinite(tq) ? pct(tq, 1) + " getilgt" : "ursprünglichen Betrag eintragen"],
                  ["Offen", eur(r.B0), ""],
                  ["Zinsen bisher", eur(A.zinsBisher), isFinite(A.raten) ? A.raten + " Raten bezahlt" : "nur aus Vertrag"],
                ] as [string, string, string][]).map(([l, v, sub]) => (
                  <Grid key={l} size={{ xs: 6, sm: 3 }}>
                    <Box sx={{ border: 1, borderColor: l === "Getilgt" ? "secondary.main" : "divider", borderRadius: 1.5, p: 1.25 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</Typography>
                      <Typography sx={{ fontWeight: 700 }}>{v}</Typography>
                      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
                    </Box>
                  </Grid>
                ))}
              </Grid>
              {isFinite(tq) && (
                <Box sx={{ display: "flex", height: 10, borderRadius: 1, overflow: "hidden", bgcolor: "divider" }} aria-hidden>
                  <Box sx={{ width: `${Math.min(Math.max(tq, 0), 1) * 100}%`, bgcolor: brand.gold600 }} />
                  <Box sx={{ flex: 1, bgcolor: brand.navy700, opacity: 0.35 }} />
                </Box>
              )}
            </Section>

            <Section title="Markt & Vorschläge">
              <Fields s={s} set={setN} list={[{ k: "eur", label: "3-Monats-Euribor", unit: "%", helper: "Indikator für variable Zinsen, Stand 30.10.2026: 2,676 %" }]} />
              <Typography variant="body2" color="text.secondary">Marktwerte ins neue Angebot übernehmen (Aufschlag, Bearbeitung, Schätzung, Kontoführung, Pfandrecht):</Typography>
              <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                <Button variant="outlined" size="small" onClick={() => preset("top")}>Sehr gute Bonität</Button>
                <Button variant="outlined" size="small" onClick={() => preset("mid")}>Ausreichende Bonität</Button>
                <Button variant="outlined" size="small" onClick={() => preset("low")}>Günstigster Fall</Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">{presetMsg}</Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow><TableCell sx={th}>Position</TableCell><TableCell sx={th}>Marktüblich</TableCell></TableRow></TableHead>
                  <TableBody>
                    {[
                      ["Ø Wohnbaukredit neu", "3,39 % (variabel 3,21 %, fix 3,42 %)"], ["Aufschlag sehr gute Bonität", "0,84–1,50 %, Median 1,13 %"],
                      ["Aufschlag ausreichende Bonität", "0,84–1,70 %, Median 1,25 %"], ["Bearbeitungsgebühr", "0–2 %, verhandelbar"],
                      ["Schätzgebühr", "0–600 €, Median ca. 370 €"], ["Kontoführung", "9–45 €/Quartal, Median ca. 20 €"],
                      ["Pfandrecht", "1,2 % von 100–130 % des Kredits"], ["Pönale Verbraucherkredit", "höchstens 1 % (Verträge vor 11.6.2010 ggf. mehr)"],
                      ["Vermittlung Hypothekarkredit", "höchstens 2 % mit, 5 % ohne Immobilienvermittlung (Makler, § 17 IMV)"], ["Vermittlung Personalkredit", "höchstens 5 % der Bruttokreditsumme"],
                    ].map(([p, v]) => <TableRow key={p}><TableCell sx={{ fontSize: 13 }}>{p}</TableCell><TableCell sx={{ fontSize: 13 }}>{v}</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </TableContainer>
              <Typography variant="caption" color="text.secondary">
                Quellen: Euribor laut euribor-rates.eu (30.10.2026); Durchschnittszins OeNB (Ende 2025); Aufschläge und Gebühren AK Wien, Erhebung Hypothekarkredite 2023; Provisionen WKO. Banken verhandeln einzeln; die Werte sind Orientierung, kein Angebot.
              </Typography>
            </Section>

            <Section title="Neuer Kredit · Angebot">
              <Selects s={s} set={setV} list={artSel("N")} />
              <Fields s={s} set={setN} list={zinsFelder("N")} />
              <Line label="Sollzins (Nominalzins)" value={zText(s, "N")} />
              <ToggleButtonGroup exclusive size="small" value={s.ziel} onChange={(_, v) => v && setV("ziel", v)}>
                <ToggleButton value="rate">Rate senken</ToggleButton>
                <ToggleButton value="lz">Rate halten, früher fertig</ToggleButton>
              </ToggleButtonGroup>
              <Fields s={s} set={setN} list={neuFelder} />
              <Line label="Rate · Laufzeit" value={r.neu.inf ? "Rate deckt die Zinsen nicht" : (num(s.tfN) > 0 ? `erst ${eur2(Rn)} nur Zinsen, dann ${eur2(r.neu.R)}` : eur2(Rn)) + ` · ${dur(r.neu.n)} · Kredit ${eur(r.B1)}`} />
            </Section>

            <Section title="Kosten der Umschuldung">
              <Fields s={s} set={setN} list={kostenFelder} />
              <Switches s={s} set={setB} list={kostenSwitch} />
              <Line label="Umschuldungskosten" value={eur(r.kost) + (r.B0 ? ` · ${pct(r.kost / r.B0, 1)} der Restschuld` : "") + (s.mitfin ? " · mitfinanziert" : " · bar")} />
              {vfeHint && <Alert severity="warning" sx={{ fontSize: 13 }}>{vfeHint}</Alert>}
            </Section>

            <Section title="Beleihungsrahmen fürs nächste Objekt">
              <Fields s={s} set={setN} list={[
                { k: "wert", label: "Aktueller Objektwert", unit: "€", helper: "Verkehrswert bzw. Schätzwert der Bank" },
                { k: "quote", label: "Beleihungsquote der Bank", unit: "%", helper: "Belehnungsgrenze auf den Wert" },
                { k: "aufst", label: "Aufstockung im neuen Kredit", unit: "€", helper: "Betrag, der fürs neue Objekt ausbezahlt wird" },
              ]} />
              <Stack spacing={0.75}>
                <Line label="Beleihungsgrenze" value={eur(grenze)} />
                <Line label="Abzüglich Restschuld heute" value={eur(-r.B0)} />
                <Line strong label="Freier Rahmen" value={<Box component="span" sx={{ color: reserve > 0 ? "success.main" : "error.main" }}>{eur(reserve)}</Box>} />
                <Line label="Belehnung heute" value={wert ? pct(r.B0 / wert, 1) + " vom Objektwert" : "–"} />
                <Line label="Aufstockung gewünscht" value={au ? eur(au) : "keine"} />
                <Line label="Neuer Kredit gesamt" value={rAok ? eur(rA.B1) : "–"} />
                <Line label="Rate gesamt" value={rAok ? eur2((rA.neu.Rstart || rA.neu.R) + rA.feeN) : "–"} />
                <Line label="Mehrrate für die Aufstockung" value={rAok ? eur2((rA.neu.Rstart || rA.neu.R) - Rn) : "–"} />
                <Line label="Belehnung danach" value={rA && wert ? pct(rA.B1 / wert, 1) : "–"} />
              </Stack>
              <Alert severity={belSev} sx={{ fontSize: 13 }}>{belText}</Alert>
            </Section>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ p: 3, position: { lg: "sticky" }, top: { lg: 88 }, borderTop: 3, borderTopColor: "secondary.main" }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="overline" color="text.secondary">Ersparnis über die Laufzeit</Typography>
                <Stack direction="row" sx={{ alignItems: "flex-end", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color }}>{ok ? eur(r.sav) : "–"}</Typography>
                  <Chip size="small" color={cls === "good" ? "success" : cls === "warn" ? "warning" : "error"} label={!ok ? "Eingaben prüfen" : cls === "good" ? "Lohnt sich" : cls === "warn" ? "knapp" : "Lohnt sich nicht"} />
                </Stack>
              </Box>
              <Grid container spacing={1}>
                <Grid size={6}>
                  <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 1.25 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>Rate heute</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{eur2(Ra + r.feeA)}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.alt.inf ? "tilgt nicht" : `noch ${dur(r.alt.n)} · ${pct(zNow(s, "A"))}`}</Typography>
                  </Box>
                </Grid>
                <Grid size={6}>
                  <Box sx={{ border: 1, borderColor: "secondary.main", borderRadius: 1.5, p: 1.25 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 0.5 }}>Rate neu</Typography>
                    <Typography sx={{ fontWeight: 700 }}>{r.neu.inf ? "–" : eur2(Rn + r.feeN)}</Typography>
                    <Typography variant="caption" color="text.secondary">{r.neu.inf ? "tilgt nicht" : `${dur(r.neu.n)} · ${pct(zNow(s, "N"))}`}</Typography>
                  </Box>
                </Grid>
              </Grid>
              <Stack spacing={0.75}>
                <Line label="Monatlich weniger" value={Math.abs(mon) < 0.5 ? "gleich" : eur2(mon)} />
                <Line label="Umschuldungskosten" value={eur(r.kost) + (s.mitfin ? " mitfinanziert" : " bar")} />
                <Line label="Kosten hereingespielt nach" value={r.be ? dur(r.be) : "nicht innerhalb der Laufzeit"} />
                <Line label="Gesamtaufwand alt" value={eur(r.tA)} />
                <Line label="Gesamtaufwand neu" value={eur(r.tN)} />
                <Line label="Zinsen alt · neu" value={`${eur(r.alt.zins)} · ${eur(r.neu.zins)}`} />
                <Line label="Effektivzins alt" value={pct(r.effA) + dv(r.effA, num(s.effAv))} />
                <Line label="Effektivzins neu inkl. Kosten" value={pct(r.effN) + dv(r.effN, num(s.effNv))} />
                <Line label="Lohnt sich bis Sollzins neu" value={isFinite(r.zMax) ? pct(r.zMax) : "bei keinem Zins"} />
                {rA && <Line label="Mit Aufstockung: Kredit · Rate" value={rAok ? `${eur(rA.B1)} · ${eur2((rA.neu.Rstart || rA.neu.R) + rA.feeN)}` : "–"} />}
              </Stack>
              <Alert severity={cls === "good" ? "success" : "warning"} icon={false} sx={{ fontSize: 13 }}>{hint}</Alert>
              <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
                <Button variant="contained" onClick={copy}>Zusammenfassung kopieren</Button>
                <Button variant="outlined" onClick={reset}>{armed ? "Wirklich zurücksetzen?" : "Beispielwerte"}</Button>
              </Stack>
              <Typography variant="caption" color="text.secondary">{msg}</Typography>
              {text && <TextField multiline fullWidth minRows={8} value={text} slotProps={{ input: { readOnly: true } }} />}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <Section title="Restschuld im Vergleich" intro="Abbau der Schuld ab heute mit dem bestehenden und dem neuen Kredit, ohne Aufstockung. Mitfinanzierte Kosten starten den neuen Kredit etwas höher; ein Knick zeigt das Ende der Fixzinsphase oder der tilgungsfreien Zeit.">
        <Box sx={{ height: 300 }}>
          <LineChart
            data={chartData}
            options={{
              responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
              plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { title: (it) => `Monat ${it[0].label}`, label: (c) => `${c.dataset.label}: ${eur(c.parsed.y ?? NaN)}` } } },
              scales: {
                y: { ticks: { callback: (v) => Math.round(+v / 1000).toLocaleString("de-AT") + " T" } },
                x: { title: { display: true, text: "Jahre ab heute" }, ticks: { autoSkip: false, callback: (v) => (+v % 12 === 0 && (+v / 12) % (N / 12 > 24 ? 5 : N / 12 > 10 ? 2 : 1) === 0 ? String(+v / 12) : "") } },
              },
            }}
          />
        </Box>
      </Section>

      <Section title="Wo ihr mit allen Kosten landet" intro="Vom reinen Sollzins zum Effektivzins des neuen Kredits: jede Position einzeln mit ihrer Wirkung auf den Effektivzins. So seht ihr, welche Gebühr sich zu verhandeln lohnt.">
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>{["Position", "Grundlage", "Betrag", "Effektivzins danach", "Wirkung"].map((h, i) => <TableCell key={h} sx={th} align={i > 1 ? "right" : "left"}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {ladder.map((x) => (
                <TableRow key={x.name}>
                  <TableCell sx={td}>{x.name}</TableCell><TableCell sx={td}>{x.grund}</TableCell>
                  <TableCell sx={td} align="right">{x.first ? "–" : eur(x.betrag)}</TableCell>
                  <TableCell sx={td} align="right">{pct(x.e)}</TableCell>
                  <TableCell sx={td} align="right">{x.first ? "Ausgangswert" : isFinite(x.d) ? (x.d >= 0 ? "+" : "−") + Math.abs(x.d * 100).toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Pp." : "–"}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ "& td": { fontWeight: 700 } }}>
                <TableCell sx={td}>Effektivzins neu</TableCell><TableCell sx={td}>alle Kosten</TableCell>
                <TableCell sx={td} align="right">{eur(r.kost)} einmalig</TableCell><TableCell sx={td} align="right">{pct(r.effN)}</TableCell>
                <TableCell sx={td} align="right">{num(s.effNv) > 0 ? "Angebot: " + deNum(num(s.effNv)) + " %" : ""}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Section title="Wenn der Euribor steigt" intro={anyVar ? "Variable Anteile beider Kredite folgen dem Euribor, Fixzinsen bleiben. Bei Mischformen wirkt die Änderung erst nach der Fixzinsphase." : "Beide Kredite haben derzeit Fixzins über die ganze Laufzeit, der Euribor wirkt sich nicht aus. Zinsart auf variabel oder Mischform stellen, um das Risiko zu sehen."}>
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>{["Euribor", "Sollzins alt danach", "Sollzins neu danach", "Rate alt danach", "Rate neu danach", "Ersparnis"].map((h, i) => <TableCell key={h} sx={th} align={i ? "center" : "left"}>{h}</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {stress.map(({ dE, x, zA, zN, rA: ra, rN }) => {
                const bad = x.alt.inf || x.neu.inf || x.sav <= 0;
                return (
                  <TableRow key={dE}>
                    <TableCell sx={{ ...td, fontWeight: 600 }}>{dE ? (dE > 0 ? "+" : "−") + deNum(Math.abs(dE)) + " Pp. → " : ""}{deNum(num(s.eur) + dE)} %</TableCell>
                    <TableCell sx={td} align="center">{pct(zA)}</TableCell><TableCell sx={td} align="center">{pct(zN)}</TableCell>
                    <TableCell sx={td} align="center">{eur2(ra)}</TableCell><TableCell sx={td} align="center">{eur2(rN)}</TableCell>
                    <TableCell sx={{ ...td, color: bad ? "error.main" : "success.main", fontWeight: dE === 0 ? 800 : 400 }} align="center">{x.alt.inf || x.neu.inf ? "–" : eur(x.sav)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Section title="Jahresvergleich" intro="Zahlungen pro Jahr ab heute inklusive Spesen und Versicherung. Der Vorteil rechnet bar bezahlte Umschuldungskosten am Anfang ab und berücksichtigt den Unterschied in der Restschuld. Grün hinterlegt ist das Jahr, in dem sich die Umschuldung bezahlt macht.">
        {years.length === 0 ? <Typography variant="body2" color="text.secondary">Eingaben prüfen.</Typography> : (
          <TableContainer>
            <Table size="small">
              <TableHead><TableRow>{["Jahr", "Zahlung alt", "Zahlung neu", "Restschuld alt", "Restschuld neu", "Vorteil kumuliert"].map((h, i) => <TableCell key={h} sx={th} align={i ? "right" : "left"}>{h}</TableCell>)}</TableRow></TableHead>
              <TableBody>
                {years.map((y) => (
                  <TableRow key={y.y} sx={y.be ? { bgcolor: "success.light", "& td": { color: "success.contrastText" } } : undefined}>
                    <TableCell sx={td}>{y.y}</TableCell><TableCell sx={td} align="right">{eur(y.pa)}</TableCell><TableCell sx={td} align="right">{eur(y.pn)}</TableCell>
                    <TableCell sx={td} align="right">{eur(y.ba)}</TableCell><TableCell sx={td} align="right">{eur(y.bb)}</TableCell>
                    <TableCell sx={{ ...td, color: y.be ? undefined : y.vorteil >= 0 ? "success.main" : "error.main" }} align="right">{eur(y.vorteil)}</TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ "& td": { fontWeight: 700 } }}>
                  <TableCell sx={td}>Gesamt</TableCell><TableCell sx={td} align="right">{eur(r.alt.paid)}</TableCell><TableCell sx={td} align="right">{eur(r.neu.paid)}</TableCell>
                  <TableCell sx={td} /><TableCell sx={td} /><TableCell sx={td} align="right">{eur(r.sav)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Section>

      <Section title="Sensitivität: Zins gegen Laufzeit" intro="Neue Monatsrate und Ersparnis über die Laufzeit bei anderen Konditionen, alle übrigen Werte bleiben gleich. Grün spart, rot kostet mehr als der bestehende Kredit. Fett ist das aktuelle Angebot.">
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell sx={th}>Sollzins ↓ / Laufzeit →</TableCell>{ls.map((l) => <TableCell key={l} sx={th} align="center">{l} J.</TableCell>)}</TableRow></TableHead>
            <TableBody>
              {zs.map((z, i) => (
                <TableRow key={z}>
                  <TableCell sx={{ ...td, fontWeight: 600 }}>{z.toLocaleString("de-AT", { minimumFractionDigits: 2 })} %</TableCell>
                  {ls.map((l, j) => {
                    const x = sens[i][j], cur = s.ziel !== "lz" && z === zN0 && l === num(s.lzN);
                    return (
                      <TableCell key={l} align="center" sx={{ ...td, color: x.neu.inf || x.sav <= 0 ? "error.main" : "success.main", fontWeight: cur ? 800 : 400, outline: cur ? "2px solid" : undefined, outlineOffset: -2 }}>
                        {x.neu.inf ? "–" : eur((x.neu.Rstart || x.neu.R) + x.feeN) + "/M"}
                        {!x.neu.inf && <Typography variant="caption" component="div" sx={{ opacity: 0.85 }}>{(x.sav >= 0 ? "spart " : "kostet ") + eur(Math.abs(x.sav))}</Typography>}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Typography variant="caption" color="text.secondary">
        Monatliche Annuität. Endet eine Fixzinsphase, wird die Rate mit dem angenommenen Anschlusszins auf die Restlaufzeit neu berechnet; nach einer tilgungsfreien Zeit ebenso. Sondertilgungen am Ende jedes Jahres, die Rate bleibt gleich. „Aus Kreditvertrag rechnen“ geht vom heutigen Sollzins über die gesamte bisherige Laufzeit aus; bei Zinsänderungen in der Vergangenheit weicht die Restschuld ab, dann die Restschuld laut Bank verwenden. Sollzins und Nominalzins sind im österreichischen Kreditvertrag derselbe Satz; der Effektivzins wird als interner Zinsfuß aller Zahlungen gerechnet, beim neuen Kredit inklusive aller Umschuldungskosten, Spesen und Versicherung. Die Ersparnis ist nominal, ohne Abzinsung. Der Beleihungsrahmen ist eine Schätzung, die Bank entscheidet nach Bewertung und Bonität. Pönale, Pfandrechtsübernahme und Gebühren immer mit dem Ablöseschreiben und dem verbindlichen Angebot abgleichen. Keine Rechts- oder Steuerberatung; Kreditvermittlung nur über die dafür berechtigte Stelle.
      </Typography>
    </Stack>
  );
}
