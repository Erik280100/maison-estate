"use client";

// Finanzierungsrechner: errechnet aus Kaufpreis, Eigenmitteln und der Frage "Makler ja/nein"
// Kauf- und Kreditnebenkosten, den Kreditbetrag und den monatsgenauen Annuitätentilgungsplan.
// Rechenlogik und Herkunft der Standardsätze: ./kredit/kredit.ts
import { useMemo, useRef, useState, type ReactNode } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  Filler,
  type Plugin,
} from "chart.js";
import { Line } from "react-chartjs-2";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import Collapse from "@mui/material/Collapse";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Grid from "@mui/material/Grid";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableFooter from "@mui/material/TableFooter";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import ChevronRightRounded from "@mui/icons-material/ChevronRightRounded";
import { brand } from "@/theme/theme";
import {
  KREDIT_DEFAULTS,
  berechneAfaBemessungsgrundlage,
  berechneAfaJahre,
  berechneKreditbetrag,
  berechneTilgungsplan,
  effektivzinsPct,
  kreditFormatEUR as eur,
  kreditFormatPct as pct,
  type KreditSaetze,
} from "./kredit/kredit";
import { berechneTilgungstraeger } from "./kredit/tilgungstraeger";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, ChartTooltip, Legend, Filler);

const LAUFZEIT_PRESETS = [15, 20, 25, 30, 35];
const PERF_PRESETS = [3, 6, 9];
const COLOR_SCHULD = brand.navy700;
const COLOR_SPAR = brand.gold600;

const deAt = (n: number, digits = 1) =>
  n.toLocaleString("de-AT", { minimumFractionDigits: digits, maximumFractionDigits: digits });

function NumField({
  label,
  value,
  onChange,
  suffix,
  step = 1,
  min = 0,
  max,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: number;
  min?: number;
  max?: number;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <TextField
      fullWidth
      size="small"
      type="number"
      label={label}
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      slotProps={{
        htmlInput: { min, max, step },
        input: suffix ? { endAdornment: <InputAdornment position="end">{suffix}</InputAdornment> } : undefined,
      }}
    />
  );
}

function Row({ label, value, bold, big }: { label: ReactNode; value: string; bold?: boolean; big?: boolean }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2, alignItems: "baseline" }}>
      <Typography
        variant={big ? "subtitle1" : "body2"}
        color={bold || big ? "text.primary" : "text.secondary"}
        sx={{ fontWeight: bold || big ? 700 : 400 }}
      >
        {label}
      </Typography>
      <Typography
        variant={big ? "subtitle1" : "body2"}
        sx={{ fontWeight: bold || big ? 700 : 400, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

function Kpi({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card sx={{ p: 2.5, height: "100%" }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontVariantNumeric: "tabular-nums", color }}>
        {value}
      </Typography>
    </Card>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <Card sx={{ p: { xs: 2, sm: 3 } }}>
      <Typography variant="h6" component="h2" sx={{ fontSize: "1rem" }}>
        {title}
      </Typography>
      {hint && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {hint}
        </Typography>
      )}
      <Box sx={{ mt: 2 }}>{children}</Box>
    </Card>
  );
}

