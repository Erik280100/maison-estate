"use client";

// Mietrechner: Rendite, Cashflow, Bankfähigkeit, Stresstest und Exit für vermietete Wohnungen (MRG).
// Rechenlogik: ./miete/rechne.ts · Export: ./miete/export.ts
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Tooltip as ChartTooltip, Legend, Filler,
} from "chart.js";
import { Line as LineChart } from "react-chartjs-2";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
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
import { brand } from "@/theme/theme";
import { Line, NumField, Section, ampelColor } from "./ankauf/ui";
import { download, excel, pdfAkte, pdfExpose } from "./miete/export";
import {
  DEFAULTS, EXCEL_TPL, MARKT, MRG_INFO, STATI, calc, eur, exposeText, growth, kundeS, limits, n0, n2, pct, stress,
  type Mrg, type S,
} from "./miete/rechne";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ChartTooltip, Legend, Filler);

const KEY = "maison-miet-draft-v2";
const LKEY = "maison-miet-objekte";
const num = (v: unknown) => +(v as number) || 0;

type Objekt = {
  id: string; name: string; adresse: string; status: string; a: number; kp: number; hmz: number; net: number; cfM: number;
  ziel: number; state: S; updatedAt: number;
};

function loadDraft(): { s: S; id: string | null } {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "null");
    if (d?.S) return { s: { ...DEFAULTS, ...d.S }, id: d.id ?? null };
  } catch { /* ignorieren */ }
  return { s: DEFAULTS, id: null };
}
function loadList(): Objekt[] {
  try { return JSON.parse(localStorage.getItem(LKEY) || "[]"); } catch { return []; }
}

type NF = { k: keyof S; label: string; unit: string; helper?: string; intern?: boolean; kunde?: boolean; when?: (s: S) => boolean };
type CF = { k: keyof S; label: string; helper?: string; intern?: boolean; when?: (s: S) => boolean };

function Fields({ list, s, set, kunde }: { list: NF[]; s: S; set: (k: keyof S, v: number) => void; kunde: boolean }) {
  return (
    <Grid container spacing={2}>
      {list
        .filter((f) => (kunde ? !f.intern : !f.kunde) && (!f.when || f.when(s)))
        .map((f) => (
          <Grid key={String(f.k) + f.label} size={{ xs: 12, sm: 6 }}>
            <NumField label={f.label} suffix={f.unit} value={s[f.k] as number} onChange={(x) => set(f.k, Number.isNaN(x) ? 0 : x)} helper={f.helper} />
          </Grid>
        ))}
    </Grid>
  );
}

function Checks({ list, s, set, kunde }: { list: CF[]; s: S; set: (k: keyof S, v: boolean) => void; kunde: boolean }) {
  return (
    <>
      {list
        .filter((f) => (!kunde || !f.intern) && (!f.when || f.when(s)))
        .map((f) => (
          <FormControlLabel
            key={String(f.k)}
            control={<Switch checked={!!s[f.k]} onChange={(e) => set(f.k, e.target.checked)} />}
            label={
              <span>
                {f.label}
                {f.helper && <Typography variant="caption" color="text.secondary" component="span" sx={{ display: "block" }}>{f.helper}</Typography>}
              </span>
            }
          />
        ))}
    </>
  );
}

