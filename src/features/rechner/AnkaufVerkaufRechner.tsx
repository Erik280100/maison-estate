"use client";

import { useMemo, useState, type ReactNode } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import AddRounded from "@mui/icons-material/AddRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import { formatPrice } from "@/lib/format";
import { KREDIT_DEFAULTS } from "./kredit/kredit";

// ---------------------------------------------------------------------------
// Standardwerte
// Kaufnebenkosten / Kreditnebenkosten: identisch mit dem Finanzierungsrechner
// (AT, Stand 2026). Sanierung: Richtwert 1.000 €/m² brutto – Mitte zwischen
// "mittlere Sanierung" (700–1.000 €/m²) und Kernsanierung (1.000–1.500 €/m²).
// Die Gewerke-Positionen entsprechen dem Fix-&-Flip-Rechner (60 m², netto).
// Alles ist Platzhalter und im Formular änderbar.
// ---------------------------------------------------------------------------

type Gewerk = { n: string; menge: number; einh: string; mat: number; lohn: number };
type NkPos = { n: string; betrag: number };

const GEWERKE: Gewerk[] = [
  { n: "Abbruch / Entsorgung", menge: 1, einh: "pausch.", mat: 500, lohn: 1760 },
  { n: "Elektro", menge: 60, einh: "m²", mat: 30, lohn: 38 },
  { n: "Sanitär / Heizung", menge: 1, einh: "pausch.", mat: 5200, lohn: 3600 },
  { n: "Estrich / Putz", menge: 60, einh: "m²", mat: 15, lohn: 20 },
  { n: "Fliesen", menge: 28, einh: "m²", mat: 40, lohn: 50 },
  { n: "Maler", menge: 180, einh: "m²", mat: 2.5, lohn: 8 },
  { n: "Bodenleger", menge: 50, einh: "m²", mat: 35, lohn: 18 },
  { n: "Fenster / Türen", menge: 5, einh: "Stk.", mat: 600, lohn: 180 },
  { n: "Küche", menge: 1, einh: "Stk.", mat: 4800, lohn: 700 },
];

const SAN_NK: NkPos[] = [
  { n: "Container / Entsorgung", betrag: 0 },
  { n: "Planung / Statiker", betrag: 0 },
  { n: "Energieausweis neu", betrag: 350 },
  { n: "Meldung / Bewilligung Baubehörde", betrag: 0 },
  { n: "Baustellenkoordinator (BauKG)", betrag: 0 },
  { n: "Prüfbefunde Elektro / Gas", betrag: 350 },
  { n: "Endreinigung", betrag: 300 },
];

const D = {
  flaeche: 60,
  kauf: 150000,
  // Ankaufsnebenkosten
  grest: KREDIT_DEFAULTS.grunderwerbsteuerPct,
  eintr: KREDIT_DEFAULTS.grundbuchEintragungPct,
  notar: 1.5,
  maklerOn: false,
  makler: KREDIT_DEFAULTS.maklerprovisionPct,
  ust: KREDIT_DEFAULTS.ustPct,
  kaufSonst: 1500,
  // Sanierung
  sanModus: "pausch" as "pausch" | "gewerke",
  sanM2: 1000,
  puffer: 10,
  // Halten
  monate: 9,
  hBk: 180,
  hEn: 40,
  hVers: 25,
  hGst: 10,
  hSo: 0,
  // Finanzierung
  fremd: 120000,
  zins: 4.5,
  laufzeit: 25,
  tilgFrei: 0,
  kreditVertragPct: KREDIT_DEFAULTS.kreditvertragserstellungPct,
  pfandOn: true,
  pfandPct: KREDIT_DEFAULTS.pfandrechtPct,
  nebengebPct: KREDIT_DEFAULTS.nebengebuehrensicherstellungPct,
  finSonst: 0,
  // Verkauf
  verkM2: 4000,
  provision: 2,
  provisionUst: false,
};

type V = typeof D;

const num = (x: number) => (Number.isFinite(x) ? x : 0);
const eur = (x: number) => formatPrice(Math.round(x));
const pct = (x: number) => `${x.toFixed(1).replace(".", ",")} %`;