export function KreditRechner() {
  const [kaufpreis, setKaufpreis] = useState("400000");
  const [eigenmittel, setEigenmittel] = useState("80000");
  const [laufzeit, setLaufzeit] = useState("35");
  const [zinssatz, setZinssatz] = useState("3.5");
  const [afaBeschleunigt, setAfaBeschleunigt] = useState(false);
  const [mitMakler, setMitMakler] = useState(true);
  const [nkMitfinanziert, setNkMitfinanziert] = useState(true);
  const [saetzeOffen, setSaetzeOffen] = useState(false);
  const [saetze, setSaetze] = useState<KreditSaetze>(KREDIT_DEFAULTS);

  // Tilgungsträger: optionaler FLV-Sparplan (Merkur) mit gleicher Laufzeit wie der Kredit.
  const [sparrate, setSparrate] = useState("");
  const [dynamikAn, setDynamikAn] = useState(false);
  const [dynamikPct, setDynamikPct] = useState("3");
  const [perfPreset, setPerfPreset] = useState<number | null>(6);
  const [customPerf, setCustomPerf] = useState("");

  const kaufpreisNum = Math.max(0, Number(kaufpreis) || 0);
  const eigenmittelNum = Math.max(0, Number(eigenmittel) || 0);
  // Leeres/0-Feld fällt sichtbar auf die untere Klammer (1 Jahr), statt still mit einem Default zu rechnen.
  const laufzeitClamped = Math.min(40, Math.max(1, Math.round(Number(laufzeit) || 0)));
  const zinssatzClamped = Math.min(20, Math.max(0, Number(zinssatz) || 0));
  const sparrateNum = Math.max(0, Number(sparrate) || 0);
  const perfPct =
    customPerf !== "" && !isNaN(parseFloat(customPerf)) ? parseFloat(customPerf) : (perfPreset ?? 6);
  const perf = perfPct / 100;
  const dynamikEff = dynamikAn ? Math.max(0, Number(dynamikPct) || 0) / 100 : 0;

  const satzSetter = (key: keyof KreditSaetze) => (v: string) =>
    setSaetze((s) => ({ ...s, [key]: Number(v) || 0 }));

  const { kredit, plan, effektivzins, afaBemessungsgrundlage, afaJahre, warnungen } = useMemo(() => {
    const kredit = berechneKreditbetrag({
      kaufpreis: kaufpreisNum,
      eigenmittel: eigenmittelNum,
      mitMakler,
      nkMitfinanziert,
      saetze,
    });
    const plan = berechneTilgungsplan(kredit.kreditbetrag, zinssatzClamped, laufzeitClamped);
    const effektivzins = effektivzinsPct(kredit.nettoAuszahlung, plan.rate, plan.monate.length);
    // AfA-Bemessungsgrundlage: Kaufpreis PLUS Kaufnebenkosten (§ 6 Z 1 EStG); Kreditnebenkosten
    // bleiben außen vor (Geldbeschaffungskosten, keine Anschaffungsnebenkosten).
    const afaBemessungsgrundlage = berechneAfaBemessungsgrundlage(
      kaufpreisNum,
      saetze.gebaeudeanteilPct,
      kredit.kaufNK.summe,
    );
    const afaJahre = berechneAfaJahre(afaBemessungsgrundlage, saetze.afaSatzPct, laufzeitClamped, afaBeschleunigt);
    const warnungen = [...kredit.warnungen];
    if (laufzeitClamped > 35) {
      warnungen.push("Laufzeit über 35 Jahre — über der FMA-Empfehlung für nachhaltige Immobilienfinanzierung.");
    }
    return { kredit, plan, effektivzins, afaBemessungsgrundlage, afaJahre, warnungen };
  }, [kaufpreisNum, eigenmittelNum, mitMakler, nkMitfinanziert, saetze, zinssatzClamped, laufzeitClamped, afaBeschleunigt]);

  // Kumulierte Zinsen je Monat, fürs Tooltip auf der Restschuld-Kurve.
  const kumZinsen = useMemo(() => {
    const out: number[] = [];
    for (const m of plan.monate) out.push((out[out.length - 1] ?? 0) + m.zins);
    return out;
  }, [plan.monate]);

  const monthLabels = [0, ...plan.monate.map((m) => m.monat / 12)];
  const restschuldLine = [kredit.kreditbetrag, ...plan.monate.map((m) => m.restschuld)];

  const tt = useMemo(
    () => berechneTilgungstraeger(plan, kredit.kreditbetrag, sparrateNum, laufzeitClamped, perf, dynamikEff),
    [plan, kredit.kreditbetrag, sparrateNum, laufzeitClamped, perf, dynamikEff],
  );
  const ttAktiv = sparrateNum > 0 && tt.schnittpunktMonat !== null;

  // react-chartjs-2 liest `plugins` nur beim ersten Mount; das Plugin liest deshalb den
  // aktuellen Stand erst beim Zeichnen aus einem Ref.
  const schnittpunktRef = useRef({
    ttAktiv,
    schnittpunktMonat: tt.schnittpunktMonat,
    sparwertImSchnittpunkt: tt.sparwertImSchnittpunkt,
  });
  // eslint-disable-next-line react-hooks/refs -- bewusst: Plugin liest den Stand beim Zeichnen
  schnittpunktRef.current = {
    ttAktiv,
    schnittpunktMonat: tt.schnittpunktMonat,
    sparwertImSchnittpunkt: tt.sparwertImSchnittpunkt,
  };

  // Gestrichelte Schnittpunkt-Markierung (Kredit ablösbar) direkt auf den Canvas.
  const [schnittpunktPlugin] = useState<Plugin<"line">>(() => ({
    id: "schnittpunkt",
    afterDatasetsDraw(chart) {
      const { ttAktiv: aktiv, schnittpunktMonat, sparwertImSchnittpunkt } = schnittpunktRef.current;
      if (!aktiv || schnittpunktMonat == null || sparwertImSchnittpunkt == null) return;
      const { ctx, chartArea, scales } = chart;
      const idxFloor = Math.floor(schnittpunktMonat);
      const idxCeil = Math.ceil(schnittpunktMonat);
      const pxFloor = scales.x.getPixelForTick(idxFloor);
      const pxCeil = scales.x.getPixelForTick(idxCeil);
      const frac = schnittpunktMonat - idxFloor;
      const x = idxCeil === idxFloor ? pxFloor : pxFloor + frac * (pxCeil - pxFloor);
      const y = scales.y.getPixelForValue(sparwertImSchnittpunkt);

      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = "#8a93a6";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = COLOR_SPAR;
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    },
  }));

  const eigenmittelquotePct =
    kredit.gesamtinvestition > 0 ? (eigenmittelNum / kredit.gesamtinvestition) * 100 : 0;

  return (
    <Stack spacing={3}>
      <Alert severity="info" icon={false}>
        <strong>Finanzierungsrechner:</strong> Ermittelt Kauf- und Kreditnebenkosten sowie den
        Annuitätentilgungsplan.
      </Alert>

      <Section title="Eingaben">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <NumField label="Kaufpreis" suffix="€" step={1000} value={kaufpreis} onChange={setKaufpreis} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <NumField label="Eigenmittel" suffix="€" step={1000} value={eigenmittel} onChange={setEigenmittel} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <NumField
              label="Sollzinssatz"
              suffix="% p. a."
              step={0.05}
              max={20}
              value={zinssatz}
              onChange={setZinssatz}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <NumField label="Laufzeit" suffix="Jahre" max={40} value={laufzeit} onChange={setLaufzeit} />
            <ToggleButtonGroup
              exclusive
              size="small"
              value={laufzeitClamped}
              onChange={(_, v: number | null) => v && setLaufzeit(String(v))}
              sx={{ mt: 1, flexWrap: "wrap" }}
            >
              {LAUFZEIT_PRESETS.map((p) => (
                <ToggleButton key={p} value={p} sx={{ px: 1.25, py: 0.25 }}>
                  {p} J
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Grid>
        </Grid>
        <Stack direction="row" useFlexGap sx={{ mt: 1.5, columnGap: 3, flexWrap: "wrap" }}>
          <FormControlLabel
            control={<Checkbox checked={mitMakler} onChange={(e) => setMitMakler(e.target.checked)} />}
            label="Makler beauftragt (Provision fällt an)"
          />
          <FormControlLabel
            control={<Checkbox checked={nkMitfinanziert} onChange={(e) => setNkMitfinanziert(e.target.checked)} />}
            label="Kreditnebenkosten mitfinanzieren"
          />
        </Stack>
      </Section>

      <Section
        title="Sparform für schnellere Kreditabzahlung und Zinsersparnis"
        hint="Parallel besparte fondsgebundene Lebensversicherung mit gleicher Laufzeit wie der Kredit. Zeigt, ab wann das Guthaben die Restschuld übersteigt."
      >
        <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <NumField
              label="Sparrate"
              suffix="€/Monat"
              step={25}
              placeholder="z. B. 300"
              value={sparrate}
              onChange={setSparrate}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <NumField
              label="Dynamik"
              suffix="% p. a."
              step={0.5}
              disabled={!dynamikAn}
              value={dynamikPct}
              onChange={setDynamikPct}
            />
            <FormControlLabel
              control={<Checkbox size="small" checked={dynamikAn} onChange={(e) => setDynamikAn(e.target.checked)} />}
              label="Dynamik aktiv"
            />
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Stack direction="row" useFlexGap spacing={1.5} sx={{ flexWrap: "wrap", alignItems: "center" }}>
              <Typography variant="body2" color="text.secondary">
                Performance
              </Typography>
              <ToggleButtonGroup
                exclusive
                size="small"
                value={customPerf === "" ? perfPreset : null}
                onChange={(_, v: number | null) => {
                  if (v == null) return;
                  setPerfPreset(v);
                  setCustomPerf("");
                }}
              >
                {PERF_PRESETS.map((p) => (
                  <ToggleButton key={p} value={p} sx={{ px: 1.5, py: 0.25 }}>
                    {p} %
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
              <TextField
                size="small"
                type="number"
                label="eigene"
                placeholder="z. B. 5,5"
                value={customPerf}
                onChange={(e) => {
                  setCustomPerf(e.target.value);
                  if (e.target.value !== "" && !isNaN(parseFloat(e.target.value))) setPerfPreset(null);
                }}
                slotProps={{
                  htmlInput: { step: 0.1 },
                  input: { endAdornment: <InputAdornment position="end">%</InputAdornment> },
                }}
                sx={{ width: 140 }}
              />
            </Stack>
          </Grid>
        </Grid>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Laufzeit wird automatisch vom Kredit übernommen: <strong>{laufzeitClamped} Jahre</strong>
        </Typography>
        {sparrateNum > 0 && (sparrateNum > 500 || sparrateNum < 50) && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Die Sparprämien-Quote ist auf echte Merkur-Angebote im Bereich 50–500 €/Monat gestützt und wird
            außerhalb davon am Rand fortgeschrieben — die Werte gelten daher nur als grobe Näherung.
          </Alert>
        )}
      </Section>

      <Card sx={{ p: { xs: 2, sm: 3 } }}>
        <Button
          color="inherit"
          onClick={() => setSaetzeOffen((v) => !v)}
          startIcon={
            <ChevronRightRounded sx={{ transition: "transform .2s", transform: saetzeOffen ? "rotate(90deg)" : "none" }} />
          }
          sx={{ alignSelf: "flex-start", px: 0, color: "text.secondary" }}
        >
          Kostensätze anpassen
        </Button>
        <Collapse in={saetzeOffen} unmountOnExit>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                Kaufnebenkosten (vom Kaufpreis)
              </Typography>
              <Grid container spacing={2}>
                {(
                  [
                    ["Grunderwerbsteuer", "grunderwerbsteuerPct", "%", 0.1],
                    ["Grundbucheintragung", "grundbuchEintragungPct", "%", 0.1],
                    ["Vertragserrichtung (netto)", "vertragserrichtungPct", "%", 0.1],
                    ["Maklerprovision (netto)", "maklerprovisionPct", "%", 0.1],
                    ["USt auf Dienstleistungen", "ustPct", "%", 0.1],
                    ["Sonstige Kaufnebenkosten", "sonstigeKaufNK", "€", 100],
                  ] as const
                ).map(([label, key, suffix, step]) => (
                  <Grid key={key} size={{ xs: 12, sm: 4, lg: 2 }}>
                    <NumField
                      label={label}
                      suffix={suffix}
                      step={step}
                      value={String(saetze[key])}
                      onChange={satzSetter(key)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                Kreditnebenkosten (von der Kreditsumme)
              </Typography>
              <Grid container spacing={2}>
                {(
                  [
                    ["Kreditvertragserstellung", "kreditvertragserstellungPct", "%", 0.1],
                    ["Pfandrechtseintragung", "pfandrechtPct", "%", 0.1],
                    ["Nebengebührensicherstellung", "nebengebuehrensicherstellungPct", "%", 0.1],
                    ["Sonstige Kreditnebenkosten", "sonstigeKreditNK", "€", 100],
                  ] as const
                ).map(([label, key, suffix, step]) => (
                  <Grid key={key} size={{ xs: 12, sm: 4, lg: 3 }}>
                    <NumField
                      label={label}
                      suffix={suffix}
                      step={step}
                      value={String(saetze[key])}
                      onChange={satzSetter(key)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
                AfA (steuerliche Abschreibung)
              </Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4, lg: 3 }}>
                  <NumField
                    label="Gebäudeanteil am Kaufpreis"
                    suffix="%"
                    value={String(saetze.gebaeudeanteilPct)}
                    onChange={satzSetter("gebaeudeanteilPct")}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4, lg: 3 }}>
                  <NumField
                    label="AfA-Satz (linear)"
                    suffix="%"
                    step={0.1}
                    value={String(saetze.afaSatzPct)}
                    onChange={satzSetter("afaSatzPct")}
                  />
                </Grid>
              </Grid>
              <FormControlLabel
                sx={{ mt: 1 }}
                control={<Switch checked={afaBeschleunigt} onChange={(e) => setAfaBeschleunigt(e.target.checked)} />}
                label="Beschleunigte AfA (3× im 1. Jahr, 2× im 2. Jahr)"
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                Nur für neu errichtete Wohngebäude (Wohnbaupaket 2024, Fertigstellung bis 2026), nicht für den Kauf eines
                Bestandsobjekts. Mit dem Steuerberater klären.
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
                Grundanteilverordnung 2016: 20 % Grundanteil (= 80 % Gebäudeanteil) nur bei Gemeinden unter
                100.000 Einwohnern und einem Baulandpreis unter 400 €/m². Sonst gelten 30 % Grundanteil
                (Gebäude mit mehr als 10 Einheiten) bzw. 40 % Grundanteil.
              </Typography>
            </Box>
            <Button variant="outlined" size="small" onClick={() => setSaetze(KREDIT_DEFAULTS)} sx={{ alignSelf: "flex-start" }}>
              Auf Standardwerte zurücksetzen
            </Button>
          </Stack>
        </Collapse>
      </Card>

      <Section title="Kostenaufstellung">
        {warnungen.length > 0 && (
          <Stack spacing={1} sx={{ mb: 2 }}>
            {warnungen.map((w) => (
              <Alert key={w} severity="warning">
                {w}
              </Alert>
            ))}
          </Stack>
        )}
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Kaufnebenkosten
            </Typography>
            <Stack spacing={0.5}>
              {kredit.kaufNK.positionen.map((p) => (
                <Row
                  key={p.label}
                  label={
                    <>
                      {p.label} <Typography component="span" variant="caption">({p.hinweis})</Typography>
                    </>
                  }
                  value={eur(p.betrag)}
                />
              ))}
              <Box sx={{ borderTop: 1, borderColor: "divider", pt: 0.75, mt: 0.5 }}>
                <Row bold label="Summe Kaufnebenkosten" value={eur(kredit.kaufNK.summe)} />
              </Box>
            </Stack>
          </Grid>
          <Grid size={{ xs: 12, lg: 6 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Kreditnebenkosten
            </Typography>
            <Stack spacing={0.5}>
              {kredit.kreditNKPositionen.map((p) => (
                <Row
                  key={p.label}
                  label={
                    <>
                      {p.label} <Typography component="span" variant="caption">({p.hinweis})</Typography>
                    </>
                  }
                  value={eur(p.betrag)}
                />
              ))}
              <Box sx={{ borderTop: 1, borderColor: "divider", pt: 0.75, mt: 0.5 }}>
                <Row bold label="Summe Kreditnebenkosten" value={eur(kredit.kreditNKSumme)} />
              </Box>
            </Stack>
          </Grid>
        </Grid>
        <Stack spacing={0.5} sx={{ borderTop: 1, borderColor: "divider", pt: 2, mt: 3 }}>
          <Row label="Gesamtinvestition (Kaufpreis + alle Nebenkosten)" value={eur(kredit.gesamtinvestition)} />
          <Row label="Eigenmittel" value={eur(eigenmittelNum)} />
          {!nkMitfinanziert && kredit.barbedarf > 0 && (
            <Row label="Zusätzlicher Barbedarf (Kreditnebenkosten nicht mitfinanziert)" value={eur(kredit.barbedarf)} />
          )}
          <Row big label="Benötigter Kreditbetrag" value={eur(kredit.kreditbetrag)} />
        </Stack>
      </Section>

      <Card sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ fontSize: "1rem" }}>
            Restschuldverlauf
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Laufzeit: <strong>{laufzeitClamped} Jahre</strong>
          </Typography>
        </Stack>
        <Box sx={{ height: { xs: 300, md: 420 } }}>
          <Line
            data={{
              labels: monthLabels,
              datasets: [
                {
                  label: "Restschuld",
                  data: restschuldLine,
                  borderColor: COLOR_SCHULD,
                  backgroundColor: "rgba(34,57,107,.08)",
                  borderWidth: 2,
                  pointRadius: 0,
                  tension: 0.1,
                  fill: true,
                },
                ...(ttAktiv
                  ? [
                      {
                        label: "Sparguthaben FLV",
                        data: tt.sparwertMonate,
                        borderColor: COLOR_SPAR,
                        backgroundColor: "rgba(163,136,79,.08)",
                        borderWidth: 2,
                        pointRadius: 0,
                        tension: 0.1,
                        fill: false,
                      },
                    ]
                  : []),
              ],
            }}
            plugins={[schnittpunktPlugin]}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              interaction: { mode: "index", intersect: false },
              plugins: {
                legend: { position: "top", labels: { boxWidth: 12, font: { size: 11 } } },
                tooltip: {
                  callbacks: {
                    title: (items) => `Jahr ${monthLabels[items[0].dataIndex].toFixed(2)}`,
                    label: (ctx) => `${ctx.dataset.label}: ${eur(ctx.parsed.y as number)}`,
                    afterLabel: (ctx) => {
                      if (ctx.datasetIndex !== 0) return "";
                      const idx = ctx.dataIndex;
                      return `Kumulierte Zinsen bisher: ${eur(idx === 0 ? 0 : kumZinsen[idx - 1])}`;
                    },
                  },
                },
              },
              scales: {
                x: {
                  grid: { display: false },
                  title: { display: true, text: "Jahre" },
                  ticks: {
                    autoSkip: false,
                    maxRotation: 0,
                    callback: (_val, index) => (Number.isInteger(monthLabels[index]) ? monthLabels[index] : ""),
                  },
                },
                y: { beginAtZero: true, ticks: { callback: (val) => eur(Number(val)) } },
              },
            }}
            aria-label="Restschuldverlauf über die Kreditlaufzeit im Vergleich zum FLV-Sparguthaben"
            role="img"
          />
        </Box>
        {ttAktiv && tt.jahreFrueher != null && tt.jahreFrueher >= 0.5 && (
          <Box
            sx={{
              mt: 3,
              p: 2.5,
              borderRadius: 2,
              border: `1px solid ${brand.gold400}`,
              bgcolor: "rgba(194,164,103,0.08)",
            }}
          >
            <Stack direction="row" useFlexGap sx={{ columnGap: 5, rowGap: 2, flexWrap: "wrap" }}>
              {(
                [
                  ["Kredit früher zurückgezahlt", `${deAt(tt.jahreFrueher)} Jahre`],
                  ["Einbezahlte FLV-Prämien", eur(tt.einbezahltImSchnittpunkt ?? 0)],
                  ["Vorteil im Gesamtaufwand", eur(tt.vorteil)],
                ] as const
              ).map(([l, v]) => (
                <Box key={l}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    {l}
                  </Typography>
                  <Typography variant="h5" sx={{ color: "secondary.dark", fontVariantNumeric: "tabular-nums" }}>
                    {v}
                  </Typography>
                </Box>
              ))}
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Nach <strong>{deAt(tt.schnittpunktMonat! / 12)} Jahren</strong> erreicht das FLV-Guthaben rund{" "}
              <strong>{eur(tt.sparwertImSchnittpunkt ?? 0)}</strong> und deckt damit die dann offene Restschuld —
              der Kredit könnte rund <strong>{deAt(tt.jahreFrueher)} Jahre</strong> vor Laufzeitende abgelöst
              werden.
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Gesamtaufwand ohne Tilgungsträger (volle Laufzeit): <strong>{eur(tt.gesamtaufwandVollaufzeit)}</strong>.
              Gesamtaufwand mit Tilgungsträger (Kreditraten bis zur Ablöse + einbezahlte Prämien +
              Vorfälligkeitsentschädigung): <strong>{eur(tt.gesamtaufwandMitTraeger)}</strong>. Zinsersparnis allein
              (Teilgröße, ohne die einbezahlten Prämien gegenzurechnen): <strong>{eur(tt.zinsersparnis)}</strong>.
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
              Modellrechnung mit {perfPct.toLocaleString("de-AT")} % p. a. angenommener Performance, Werte nicht
              garantiert — bei vorzeitiger Auflösung kann der Rückkaufswert unter dem dargestellten Fondswert
              liegen. Die Kreditrate läuft bis zur Ablöse unverändert weiter, die Sparrate kommt zusätzlich zur
              Monatsrate hinzu. Enthält eine pauschale Vorfälligkeitsentschädigung von 1 % der bei Ablöse offenen
              Restschuld ({eur(tt.vorfaelligkeitsentschaedigung)}, § 20 Abs 3 HIKrG bei Fixzinsvereinbarung).
              {tt.rueckkaufVorJahr15 &&
                " Die Ablöse läge vor Ablauf von 15 Vertragsjahren der FLV — das löst nach § 6 Abs 1 Z 1 VersStG eine Nachversteuerung der laufenden Prämien auf 11 % Versicherungssteuer aus, die hier nicht berücksichtigt ist."}
            </Typography>
          </Box>
        )}
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Kpi label="Monatliche Rate" value={eur(plan.rate)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Kpi label="Gesamtzinsen" value={eur(plan.gesamtzinsen)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Kpi label="Gesamtaufwand (Kredit + Zinsen)" value={eur(plan.gesamtaufwand)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Kpi label="Effektivzinssatz p. a." value={pct(effektivzins)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Kpi label="Beleihungsquote (Kredit/Kaufpreis)" value={pct(kredit.beleihungsquotePct, 1)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Kpi label="Eigenmittelquote (an Gesamtinvestition)" value={pct(eigenmittelquotePct, 1)} />
        </Grid>
      </Grid>
      <Typography variant="caption" color="text.secondary">
        Effektivzinssatz nach § 2 Z 8 HIKrG, inkl. Kreditvertragserstellung und Pfandrechtseintragung, ohne
        Kaufnebenkosten und ohne verpflichtende Nebenprodukte (z. B. Ableben-/Gebäudeversicherung).
        Beleihungsquote bezogen auf den Kaufpreis — Banken rechnen üblicherweise gegen den (meist niedrigeren)
        Belehnwert, der reale LTV liegt daher meist höher.
      </Typography>

      <Card sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack direction="row" sx={{ justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
          <Typography variant="h6" component="h2" sx={{ fontSize: "1rem" }}>
            Tilgungsplan (jährlich)
          </Typography>
          <Typography variant="body2" color="text.secondary">
            AfA-Bemessungsgrundlage ({saetze.gebaeudeanteilPct.toLocaleString("de-AT")} % von Kaufpreis +
            Kaufnebenkosten): <strong>{eur(afaBemessungsgrundlage)}</strong>
          </Typography>
        </Stack>
        <TableContainer>
          <Table size="small" sx={{ "& td, & th": { fontVariantNumeric: "tabular-nums" } }}>
            <TableHead>
              <TableRow>
                <TableCell>Jahr</TableCell>
                <TableCell align="right">Rate p. a.</TableCell>
                <TableCell align="right">Zinsen</TableCell>
                <TableCell align="right">Tilgung</TableCell>
                <TableCell align="right">Restschuld</TableCell>
                <TableCell align="right">AfA</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {plan.jahre.map((j) => {
                const afa = afaJahre[j.jahr - 1];
                return (
                  <TableRow key={j.jahr}>
                    <TableCell>{j.jahr}</TableCell>
                    <TableCell align="right">{eur(j.rateSumme)}</TableCell>
                    <TableCell align="right">{eur(j.zinsen)}</TableCell>
                    <TableCell align="right">{eur(j.tilgung)}</TableCell>
                    <TableCell align="right">{eur(j.restschuld)}</TableCell>
                    <TableCell align="right">
                      {eur(afa.afa)}
                      {afa.faktor > 1 && (
                        <Typography component="span" variant="caption" color="text.secondary">
                          {" "}
                          (×{afa.faktor})
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow sx={{ "& td": { fontWeight: 700, color: "text.primary", fontSize: "0.875rem" } }}>
                <TableCell>Summe</TableCell>
                <TableCell align="right">{eur(plan.gesamtaufwand)}</TableCell>
                <TableCell align="right">{eur(plan.gesamtzinsen)}</TableCell>
                <TableCell align="right">{eur(kredit.kreditbetrag)}</TableCell>
                <TableCell align="right">0 €</TableCell>
                <TableCell align="right">{eur(afaJahre.reduce((s, a) => s + a.afa, 0))}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      </Card>
    </Stack>
  );
}