const th = { fontWeight: 700, whiteSpace: "nowrap", fontSize: 12 } as const;
const td = { whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", fontSize: 13 } as const;

export function MieteRechner() {
  const [init] = useState(loadDraft);
  const [s, setS] = useState<S>(init.s);
  const [currentId, setCurrentId] = useState<string | null>(init.id);
  const [view, setView] = useState<"intern" | "kunde">("intern");
  const [objs, setObjs] = useState<Objekt[]>(loadList);
  const [msg, setMsg] = useState("");
  const [xMsg, setXMsg] = useState("");
  const [text, setText] = useState("");
  const [armReset, setArmReset] = useState(false);
  const [armDel, setArmDel] = useState<string | null>(null);
  const k = view === "kunde";

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify({ S: s, id: currentId })); } catch { /* ignorieren */ }
  }, [s, currentId]);

  const setN = (key: keyof S, v: number) => setS((o) => ({ ...o, [key]: v }));
  const setB = (key: keyof S, v: boolean) => setS((o) => ({ ...o, [key]: v }));
  const setT = (key: keyof S, v: string) => setS((o) => ({ ...o, [key]: v }) as S);

  const SE = useMemo(() => (k ? kundeS(s) : s), [s, k]);
  const r = useMemo(() => calc(SE), [SE]);
  const L = useMemo(() => limits(SE), [SE]);
  const st = useMemo(() => stress(SE), [SE]);
  const ziel = num(s.ziel) / 100, dz = num(s.dscrZiel);

  const okN = r.net >= ziel - 1e-9, okD = r.dscr >= dz;
  const cls = r.dscr < 1 ? "bad" : (k ? okD : okN && okD) ? "good" : "warn";
  const chip = r.dscr < 1 ? "Rate nicht gedeckt" : cls === "good" ? (k ? "Rate gedeckt" : "Ziel & Bank ok") : !k && !okN ? "unter " + pct(ziel, 1) : "DSCR unter " + n2(dz);
  const cfShow = k ? r.cfPre1 / 12 : r.cfM;
  const brM2 = (r.hmz + num(s.bk)) * 1.1, diff = brM2 / MARKT - 1;
  const ekq = r.inv > 0 ? r.ek / r.inv : 0;
  const last = r.rows[r.rows.length - 1];

  const checks: ["error" | "warning" | "success", string][] = [];
  if (r.dscr < 1) checks.push(["error", `Die Miete deckt die Kreditrate nicht: monatlich fehlen ${eur((r.annJ - r.noi) / 12)}. Mehr Eigenkapital, längere Laufzeit oder tilgungsfreie Zeit prüfen.`]);
  else if (r.dscr < dz) checks.push(["warning", `DSCR ${n2(r.dscr)} unter dem Bankziel ${n2(dz)}. Die Bank wird mehr Eigenmittel oder Sicherheiten verlangen.`]);
  if (ekq < 0.2 && r.kredit > 0) checks.push(["warning", `Eigenmittelanteil ${pct(ekq, 0)}: Banken erwarten bei Wohnimmobilien meist 20–30 %.`]);
  if (diff > 0.1) checks.push(["warning", `Die Bruttomiete liegt ${pct(diff, 0)} über dem Grazer Angebotsmedian – Leerstand höher ansetzen oder Miete belegen.`]);
  if (num(s.leer) < 2) checks.push(["warning", "Leerstand unter 2 % ist optimistisch; Mieterwechsel und Sanierungsphasen einrechnen."]);
  if (s.mrg !== "aus" && num(s.wJ) > 0 && num(s.wJ) < 5) checks.push(["warning", "Mieterwechsel unter 5 Jahren: Im MRG-Bereich müssen Unternehmer mindestens 5 Jahre befristen."]);
  if (num(s.zinsFix) > 0 && num(s.zinsFix) < num(s.H)) checks.push(["warning", `Nach der Fixzinsphase rechnet der Rechner mit ${n2(num(s.zins2))} %. Steigt der Zins stärker, sinkt der Cashflow.`]);
  if (!k && num(s.mw) * r.A < r.inv) checks.push(["warning", "Der Marktwert nach Sanierung liegt unter der Gesamtinvestition – Buchverlust bei sofortigem Verkauf."]);
  if (r.kredit > 0.9 * r.kp + 1) checks.push(["warning", `Der Kredit (${eur(r.kredit)}) liegt über 90 % des Nettokaufpreises (${eur(0.9 * r.kp)}) – Banken finanzieren Nebenkosten meist nicht voll mit.`]);
  if (!k) {
    const miss = ([["docBk", "Betriebskostenaufstellung"], ["docNwg", "Nutzwertgutachten"], ["docEa", "Energieausweis"], ["docHv", "Hausverwaltung"]] as [keyof S, string][])
      .filter(([d]) => !s[d]).map((x) => x[1]);
    if (miss.length) checks.push(["warning", "Noch vom Makler anfordern: " + miss.join(", ") + "."]);
  }
  if (!checks.length) checks.push(["success", "Keine Auffälligkeiten bei Rate, Eigenmitteln, Miethöhe und Leerstand."]);

  // Sensitivität Kaufpreis gegen Miete
  const kBase = num(SE.kaufM2), ks = [-300, -200, -100, 0, 100, 200, 300].map((d) => kBase + d).filter((v) => v >= 0);
  const hb = Math.round(r.hmz * 4) / 4, hs = [-2, -1, 0, 1, 2].map((d) => hb + d).filter((v) => v > 0);
  const sens = ks.map((kk) => hs.map((v) => calc(SE, { kpM2: kk, hmz: v })));

  const col = (net: number, dscr: number) => (dscr < 1 ? "error.main" : (k ? dscr >= dz : net >= ziel - 1e-9 && dscr >= dz) ? "success.main" : "warning.main");

  // Aktionen
  const stateRow = (): Objekt => {
    const x = calc(s);
    return { id: currentId || "", name: s.name || "Ohne Namen", adresse: s.adresse, status: s.status, a: x.A, kp: x.kp, hmz: x.hmz, net: x.net, cfM: x.cfM, ziel, state: s, updatedAt: Date.now() };
  };
  const save = (asNew: boolean) => {
    const row = stateRow();
    let list = loadList(), id = currentId;
    if (asNew || !id || !list.some((o) => o.id === id)) { id = "l" + Date.now().toString(36); list = [{ ...row, id }, ...list]; }
    else list = list.map((o) => (o.id === id ? { ...row, id: id! } : o));
    try { localStorage.setItem(LKEY, JSON.stringify(list)); setObjs(list); setCurrentId(id); setMsg("Gespeichert: " + row.name + " (in diesem Browser)"); }
    catch { setMsg("Speichern hat nicht geklappt."); }
  };
  const del = (id: string) => {
    if (armDel !== id) { setArmDel(id); setTimeout(() => setArmDel((a) => (a === id ? null : a)), 4000); return; }
    const list = loadList().filter((o) => o.id !== id);
    try { localStorage.setItem(LKEY, JSON.stringify(list)); } catch { /* ignorieren */ }
    setObjs(list); setArmDel(null); if (currentId === id) setCurrentId(null); setMsg("Objekt gelöscht.");
  };
  const reset = () => {
    if (!armReset) { setArmReset(true); setTimeout(() => setArmReset(false), 4000); return; }
    setArmReset(false); setS(DEFAULTS); setCurrentId(null); setMsg("Beispielwerte geladen, neues Objekt.");
  };
  const run = async (fn: () => Promise<{ blob: Blob; name: string }>) => {
    setXMsg("Wird erstellt …");
    try { const { blob, name } = await fn(); download(blob, name); setXMsg("Heruntergeladen: " + name); }
    catch { setXMsg("Export hat nicht geklappt."); }
  };
  const copyText = async () => {
    const t = exposeText(s); setText(t);
    try { await navigator.clipboard.writeText(t); setXMsg("Exposé-Text kopiert."); } catch { setXMsg("Text markiert – mit Kopieren übernehmen."); }
  };

  const chartData = {
    labels: ["0", ...r.rows.map((x) => String(x.t))],
    datasets: [
      { label: "Objektwert", data: [num(SE.mw) * r.A, ...r.rows.map((x) => x.wertT)], borderColor: brand.gold600, backgroundColor: "rgba(194,164,103,.18)", fill: 1, pointRadius: 0, tension: 0.2 },
      { label: "Restschuld", data: [r.kredit, ...r.rows.map((x) => x.bal)], borderColor: brand.navy700, fill: false, pointRadius: 0, tension: 0.2 },
    ],
  };

  const mrgBtn = (m: Mrg, label: string) => <ToggleButton value={m}>{label}</ToggleButton>;

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ alignItems: "center" }}>
          <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Objekt" value={s.name} onChange={(e) => setT("name", e.target.value)} /></Grid>
          <Grid size={{ xs: 12, md: 4 }}><TextField fullWidth label="Adresse" value={s.adresse} onChange={(e) => setT("adresse", e.target.value)} /></Grid>
          {!k && (
            <Grid size={{ xs: 12, md: 2 }}>
              <TextField fullWidth select label="Status" value={s.status} onChange={(e) => setT("status", e.target.value)}>
                {STATI.map((x) => <MenuItem key={x} value={x}>{x}</MenuItem>)}
              </TextField>
            </Grid>
          )}
          <Grid size={{ xs: 12, md: k ? 4 : 2 }}>
            <ToggleButtonGroup exclusive size="small" value={view} onChange={(_, v) => v && setView(v)}>
              <ToggleButton value="intern">Intern</ToggleButton>
              <ToggleButton value="kunde">Kundenansicht</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          {k
            ? "Beispielwerte für eine 60-m²-Wohnung in Graz. Alle Werte lassen sich anpassen; die Rechnung erfolgt vor Steuern."
            : "Alle Kosten netto: Wohnraumvermietung ist mit 10 % USt steuerpflichtig, die Vorsteuer ist abziehbar."}
        </Typography>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={3}>
            <Section title="Ankauf & Investition">
              <Fields s={s} set={setN} kunde={k} list={[
                { k: "A", label: "Nutzfläche", unit: "m²" },
                { k: "kaufM2", label: "Unser Einkaufspreis pro m²", unit: "€", intern: true, kunde: false },
                { k: "mw", label: "Kaufpreis pro m²", unit: "€", helper: "Angebotspreis an den Käufer", kunde: true },
              ]} />
              <Checks s={s} set={setB} kunde={k} list={[{ k: "kpBrutto", label: "Einkaufspreis ist Brutto inkl. USt", helper: "wie im Immo-Excel: Nebenkosten und AfA auf Bruttobasis, Vorsteuer wird abgezogen", intern: true }]} />
              <Fields s={s} set={setN} kunde={k} list={[
                { k: "nettoAnt", label: "Netto-Anteil vom Bruttopreis", unit: "%", helper: "Excel: 82 %", intern: true, when: (x) => x.kpBrutto },
                { k: "grest", label: "Grunderwerbsteuer", unit: "%" },
                { k: "eintr", label: "Eintragung Eigentum", unit: "%" },
                { k: "notar", label: "Notar / Treuhand", unit: "%" },
                { k: "notarFix", label: "Notar pauschal", unit: "€", helper: "zusätzlich, Excel: 800 €" },
              ]} />
              <Checks s={s} set={setB} kunde={k} list={[{ k: "maklerOn", label: "Maklerprovision beim Kauf", helper: "3 % zzgl. USt üblich" }]} />
              <Fields s={s} set={setN} kunde={k} list={[
                { k: "makler", label: "Maklerprovision", unit: "%", when: (x) => x.maklerOn },
                { k: "sonst", label: "Sonstige Kosten", unit: "€" },
                { k: "sanM2", label: "Sanierung vor Vermietung", unit: "€/m²", helper: "netto, aus dem Margin Rechner", intern: true },
                { k: "einr", label: "Küche / Einrichtung", unit: "€", intern: true },
              ]} />
              <Line label="Kaufpreis (netto) · Nebenkosten" value={`${eur(r.kp)} · ${eur(r.nk)} (${pct(r.nkR)})`} />
              <Line label="Summe ohne Kreditkosten · Gesamtkosten" value={`${eur(r.kp + r.nk + r.sonst)} · ${eur(r.inv)}`} />
            </Section>

            <Section title="Mietzins nach MRG" intro={MRG_INFO[s.mrg]}>
              <ToggleButtonGroup exclusive size="small" value={s.mrg} onChange={(_, m) => m && setT("mrg", m)}>
                {mrgBtn("voll", "Vollanwendung")}{mrgBtn("teil", "Teilanwendung")}{mrgBtn("aus", "Vollausnahme")}
              </ToggleButtonGroup>
              <Fields s={s} set={setN} kunde={k} list={[
                { k: "rw", label: "Richtwert Steiermark", unit: "€/m²", helper: "ab 1.4.2026, Statistik Austria", when: (x) => x.mrg === "voll" },
                { k: "zu", label: "Zuschläge", unit: "%", helper: "Lage, Lift, Balkon, Ausstattung", when: (x) => x.mrg === "voll" },
                { k: "ab", label: "Abschläge", unit: "%", when: (x) => x.mrg === "voll" },
                { k: "miete", label: "Hauptmietzins netto", unit: "€/m²", helper: "frei vereinbar", when: (x) => x.mrg !== "voll" },
                { k: "extra", label: "Stellplatz, Keller u. Ä.", unit: "€/M" },
                { k: "bk", label: "Betriebskosten", unit: "€/m²", helper: "umlegbar auf den Mieter" },
              ]} />
              <Checks s={s} set={setB} kunde={k} list={[{ k: "befr", label: "Befristeter Vertrag", helper: "25 % Befristungsabschlag", when: (x) => x.mrg === "voll" }]} />
              <Line label="Hauptmietzins · Mieter zahlt brutto" value={`${n2(r.hmz)} €/m² · ${n2(brM2)} €/m²`} />
              <Line label="Angebotsmiete Graz (Median, brutto)" value={`${n2(MARKT)} €/m² · eure Miete ${diff >= 0 ? "+" : ""}${pct(diff, 0)}`} />
            </Section>

            <Section title="Bewirtschaftung">
              <Fields s={s} set={setN} kunde={k} list={[
                { k: "leer", label: "Leerstand / Mietausfall", unit: "%" },
                { k: "verw", label: "Mietverwaltung", unit: "€/M", helper: "Hausverwaltung" },
                { k: "rl", label: "Rücklage (Reparaturfonds)", unit: "€/m²·M", helper: "Eigentümer trägt, nicht umlegbar" },
                { k: "inst", label: "Instandhaltung Wohnung", unit: "€/m²·J" },
                { k: "infl", label: "Inflation (VPI) p.a.", unit: "%", helper: "für Wertsicherung und Kosten" },
              ]} />
              <Line label="Mietanpassung p.a. nach MieWeG" value={pct(growth(s, 2028), 2) + (s.mrg === "voll" ? " · 2027 max. 2 %" : "")} />
            </Section>

            <Section title="Mieterwechsel & Zahlungsverzug">
              <Fields s={s} set={setN} kunde={k} list={[
                { k: "wJ", label: "Mieterwechsel alle", unit: "J.", helper: "Befristung mind. 5 J. bei Unternehmern" },
                { k: "wMM", label: "Maklerprovision Neuvermietung", unit: "BMM", helper: "Bestellerprinzip: Vermieter zahlt" },
                { k: "wRen", label: "Ausmalen, Reparaturen je Wechsel", unit: "€" },
                { k: "rueck", label: "Verspätet bezahlte Miete", unit: "%", helper: "Anteil der Jahresmiete im Rückstand" },
                { k: "verzD", label: "Ø Verzugsdauer", unit: "Mon." },
                { k: "verzZ", label: "Verzugszinsen", unit: "%", helper: "gesetzlich 4 % p.a., § 1000 ABGB" },
              ]} />
              <Line label="Wechselkosten p.a. · Verzug netto p.a." value={`${eur(r.wechselJ)} · ${eur(r.verzJ)}`} />
            </Section>

            <Section title="Finanzierung">
              <ToggleButtonGroup exclusive size="small" value={s.ekMode} onChange={(_, m) => m && setT("ekMode", m)}>
                <ToggleButton value="pct">Fremdfinanzierung in %</ToggleButton>
                <ToggleButton value="eur">Eigenmittel in €</ToggleButton>
              </ToggleButtonGroup>
              <Fields s={s} set={setN} kunde={k} list={[
                { k: "fk", label: "Fremdfinanzierung", unit: "%", helper: "Anteil der Gesamtinvestition", when: (x) => x.ekMode === "pct" },
                { k: "ekEur", label: "Ersparnisse / Eigenmittel", unit: "€", helper: "Rest wird finanziert", when: (x) => x.ekMode === "eur" },
                { k: "zins", label: "Sollzins p.a.", unit: "%" },
                { k: "zinsFix", label: "Fixzinsphase", unit: "J.", helper: "0 = Zins gilt durchgehend" },
                { k: "zins2", label: "Zins danach (Annahme)", unit: "%" },
                { k: "lz", label: "Laufzeit", unit: "J." },
                { k: "tf", label: "Tilgungsfreie Zeit", unit: "J.", helper: "nur Zinsen, danach Annuität" },
                { k: "sond", label: "Sondertilgung pro Jahr", unit: "€" },
                { k: "bearb", label: "Bearbeitungsgebühr Bank", unit: "%" },
                { k: "pfand", label: "Eintragung Pfandrecht", unit: "%" },
                { k: "dscrZiel", label: "Mindest-DSCR der Bank", unit: "×", helper: "Mietertrag ÷ Kreditrate" },
              ]} />
              <Line label="Kredit · Rate" value={`${eur(r.kredit)} · ${eur(r.annM)}/M${r.tf ? " ab Jahr " + (r.tf + 1) : ""}`} />
              <Line label="Kreditnebenkosten · Kredit in % vom Kaufpreis" value={`${eur(r.finK)} · ${pct(r.kp > 0 ? r.kredit / r.kp : 0, 0)}`} />
            </Section>

            {!k && (
              <Section title="Steuer">
                <ToggleButtonGroup exclusive size="small" value={s.stMode} onChange={(_, m) => m && setT("stMode", m)}>
                  <ToggleButton value="gmbh">GmbH (KöSt)</ToggleButton>
                  <ToggleButton value="privat">Privat (Grenzsteuersatz)</ToggleButton>
                </ToggleButtonGroup>
                <Fields s={s} set={setN} kunde={k} list={[
                  { k: "grenz", label: "Grenzsteuersatz", unit: "%", helper: "Verluste mindern immer die Steuer (Excel)", when: (x) => x.stMode === "privat" },
                  { k: "immoest", label: "Immobilienertragsteuer beim Verkauf", unit: "%", when: (x) => x.stMode === "privat" },
                  { k: "koest", label: "Körperschaftsteuer", unit: "%", when: (x) => x.stMode === "gmbh" },
                  { k: "geb", label: "Gebäudeanteil", unit: "%", helper: "Grundanteil-VO, Graz meist 60–70 %" },
                  { k: "afa", label: "AfA Wohngebäude", unit: "%" },
                ]} />
                <Checks s={s} set={setB} kunde={k} list={[
                  { k: "beschl", label: "Beschleunigte AfA", helper: "Jahr 1 dreifach, Jahr 2 doppelt" },
                  { k: "verlust", label: "Verluste mit Flip-Gewinnen verrechnen", helper: "Steuerersparnis in der GmbH", when: (x) => x.stMode === "gmbh" },
                ]} />
              </Section>
            )}

            {!k && (
              <Section title="Unterlagen vom Makler" intro="Haken setzen, sobald die Unterlage vorliegt. Offene Punkte erscheinen unter den Hinweisen.">
                <Checks s={s} set={setB} kunde={k} list={[
                  { k: "docBk", label: "Betriebskostenaufstellung" }, { k: "docNwg", label: "Nutzwertgutachten" },
                  { k: "docEa", label: "Energieausweis" }, { k: "docHv", label: "Hausverwaltung (Kontakt / Vertrag)" },
                ]} />
              </Section>
            )}

            <Section title="Haltedauer & Wertentwicklung">
              <Fields s={s} set={setN} kunde={k} list={[
                { k: "H", label: "Haltedauer", unit: "J." },
                { k: "mw", label: "Marktwert nach Sanierung", unit: "€/m²", helper: "= Kaufpreis in der Kundenansicht", intern: true },
                { k: "wert", label: "Wertsteigerung p.a.", unit: "%" },
                { k: "vkk", label: "Verkaufskosten am Ende", unit: "%" },
                { k: "ziel", label: "Ziel-Nettomietrendite", unit: "%", intern: true },
              ]} />
              <Line label="Wert am Ende · Eigenkapital im Objekt" value={`${eur(r.sale)} · ${eur(last.wertT - last.bal)}`} />
            </Section>

            {!k && (
              <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                <Button variant="contained" onClick={() => save(false)}>Objekt speichern</Button>
                <Button variant="outlined" onClick={() => save(true)}>Als neues Objekt</Button>
                <Button variant="outlined" onClick={reset}>{armReset ? "Wirklich zurücksetzen?" : "Beispielwerte"}</Button>
                <Button variant="outlined" title="Lädt die Annahmen aus DAS IMMO EXCEL" onClick={() => { setS(EXCEL_TPL); setCurrentId(null); setMsg("Annahmen aus DAS IMMO EXCEL geladen (neues Objekt)."); }}>Excel-Vorlage</Button>
                <Typography variant="caption" color="text.secondary">{msg}</Typography>
              </Stack>
            )}
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ p: 3, position: { lg: "sticky" }, top: { lg: 88 }, borderTop: 3, borderTopColor: "secondary.main" }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="overline" color="text.secondary">Nettomietrendite</Typography>
                <Stack direction="row" sx={{ alignItems: "flex-end", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
                  <Typography variant="h3" sx={{ fontWeight: 700, color: k ? (r.net > 0 ? "text.primary" : "error.main") : okN ? "success.main" : r.net > 0 ? "warning.main" : "error.main" }}>
                    {pct(r.net, 2)}
                  </Typography>
                  <Chip size="small" label={chip} color={cls === "good" ? "success" : cls === "bad" ? "error" : "warning"} />
                </Stack>
              </Box>
              <Grid container spacing={1}>
                {([
                  [k ? "Überschuss / Monat" : "Cashflow / Monat", eur(cfShow), cfShow < 0 ? ampelColor.bad : ampelColor.good],
                  ["DSCR", isFinite(r.dscr) ? n2(r.dscr) + " ×" : "kein Kredit", r.dscr >= dz ? ampelColor.good : r.dscr >= 1 ? ampelColor.warn : ampelColor.bad],
                  ["EK-Rendite J1", pct(r.coc), "text.primary"],
                  ["EK-IRR inkl. Exit", pct(r.irr), "text.primary"],
                ] as [string, string, string][]).map(([l, v, c]) => (
                  <Grid key={l} size={6}>
                    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 1.25 }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</Typography>
                      <Typography sx={{ fontWeight: 700, color: c }}>{v}</Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              <Stack spacing={0.75}>
                <Line label="Gesamtinvestition" value={eur(r.inv)} />
                <Line label="Eigenkapital" value={`${eur(r.ek)} (${pct(ekq, 0)})`} />
                <Line label="Jahresnettomiete (Soll)" value={eur(r.mieteJ)} />
                <Line label="Mietertrag nach Kosten" value={eur(r.noi)} />
                <Line label="Bruttomietrendite auf Kaufpreis" value={pct(r.brutto, 2)} />
                <Line label="Kaufpreisfaktor" value={isFinite(r.faktor) ? n2(r.faktor) + "-fach" : "–"} />
                <Line label="Kreditrate p.a." value={eur(r.annJ)} />
                <Line label="Jahresmiete ÷ Kredit" value={pct(r.mieteKredit, 2)} />
                {!k && <Line label={r.priv ? "Einkommensteuer Jahr 1" : "KöSt Jahr 1"} value={eur(r.st1) + (r.st1 < 0 ? " Ersparnis" : "")} />}
                <Line strong label={k ? "Überschuss vor Steuern p.a." : "Cashflow nach Steuer p.a."} value={eur(k ? r.cfPre1 : r.cf1)} />
              </Stack>
              <Alert severity="info" icon={false} sx={{ fontSize: 13 }}>
                {!k && <>Für {pct(ziel, 1)} Nettorendite höchstens <b>{isFinite(L.kmax) && L.kmax > 0 ? n0(L.kmax) + " €/m²" : "–"}</b> zahlen. </>}
                Damit die Miete die Kreditrate deckt, braucht es mindestens <b>{n2(L.hNull)} €/m²</b> Hauptmietzins; für einen DSCR von {n2(dz)} sind es <b>{n2(L.hDscr)} €/m²</b>.
                {s.mrg === "voll" && r.hmz < L.hNull ? " In der Vollanwendung ist der Richtwertmietzins die Obergrenze – das Objekt trägt sich dann nur mit mehr Eigenkapital." : ""}
              </Alert>
              <Stack spacing={0.75}>
                {checks.map(([sev, t]) => <Alert key={t} severity={sev} sx={{ py: 0, fontSize: 13 }}>{t}</Alert>)}
              </Stack>
            </Stack>
          </Card>
        </Grid>
      </Grid>

      <Section title="Vermögensaufbau" intro="Objektwert mit der angenommenen Wertsteigerung gegen die Restschuld. Die Fläche dazwischen ist das Eigenkapital, das im Objekt steckt – die Mieter tilgen den Kredit mit.">
        <Box sx={{ height: 300 }}>
          <LineChart
            data={chartData}
            options={{
              responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
              plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${eur(c.parsed.y ?? NaN)}` } } },
              scales: { y: { ticks: { callback: (v) => n0(+v / 1000) + " T" } }, x: { title: { display: true, text: "Jahre" } } },
            }}
          />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>Nach {r.H} Jahren: {eur(last.wertT - last.bal)} Eigenkapital im Objekt</Typography>
      </Section>

      <Section title="Stresstest" intro="So reagiert das Objekt auf schlechtere Bedingungen. Grün hält die Zielwerte, gelb deckt die Rate knapp, rot deckt sie nicht.">
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell sx={th}>Szenario</TableCell><TableCell sx={th} align="right">Nettorendite</TableCell><TableCell sx={th} align="right">DSCR</TableCell>
              <TableCell sx={th} align="right">{k ? "Überschuss/M" : "Cashflow/M"}</TableCell><TableCell sx={th} align="right">EK-IRR</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {st.map(({ n: nm, r: x }, i) => {
                const c = col(x.net, x.dscr), cf = k ? x.cfPre1 / 12 : x.cfM;
                return (
                  <TableRow key={nm}>
                    <TableCell sx={{ ...td, fontWeight: i === 0 ? 700 : 400 }}>{nm}</TableCell>
                    <TableCell sx={{ ...td, color: c }} align="right">{pct(x.net, 2)}</TableCell>
                    <TableCell sx={{ ...td, color: c }} align="right">{isFinite(x.dscr) ? n2(x.dscr) + " ×" : "–"}</TableCell>
                    <TableCell sx={{ ...td, color: cf < 0 ? "error.main" : undefined }} align="right">{eur(cf)}</TableCell>
                    <TableCell sx={td} align="right">{pct(x.irr)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Section title="Hochrechnung über die Haltedauer" intro="Miete steigt jährlich nach der Wertsicherung, Kosten mit der Inflation. Der Kredit läuft monatlich mit tilgungsfreier Zeit, Fixzinsphase und Sondertilgung. Letzte Zeilen: Verkauf nach Restschuld und Steuer.">
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              {["Jahr", "Miete/M", "Miete eff.", "Kosten", "Ertrag", "Zinsen", "Tilgung", "Kreditrate"].map((h, i) => <TableCell key={h} sx={th} align={i ? "right" : "left"}>{h}</TableCell>)}
              {!k && ["Überschuss vor AfA", "AfA", "Steuerpfl. Gewinn", r.priv ? "ESt" : "KöSt", "Nettogewinn"].map((h) => <TableCell key={h} sx={th} align="right">{h}</TableCell>)}
              {["Cashflow", "Restschuld", "Objektwert"].map((h) => <TableCell key={h} sx={th} align="right">{h}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>
              {r.rows.map((x) => (
                <TableRow key={x.t} hover>
                  <TableCell sx={td}>{x.t} · {2026 + x.t}</TableCell>
                  {[x.mieteM, x.eff, x.kost, x.ertrag, x.zinsJ, x.tilgJ, x.paid].map((v, i) => <TableCell key={i} sx={td} align="right">{eur(v)}</TableCell>)}
                  {!k && [x.vorAfa, x.afaJ, x.evs, x.st, x.netto].map((v, i) => <TableCell key={i} sx={td} align="right">{eur(v)}</TableCell>)}
                  <TableCell sx={{ ...td, color: x.cf < 0 ? "error.main" : undefined }} align="right">{eur(x.cf)}</TableCell>
                  <TableCell sx={td} align="right">{eur(x.bal)}</TableCell>
                  <TableCell sx={td} align="right">{eur(x.wertT)}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell sx={{ ...td, fontWeight: 600 }}>Verkauf</TableCell>
                <TableCell sx={td} colSpan={k ? 7 : 12}>
                  {eur(r.sale)} − {eur(r.vkk)} Kosten{!k && ` · Gewinn ${eur(r.gain)} · ${r.priv ? "ImmoESt" : "KöSt"} ${eur(r.exTax)}`} · netto nach Kredit
                </TableCell>
                <TableCell sx={{ ...td, fontWeight: 600 }} align="right">{eur(r.exNet)}</TableCell>
                <TableCell sx={td} colSpan={2} />
              </TableRow>
              <TableRow>
                <TableCell sx={td} colSpan={k ? 8 : 13}>Summe laufender Cashflow ohne Verkauf</TableCell>
                <TableCell sx={{ ...td, color: r.sumCf < 0 ? "error.main" : undefined }} align="right">{eur(r.sumCf)}</TableCell>
                <TableCell sx={td} colSpan={2} />
              </TableRow>
              <TableRow>
                <TableCell sx={{ ...td, fontWeight: 700 }}>Summe</TableCell>
                <TableCell sx={{ ...td, fontWeight: 700 }} colSpan={k ? 7 : 12}>Eigenkapital {eur(r.ek)} · Rückflüsse inkl. Verkauf</TableCell>
                <TableCell sx={{ ...td, fontWeight: 700 }} align="right">{eur(r.flows.slice(1).reduce((a, b) => a + b, 0))}</TableCell>
                <TableCell sx={{ ...td, fontWeight: 700 }} colSpan={2}>IRR {pct(r.irr)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Section title="Sensitivität: Kaufpreis gegen Miete" intro="Nettomietrendite bei anderem Kaufpreis und anderem Hauptmietzins, alles andere bleibt gleich. Umrandet ist die aktuelle Rechnung.">
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow>
              <TableCell sx={th}>Kauf ↓ / Miete →</TableCell>
              {hs.map((v) => <TableCell key={v} sx={th} align="center">{n2(v)} €</TableCell>)}
            </TableRow></TableHead>
            <TableBody>
              {ks.map((kk, i) => (
                <TableRow key={kk}>
                  <TableCell sx={{ ...td, fontWeight: 600 }}>{n0(kk)} €/m²</TableCell>
                  {hs.map((v, j) => {
                    const x = sens[i][j], cur = kk === kBase && v === hb;
                    return (
                      <TableCell key={v} align="center" sx={{ ...td, color: col(x.net, x.dscr), fontWeight: cur ? 800 : 400, outline: cur ? "2px solid" : undefined, outlineOffset: -2 }}>
                        {pct(x.net, 2)}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Section title="Export & Exposé" intro={k ? "Die Rechnung als Excel oder PDF speichern oder als Text kopieren. Beispielrechnung, keine Zusicherung." : "Objektakte und Excel enthalten die volle interne Kalkulation. Das Exposé rechnet aus Käufersicht: Kaufpreis = Marktwert nach Sanierung, vor Steuern, ohne eure Einkaufsdaten."}>
        <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap", alignItems: "center" }}>
          <Button variant="contained" onClick={() => run(() => excel(s, k))}>Excel exportieren</Button>
          {!k && <Button variant="outlined" onClick={() => run(() => pdfAkte(s))}>PDF Objektakte</Button>}
          <Button variant="outlined" onClick={() => run(() => pdfExpose(s))}>PDF Exposé für Kunden</Button>
          <Button variant="outlined" onClick={copyText}>Exposé-Text kopieren</Button>
          <Typography variant="caption" color="text.secondary">{xMsg}</Typography>
        </Stack>
        {text && <TextField multiline fullWidth minRows={8} value={text} slotProps={{ input: { readOnly: true } }} />}
      </Section>

      {!k && (
        <Section title="Mietobjekte" intro="Gespeicherte Bestandskalkulationen in diesem Browser. Laden übernimmt alle Werte ins Blatt.">
          {objs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">Noch keine Mietobjekte gespeichert. Füllt das Blatt aus und klickt auf „Objekt speichern“.</Typography>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow>
                  {["Objekt", "Status", "Fläche", "Kaufpreis", "Miete", "Nettorendite", "Cashflow/M", "Gespeichert", ""].map((h) => <TableCell key={h} sx={th}>{h}</TableCell>)}
                </TableRow></TableHead>
                <TableBody>
                  {objs.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell sx={td}><b>{o.name}</b>{o.adresse && <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{o.adresse}</Typography>}</TableCell>
                      <TableCell sx={td}><Chip size="small" label={o.status} /></TableCell>
                      <TableCell sx={td}>{n0(o.a)} m²</TableCell>
                      <TableCell sx={td}>{eur(o.kp)}</TableCell>
                      <TableCell sx={td}>{n2(o.hmz)} €/m²</TableCell>
                      <TableCell sx={{ ...td, color: o.net >= (o.ziel || 0.04) - 1e-9 ? "success.main" : "warning.main" }}>{pct(o.net, 2)}</TableCell>
                      <TableCell sx={{ ...td, color: o.cfM < 0 ? "error.main" : "success.main" }}>{eur(o.cfM)}</TableCell>
                      <TableCell sx={td}>{new Date(o.updatedAt).toLocaleDateString("de-AT")}</TableCell>
                      <TableCell sx={td}>
                        <Button size="small" onClick={() => { setS({ ...DEFAULTS, ...o.state }); setCurrentId(o.id); setMsg("Geladen: " + o.name); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Laden</Button>
                        <Button size="small" color="error" onClick={() => del(o.id)}>{armDel === o.id ? "Sicher?" : "Löschen"}</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Section>
      )}

      <FooterNote />
    </Stack>
  );
}

function FooterNote(): ReactNode {
  return (
    <Typography variant="caption" color="text.secondary">
      Nettomietrendite = Mietertrag nach Leerstand, Verzug, Mieterwechsel und nicht umlegbaren Kosten ÷ Gesamtinvestition. DSCR = Mietertrag ÷ Kreditrate (nach der tilgungsfreien Zeit).
      Richtwert Steiermark 9,30 €/m² ab 1.4.2026; Wertsicherung nach Mieten-Wertsicherungsgesetz vereinfacht als ganzjährige Anpassung (in Voll- und Teilanwendung zählt Inflation über 3 % nur zur Hälfte, 2027 in der Vollanwendung höchstens 2 %).
      Befristungen im MRG-Bereich durch Unternehmer mindestens 5 Jahre. Maklerprovision bei Neuvermietung in Bruttomonatsmieten (Hauptmietzins + Betriebskosten). Angebotsmiete Graz 15,15 €/m² brutto (ImmoScout24, Mai 2026).
      Beispielrechnung mit Annahmen, keine Zusicherung von Ertrag oder Wertentwicklung und keine Rechts-, Steuer- oder Finanzierungsberatung.
    </Typography>
  );
}