function rechne(v: V, gewerke: Gewerk[], nk: NkPos[]) {
  const A = Math.max(num(v.flaeche), 0.0001);
  const p = (x: number) => num(x) / 100;
  const ustF = 1 + p(v.ust);

  // Ankauf
  const kp = num(v.kauf);
  const grest = kp * p(v.grest);
  const eintr = kp * p(v.eintr);
  const notar = kp * p(v.notar);
  const makler = v.maklerOn ? kp * p(v.makler) * ustF : 0;
  const kaufSonst = num(v.kaufSonst);
  const kaufNk = grest + eintr + notar + makler + kaufSonst;

  // Sanierung
  const gewerkeNetto = gewerke.reduce((s, g) => s + num(g.menge) * (num(g.mat) + num(g.lohn)), 0);
  const gewerkePuffer = gewerkeNetto * p(v.puffer);
  const sanNkNetto = nk.reduce((s, n) => s + num(n.betrag), 0);
  const gewerkeBrutto = (gewerkeNetto + gewerkePuffer + sanNkNetto) * ustF;
  const san = v.sanModus === "pausch" ? num(v.sanM2) * A : gewerkeBrutto;

  // Finanzierung & Haltedauer (monatsgenau)
  const M = Math.max(0, Math.round(num(v.monate)));
  const kredit = Math.max(0, num(v.fremd));
  const i = p(v.zins) / 12;
  const n = Math.max(1, Math.round(num(v.laufzeit) * 12));
  const rate = kredit > 0 ? (i > 0 ? (kredit * i) / (1 - Math.pow(1 + i, -n)) : kredit / n) : 0;
  let b = kredit;
  let zinsen = 0;
  let tilg = 0;
  for (let m = 1; m <= M; m++) {
    const z = b * i;
    zinsen += z;
    if (m > num(v.tilgFrei)) {
      const t = Math.min(b, Math.max(0, rate - z));
      tilg += t;
      b -= t;
    }
  }
  const rest = b;
  const kreditVertrag = kredit * p(v.kreditVertragPct);
  const pfand = v.pfandOn ? kredit * p(v.pfandPct) : 0;
  const nebengeb = pfand * p(v.nebengebPct);
  const finSonst = num(v.finSonst);
  const finNk = kreditVertrag + pfand + nebengeb + finSonst;

  // Halten
  const halteM = num(v.hBk) + num(v.hEn) + num(v.hVers) + num(v.hGst) + num(v.hSo);
  const halte = halteM * M;

  // Verkauf
  const vk = num(v.verkM2) * A;
  const prov = vk * p(v.provision) * (v.provisionUst ? ustF : 1);

  const kostenOhneProv = kp + kaufNk + san + finNk + zinsen + halte;
  const tot = kostenOhneProv + prov;
  const gewinn = vk - tot;
  const marge = tot > 0 ? (gewinn / tot) * 100 : 0;
  const ek = kp + kaufNk + san + finNk + halte + zinsen + tilg - kredit;
  const roiPa = ek > 0 && M > 0 ? ((gewinn / ek) * 12 * 100) / M : 0;
  const provF = p(v.provision) * (v.provisionUst ? ustF : 1);
  const breakEvenM2 = provF < 1 ? kostenOhneProv / (1 - provF) / A : 0;

  return {
    A, kp, grest, eintr, notar, makler, kaufSonst, kaufNk,
    gewerkeNetto, gewerkePuffer, sanNkNetto, gewerkeBrutto, san,
    M, kredit, rate, zinsen, tilg, rest, kreditVertrag, pfand, nebengeb, finSonst, finNk,
    halteM, halte, vk, prov, tot, gewinn, marge, ek, roiPa, breakEvenM2,
  };
}

// ---------------------------------------------------------------------------
// UI-Bausteine
// ---------------------------------------------------------------------------

function NumField({
  label,
  suffix,
  value,
  onChange,
  helper,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (n: number) => void;
  helper?: string;
}) {
  return (
    <TextField
      fullWidth
      type="number"
      label={label}
      helperText={helper}
      value={Number.isFinite(value) ? value : ""}
      onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
      slotProps={{
        htmlInput: { step: "any", inputMode: "decimal" },
        input: { endAdornment: <InputAdornment position="end">{suffix}</InputAdornment> },
      }}
    />
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card sx={{ p: 3 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {title}
      </Typography>
      <Stack spacing={2}>{children}</Stack>
    </Card>
  );
}

function Details({ title, sum, children }: { title: string; sum: string; children: ReactNode }) {
  return (
    <Accordion disableGutters variant="outlined" sx={{ "&::before": { display: "none" } }}>
      <AccordionSummary expandIcon={<ExpandMoreRounded />}>
        <Stack direction="row" sx={{ width: "100%", pr: 1, justifyContent: "space-between", gap: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {sum}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>{children}</AccordionDetails>
    </Accordion>
  );
}

function Line({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Stack direction="row" sx={{ justifyContent: "space-between", gap: 2 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
        {hint ? ` · ${hint}` : ""}
      </Typography>
      <Typography variant="caption" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
        {value}
      </Typography>
    </Stack>
  );
}

// ---------------------------------------------------------------------------

export function AnkaufVerkaufRechner() {
  const [v, setV] = useState<V>(D);
  const [gewerke, setGewerke] = useState<Gewerk[]>(GEWERKE);
  const [nk, setNk] = useState<NkPos[]>(SAN_NK);
  const set = <K extends keyof V>(k: K) => (x: V[K]) => setV((o) => ({ ...o, [k]: x }));
  const r = useMemo(() => rechne(v, gewerke, nk), [v, gewerke, nk]);

  const patchG = (idx: number, patch: Partial<Gewerk>) =>
    setGewerke((l) => l.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  const patchN = (idx: number, patch: Partial<NkPos>) =>
    setNk((l) => l.map((g, i) => (i === idx ? { ...g, ...patch } : g)));

  const rows: [string, string, boolean?][] = [
    ["Verkaufspreis", eur(r.vk)],
    ["Gesamtkosten inkl. Zinsen & Provision", eur(r.tot)],
    ["Gewinn vor Steuern", eur(r.gewinn), true],
    ["Marge auf Gesamtkosten", pct(r.marge)],
    ["Eigenkapitalbedarf", eur(r.ek)],
    ["Eigenkapitalrendite p. a.", pct(r.roiPa)],
    ["Break-even Verkaufspreis", `${Math.round(r.breakEvenM2).toLocaleString("de-AT")} €/m²`],
  ];

  const kosten: [string, number][] = [
    ["Ankaufspreis", r.kp],
    ["Ankaufsnebenkosten", r.kaufNk],
    ["Sanierung (brutto)", r.san],
    ["Finanzierungsnebenkosten", r.finNk],
    [`Zinsen (${r.M} Monate)`, r.zinsen],
    ["Betriebskosten, Strom & Co.", r.halte],
    ["Verkaufsprovision", r.prov],
  ];

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, lg: 7 }}>
        <Stack spacing={3}>
          <Section title="Ankauf">
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <NumField label="Ankaufspreis" suffix="€" value={v.kauf} onChange={set("kauf")} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <NumField label="Nutzfläche" suffix="m²" value={v.flaeche} onChange={set("flaeche")} />
              </Grid>
            </Grid>
            <Details title="Ankaufsnebenkosten" sum={eur(r.kaufNk)}>
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <NumField label="Grunderwerbsteuer" suffix="%" value={v.grest} onChange={set("grest")} helper={eur(r.grest)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <NumField label="Eintragung Eigentum (Grundbuch)" suffix="%" value={v.eintr} onChange={set("eintr")} helper={eur(r.eintr)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <NumField label="Vertragserrichtung / Treuhand" suffix="%" value={v.notar} onChange={set("notar")} helper={eur(r.notar)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <NumField label="Sonstiges (Räumung, Schlüsseldienst …)" suffix="€" value={v.kaufSonst} onChange={set("kaufSonst")} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <NumField label="USt-Satz (für Makler)" suffix="%" value={v.ust} onChange={set("ust")} />
                  </Grid>
                </Grid>
                <FormControlLabel
                  control={<Switch checked={v.maklerOn} onChange={(e) => set("maklerOn")(e.target.checked)} />}
                  label="Makler beim Ankauf"
                />
                {v.maklerOn && (
                  <NumField
                    label="Maklerprovision (netto, USt wird ergänzt)"
                    suffix="%"
                    value={v.makler}
                    onChange={set("makler")}
                    helper={eur(r.makler)}
                  />
                )}
              </Stack>
            </Details>
          </Section>

          <Section title="Sanierung">
            <ToggleButtonGroup
              exclusive
              size="small"
              value={v.sanModus}
              onChange={(_, m) => m && set("sanModus")(m)}
            >
              <ToggleButton value="pausch">Pauschal pro m²</ToggleButton>
              <ToggleButton value="gewerke">Nach Gewerken</ToggleButton>
            </ToggleButtonGroup>
            {v.sanModus === "pausch" && (
              <NumField
                label="Sanierungskosten pro m² (brutto)"
                suffix="€/m²"
                value={v.sanM2}
                onChange={set("sanM2")}
                helper={`= ${eur(num(v.sanM2) * r.A)} · Richtwert: mittlere Sanierung 700–1.000 €/m², Kernsanierung 1.000–1.500 €/m²`}
              />
            )}
            <Details
              title="Sanierungskosten aufgegliedert (Gewerke & Nebenkosten)"
              sum={`${eur(r.gewerkeBrutto)} brutto · ${Math.round(r.gewerkeBrutto / r.A).toLocaleString("de-AT")} €/m²`}
            >
              <Stack spacing={2}>
                {v.sanModus === "pausch" && (
                  <Typography variant="caption" color="text.secondary">
                    Aktuell zählt der Pauschalwert oben. Auf „Nach Gewerken“ umschalten, damit diese Aufstellung in die Rechnung eingeht.
                  </Typography>
                )}
                {gewerke.map((g, idx) => (
                  <Grid container spacing={1} key={idx} sx={{ alignItems: "center" }}>
                    <Grid size={{ xs: 12, sm: 3 }}>
                      <TextField fullWidth size="small" label="Gewerk" value={g.n} onChange={(e) => patchG(idx, { n: e.target.value })} />
                    </Grid>
                    <Grid size={{ xs: 4, sm: 1.5 }}>
                      <TextField fullWidth size="small" type="number" label="Menge" value={Number.isFinite(g.menge) ? g.menge : ""} onChange={(e) => patchG(idx, { menge: e.target.value === "" ? NaN : Number(e.target.value) })} />
                    </Grid>
                    <Grid size={{ xs: 4, sm: 1.5 }}>
                      <TextField fullWidth size="small" label="Einh." value={g.einh} onChange={(e) => patchG(idx, { einh: e.target.value })} />
                    </Grid>
                    <Grid size={{ xs: 4, sm: 1.8 }}>
                      <TextField fullWidth size="small" type="number" label="Mat. €/E" value={Number.isFinite(g.mat) ? g.mat : ""} onChange={(e) => patchG(idx, { mat: e.target.value === "" ? NaN : Number(e.target.value) })} />
                    </Grid>
                    <Grid size={{ xs: 4, sm: 1.8 }}>
                      <TextField fullWidth size="small" type="number" label="Lohn €/E" value={Number.isFinite(g.lohn) ? g.lohn : ""} onChange={(e) => patchG(idx, { lohn: e.target.value === "" ? NaN : Number(e.target.value) })} />
                    </Grid>
                    <Grid size={{ xs: 6, sm: 1.4 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600 }}>
                        {eur(num(g.menge) * (num(g.mat) + num(g.lohn)))}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 2, sm: 1 }}>
                      <IconButton size="small" aria-label="Gewerk entfernen" onClick={() => setGewerke((l) => l.filter((_, i) => i !== idx))}>
                        <CloseRounded fontSize="small" />
                      </IconButton>
                    </Grid>
                  </Grid>
                ))}
                <Button
                  size="small"
                  startIcon={<AddRounded />}
                  sx={{ alignSelf: "flex-start" }}
                  onClick={() => setGewerke((l) => [...l, { n: "", menge: 1, einh: "pausch.", mat: 0, lohn: 0 }])}
                >
                  Gewerk
                </Button>
                <Divider />
                <Typography variant="overline" color="text.secondary">
                  Nebenkosten der Sanierung (netto)
                </Typography>
                {nk.map((p, idx) => (
                  <Stack direction="row" key={idx} spacing={1} sx={{ alignItems: "center" }}>
                    <TextField fullWidth size="small" label="Position" value={p.n} onChange={(e) => patchN(idx, { n: e.target.value })} />
                    <TextField
                      size="small"
                      type="number"
                      label="Betrag"
                      sx={{ width: 150 }}
                      value={Number.isFinite(p.betrag) ? p.betrag : ""}
                      onChange={(e) => patchN(idx, { betrag: e.target.value === "" ? NaN : Number(e.target.value) })}
                      slotProps={{ input: { endAdornment: <InputAdornment position="end">€</InputAdornment> } }}
                    />
                    <IconButton size="small" aria-label="Position entfernen" onClick={() => setNk((l) => l.filter((_, i) => i !== idx))}>
                      <CloseRounded fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
                <Button
                  size="small"
                  startIcon={<AddRounded />}
                  sx={{ alignSelf: "flex-start" }}
                  onClick={() => setNk((l) => [...l, { n: "", betrag: 0 }])}
                >
                  Position
                </Button>
                <Divider />
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <NumField label="Puffer auf Gewerke" suffix="%" value={v.puffer} onChange={set("puffer")} helper={eur(r.gewerkePuffer)} />
                  </Grid>
                </Grid>
                <Stack spacing={0.5}>
                  <Line label="Gewerke netto" value={eur(r.gewerkeNetto)} />
                  <Line label="Puffer" value={eur(r.gewerkePuffer)} />
                  <Line label="Nebenkosten netto" value={eur(r.sanNkNetto)} />
                  <Line label={`USt ${v.ust} % (nicht rückholbar)`} value={eur((r.gewerkeNetto + r.gewerkePuffer + r.sanNkNetto) * (num(v.ust) / 100))} />
                  <Line label="Summe brutto" value={eur(r.gewerkeBrutto)} />
                </Stack>
              </Stack>
            </Details>
          </Section>

          <Section title="Haltedauer & laufende Kosten">
            <NumField
              label="Haltedauer (Ankauf bis Verkauf)"
              suffix="Monate"
              value={v.monate}
              onChange={set("monate")}
              helper="Zeitraum für Zinsen, Tilgung und laufende Kosten"
            />
            <Details title="Betriebskosten & Strom während der Haltedauer" sum={`${eur(r.halteM)} / Monat · ${eur(r.halte)}`}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <NumField label="Betriebskosten + Rücklage" suffix="€/Monat" value={v.hBk} onChange={set("hBk")} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <NumField label="Strom, Heizung, Gas" suffix="€/Monat" value={v.hEn} onChange={set("hEn")} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <NumField label="Versicherung" suffix="€/Monat" value={v.hVers} onChange={set("hVers")} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <NumField label="Grundsteuer" suffix="€/Monat" value={v.hGst} onChange={set("hGst")} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <NumField label="Sonstiges (Internet, Alarm …)" suffix="€/Monat" value={v.hSo} onChange={set("hSo")} />
                </Grid>
              </Grid>
            </Details>
          </Section>

          <Section title="Finanzierung">
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <NumField label="Fremdkapital" suffix="€" value={v.fremd} onChange={set("fremd")} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <NumField label="Finanzierungszins" suffix="% p. a." value={v.zins} onChange={set("zins")} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <NumField label="Kreditlaufzeit (Annuität)" suffix="Jahre" value={v.laufzeit} onChange={set("laufzeit")} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <NumField label="Tilgungsfreie Zeit" suffix="Monate" value={v.tilgFrei} onChange={set("tilgFrei")} helper="bis dahin nur Zinsen" />
              </Grid>
            </Grid>
            <Details title="Finanzierungsnebenkosten" sum={eur(r.finNk)}>
              <Stack spacing={2}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <NumField label="Kreditvertragserstellung" suffix="% der Kreditsumme" value={v.kreditVertragPct} onChange={set("kreditVertragPct")} helper={eur(r.kreditVertrag)} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <NumField label="Sonstiges (Schätzgutachten, Kontoführung …)" suffix="€" value={v.finSonst} onChange={set("finSonst")} />
                  </Grid>
                </Grid>
                <FormControlLabel
                  control={<Switch checked={v.pfandOn} onChange={(e) => set("pfandOn")(e.target.checked)} />}
                  label="Pfandrecht ins Grundbuch"
                />
                {v.pfandOn && (
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <NumField label="Eintragung Pfandrecht" suffix="%" value={v.pfandPct} onChange={set("pfandPct")} helper={eur(r.pfand)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <NumField label="Nebengebührensicherstellung (auf Pfandrecht)" suffix="%" value={v.nebengebPct} onChange={set("nebengebPct")} helper={eur(r.nebengeb)} />
                    </Grid>
                  </Grid>
                )}
              </Stack>
            </Details>
          </Section>

          <Section title="Verkauf">
            <NumField
              label="Verkaufspreis pro m²"
              suffix="€/m²"
              value={v.verkM2}
              onChange={set("verkM2")}
              helper={`Verkaufspreis gesamt: ${eur(r.vk)}`}
            />
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <NumField label="Verkaufshonorar / Provision" suffix="%" value={v.provision} onChange={set("provision")} helper={eur(r.prov)} />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={<Switch checked={v.provisionUst} onChange={(e) => set("provisionUst")(e.target.checked)} />}
                  label={`zzgl. ${v.ust} % USt`}
                />
              </Grid>
            </Grid>
          </Section>
        </Stack>
      </Grid>

      <Grid size={{ xs: 12, lg: 5 }}>
        <Stack spacing={3} sx={{ position: { lg: "sticky" }, top: { lg: 88 } }}>
          <Card sx={{ p: 3, bgcolor: "primary.main", color: "common.white" }}>
            <Typography variant="overline" sx={{ color: "secondary.light" }}>
              Ergebnis
            </Typography>
            <Stack divider={<Divider flexItem sx={{ borderColor: "rgba(255,255,255,0.12)" }} />} sx={{ mt: 1 }}>
              {rows.map(([k, val, strong]) => (
                <Stack key={k} direction="row" sx={{ py: 1.5, gap: 2, justifyContent: "space-between" }}>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                    {k}
                  </Typography>
                  <Typography variant={strong ? "h6" : "body1"} sx={{ fontWeight: 700, color: strong ? "secondary.main" : "inherit" }}>
                    {val}
                  </Typography>
                </Stack>
              ))}
            </Stack>
            <Typography variant="caption" sx={{ display: "block", mt: 2, color: "rgba(255,255,255,0.55)" }}>
              Vor Steuern (KöSt/ImmoESt). Alle Werte sind Platzhalter und mit Steuerberater abzustimmen.
            </Typography>
          </Card>

          <Card sx={{ p: 3 }}>
            <Typography variant="overline" color="text.secondary">
              Kostenaufstellung
            </Typography>
            <Stack spacing={0.75} sx={{ mt: 1 }}>
              {kosten.map(([k, val]) => (
                <Line key={k} label={k} value={eur(val)} />
              ))}
              <Divider />
              <Line label="Gesamtkosten" value={eur(r.tot)} />
              <Divider />
              <Line label="Kredit" value={eur(r.kredit)} hint={`Rate ${eur(r.rate)} / Monat`} />
              <Line label={`Getilgt in ${r.M} Monaten`} value={eur(r.tilg)} />
              <Line label="Restschuld bei Verkauf" value={eur(r.rest)} />
            </Stack>
          </Card>
        </Stack>
      </Grid>
    </Grid>
  );
}
