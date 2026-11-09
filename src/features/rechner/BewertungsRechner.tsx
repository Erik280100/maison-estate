"use client";

// Bewertungsrechner: Verkehrswert einer Wohnung vor dem Kauf (Graz, Graz-Umgebung, Leibnitz), Kaufpreis-Check und Bankensicht.
// Rechenlogik: ./bewertung/rechne.ts · Daten: ./bewertung/daten.ts · Kern: ./ankauf/zusatzRechne.ts (bewertKern)
import { useState, type ReactNode } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import { eur, num, pct } from "./ankauf/rechne";
import { MODENAME, REF0, type BwMode } from "./ankauf/zusatzRechne";
import { Line, NumField, Section } from "./ankauf/ui";
import { QUELLEN, REGIONEN, type Region } from "./bewertung/daten";
import { DEFAULTS, bauKat, bewerte, lagefaktor, orte, rndAuto, type S } from "./bewertung/rechne";

const th = { whiteSpace: "nowrap", fontWeight: 700, py: 0.75 } as const;
const tc = { whiteSpace: "nowrap", py: 0.75, fontVariantNumeric: "tabular-nums" } as const;
const n0 = (x: number) => (Number.isFinite(x) ? Math.round(x).toLocaleString("de-AT") : "–");
const sgn = (x: number, d = 1) => (x >= 0 ? "+" : "") + x.toLocaleString("de-AT", { maximumFractionDigits: d });
const GOOD = "success.main", BAD = "error.main", WARN = "warning.main";
const AMPEL = { good: GOOD, warn: WARN, bad: BAD } as const;

function Sel({ label, value, options, onChange, helper }: { label: string; value: string; options: string[]; onChange: (s: string) => void; helper?: string }) {
  return (
    <TextField fullWidth select size="small" label={label} helperText={helper} value={options.includes(value) ? value : ""} onChange={(e) => onChange(e.target.value)}>
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

export function BewertungsRechner() {
  const [s, setS] = useState<S>(DEFAULTS);

  const set = (p: Partial<S>) => setS((o) => ({ ...o, ...p }));
  const setRegion = (region: Region) => set({ region, ort: orte(region)[0] });
  const x = bewerte(s);
  const f = lagefaktor(s.region, s.ort);
  const hasPreis = num(s.preis) > 0;
  const bk = bauKat(s.baujahr);

  return (
    <Stack spacing={3}>
      <Alert severity="info" sx={{ fontSize: 13 }}>
        Marktwert-Schätzung aus amtlichen Kaufpreisen (Statistik Austria / Land Steiermark, Grundbuch 2021–2025) mit Zu- und Abschlägen. Eine Plausibilitätsprüfung vor dem Kauf, kein Gutachten: Für die Beleihung verlangt die Bank meist ein Gutachten eines Sachverständigen.
      </Alert>

      <Section title="Objekt" intro="Lage und Eigenschaften der Wohnung. Der Bezirk bestimmt die Preisbasis, der Ort verfeinert sie.">
        <ToggleButtonGroup exclusive size="small" value={s.mode} onChange={(_, m: BwMode | null) => m && set({ mode: m })}>
          {(Object.keys(MODENAME) as BwMode[]).map((m) => <ToggleButton key={m} value={m}>{MODENAME[m]}</ToggleButton>)}
        </ToggleButtonGroup>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><Sel label="Bezirk" value={s.region} options={[...REGIONEN]} onChange={(r) => setRegion(r as Region)} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Sel
              label={s.region === "Graz-Stadt" ? "Grazer Stadtbezirk" : "Gemeinde"} value={s.ort} options={orte(s.region)} onChange={(o) => set({ ort: o })}
              helper={f ? `Lagefaktor ${sgn(f.pct)} % · ${f.quelle}` : undefined}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><NumField label="Wohnfläche" suffix="m²" value={s.flaeche} onChange={(v) => set({ flaeche: v })} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><NumField label="Baujahr" suffix="" value={s.baujahr} onChange={(v) => set({ baujahr: v })} helper={`Bauperiode: ${bk}`} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><Sel label="Zustand" value={s.zustand} options={Object.keys(REF0.zustand)} onChange={(v) => set({ zustand: v })} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><Sel label="Lage im Ort" value={s.lage} options={Object.keys(REF0.lage)} onChange={(v) => set({ lage: v })} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><Sel label="Stockwerk" value={s.stock} options={Object.keys(REF0.stock)} onChange={(v) => set({ stock: v })} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><Sel label="Energieklasse" value={s.energie} options={Object.keys(REF0.energie)} onChange={(v) => set({ energie: v })} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><Sel label="Störfaktoren" value={s.stoer} options={Object.keys(REF0.stoer)} onChange={(v) => set({ stoer: v })} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><NumField label="Stellplatz / Garage" suffix="€" value={s.stell} onChange={(v) => set({ stell: v })} helper="Wert zusätzlich, falls dabei" /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><NumField label="Keller / Abstellraum" suffix="€" value={s.keller} onChange={(v) => set({ keller: v })} helper="Wert zusätzlich, falls dabei" /></Grid>
        </Grid>
        <FormControlLabel control={<Switch checked={s.aussen} onChange={(e) => set({ aussen: e.target.checked })} />} label="Mit Außenfläche (Balkon, Loggia, Terrasse, Garten)" />
      </Section>

      <Section title="Kaufpreis" intro="Angebotspreis eintragen, um ihn gegen den Marktwert zu prüfen und die Bankensicht zu sehen.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}><NumField label="Angebotspreis" suffix="€" value={s.preis} onChange={(v) => set({ preis: v })} helper={hasPreis ? `${n0(x.preisQm)} €/m²` : undefined} /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><NumField label="Kaufnebenkosten" suffix="%" value={s.kaufNk} onChange={(v) => set({ kaufNk: v })} helper="Grunderwerbsteuer, Grundbuch, Notar, Makler" /></Grid>
          <Grid size={{ xs: 12, sm: 4 }}><NumField label="Gewünschter Abschlag zum Marktwert" suffix="%" value={s.zielAbschlag} onChange={(v) => set({ zielAbschlag: v })} helper="für das Höchstgebot" /></Grid>
        </Grid>
      </Section>

      <Section title="Ergebnis">
        <Grid container spacing={1}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Kpi label="Marktwert" value={eur(x.vw)} sub={`${n0(x.qm)} €/m² · Spanne ${n0(x.qmLo)}–${n0(x.qmHi)} €/m²`} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Kpi label="Spanne gesamt" value={`${eur(x.lo)} – ${eur(x.hi)}`} sub={`± ${pct(num(s.spanne))}`} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            {hasPreis
              ? <Kpi label="Angebotspreis zum Marktwert" value={`${sgn(x.abw * 100)} %`} color={x.ampel ? AMPEL[x.ampel] : undefined} sub={x.ampel === "good" ? "unter oder auf Marktwert" : x.ampel === "warn" ? "leicht über Marktwert" : "deutlich über Marktwert"} />
              : <Kpi label="Angebotspreis zum Marktwert" value="–" sub="Angebotspreis eintragen" />}
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}><Kpi label="Höchstgebot" value={eur(x.hoechstgebot)} sub={`${n0(x.hoechstgebot / x.A)} €/m² · ${pct(num(s.zielAbschlag))} unter Marktwert`} /></Grid>
        </Grid>
        {hasPreis && x.abw * 100 > num(s.spanne) && (
          <Alert severity="warning" sx={{ fontSize: 13 }}>
            Der Angebotspreis liegt über der Spanne des Modells ({MODENAME[s.mode]}, ± {pct(num(s.spanne))}). Mit Vergleichsobjekten belegen oder verhandeln.
          </Alert>
        )}

        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell sx={th}>Herleitung</TableCell><TableCell sx={th} align="right">Parameter</TableCell><TableCell sx={th} align="right">angesetzt</TableCell><TableCell sx={th} align="right">€/m²</TableCell></TableRow></TableHead>
            <TableBody>
              <TableRow><TableCell colSpan={3} sx={{ py: 0.75 }}>{x.kern.hin}</TableCell><TableCell sx={tc} align="right">{n0(x.kern.base)}</TableCell></TableRow>
              {x.kern.adj.map(([nm, p, q], i) => {
                const val = x.kern.adj.slice(0, i + 1).reduce((acc, a) => acc * (1 + a[2] / 100), x.kern.base);
                return (
                  <TableRow key={nm + i}>
                    <TableCell sx={{ py: 0.75 }}>{nm}</TableCell>
                    <TableCell sx={tc} align="right">{sgn(p)} %</TableCell>
                    <TableCell sx={{ ...tc, color: q > 0 ? GOOD : q < 0 ? BAD : undefined }} align="right">{sgn(q)} %</TableCell>
                    <TableCell sx={tc} align="right">{n0(val)}</TableCell>
                  </TableRow>
                );
              })}
              <TableRow><TableCell colSpan={3} sx={th}>Modellwert</TableCell><TableCell sx={{ ...tc, fontWeight: 700 }} align="right">{n0(x.kern.qm)}</TableCell></TableRow>
              {x.mitVergleich && (
                <TableRow><TableCell colSpan={3} sx={{ py: 0.75 }}>Gewichtet mit {n0(num(s.bwGewicht))} % Vergleichsmedian ({n0(x.medianQm)} €/m², {x.vergleichsQm.length} Objekte)</TableCell><TableCell sx={{ ...tc, fontWeight: 700 }} align="right">{n0(x.qm)}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {x.zuschlaege > 0 && <Typography variant="caption" color="text.secondary">Dazu kommen {eur(x.zuschlaege)} für Stellplatz und Keller (im Marktwert enthalten).</Typography>}
      </Section>

      <Section title="Bankensicht" intro="Banken beleihen nicht den Marktwert, sondern den Belehnwert: Marktwert abzüglich Sicherheitsabschlag, davon bis zur Beleihungsgrenze. Die Sätze sind Bankpraxis, je nach Bank verschieden.">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}><NumField label="Sicherheitsabschlag" suffix="%" value={s.belAbschlag} onChange={(v) => set({ belAbschlag: v })} helper="üblich 10–20 %" /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><NumField label="Beleihungsgrenze" suffix="%" value={s.belGrenze} onChange={(v) => set({ belGrenze: v })} helper="üblich 60–80 % des Belehnwerts" /></Grid>
        </Grid>
        <Stack spacing={0.5}>
          <Line label="Marktwert" value={eur(x.vw)} />
          <Line label={`Belehnwert (− ${pct(num(s.belAbschlag))})`} value={eur(x.belehnwert)} />
          <Line strong label={`Maximaler Kredit (${pct(num(s.belGrenze))} des Belehnwerts)`} value={eur(x.maxKredit)} />
          {hasPreis && <Line label={`Kaufpreis inkl. ${pct(num(s.kaufNk))} Nebenkosten`} value={eur(x.kaufGesamt)} />}
          {hasPreis && <Line strong label="Nötiges Eigenkapital" value={`${eur(x.eigenkapital)} (${pct(x.ekQuote * 100)})`} />}
        </Stack>
        {hasPreis && x.eigenkapital > 0 && x.ekQuote < 0.2 && (
          <Alert severity="warning" sx={{ fontSize: 13 }}>Eigenmittelquote unter 20 %: Die KIM-Verordnung verlangt in der Regel mindestens 20 % Eigenmittel (Kaufpreis inkl. Nebenkosten).</Alert>
        )}
      </Section>

      <Section title="Vergleichsobjekte" intro="3–5 vergleichbare Wohnungen eintragen. Transaktionspreise bevorzugen (Preisspiegel, Grundbuch, IMMOunited), Angebotspreise nur als Tendenz. Ab 3 Objekten fließt der Median gewichtet in den Marktwert ein.">
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell sx={th}>Lage</TableCell><TableCell sx={th}>m²</TableCell><TableCell sx={th}>Preis €</TableCell><TableCell sx={th}>Quelle</TableCell><TableCell sx={th} align="right">€/m²</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {s.vergleiche.length === 0 && <TableRow><TableCell colSpan={6} sx={{ color: "text.secondary" }}>Noch keine Vergleichsobjekte.</TableCell></TableRow>}
              {s.vergleiche.map((v, i) => {
                const patch = (p: Partial<typeof v>) => set({ vergleiche: s.vergleiche.map((y, j) => (j === i ? { ...y, ...p } : y)) });
                return (
                  <TableRow key={i}>
                    <TableCell sx={{ py: 0.5 }}><TextField size="small" fullWidth value={v.lage} onChange={(e) => patch({ lage: e.target.value })} /></TableCell>
                    <TableCell sx={{ py: 0.5, width: 90 }}><TextField size="small" type="number" value={v.m2 || ""} onChange={(e) => patch({ m2: +e.target.value || 0 })} /></TableCell>
                    <TableCell sx={{ py: 0.5, width: 130 }}><TextField size="small" type="number" value={v.preis || ""} onChange={(e) => patch({ preis: +e.target.value || 0 })} /></TableCell>
                    <TableCell sx={{ py: 0.5 }}><TextField size="small" fullWidth value={v.quelle} onChange={(e) => patch({ quelle: e.target.value })} /></TableCell>
                    <TableCell sx={tc} align="right">{num(v.m2) > 0 && num(v.preis) > 0 ? n0(v.preis / v.m2) : "–"}</TableCell>
                    <TableCell sx={{ py: 0.5 }}><IconButton size="small" aria-label="Vergleich entfernen" onClick={() => set({ vergleiche: s.vergleiche.filter((_, j) => j !== i) })}><CloseRounded fontSize="small" /></IconButton></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack direction="row" sx={{ gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Button size="small" startIcon={<AddRounded />} onClick={() => set({ vergleiche: [...s.vergleiche, { lage: "", m2: 0, preis: 0, quelle: "" }] })}>Vergleich</Button>
          <Box sx={{ width: 200 }}><NumField label="Gewicht Vergleichsobjekte" suffix="%" value={s.bwGewicht} onChange={(v) => set({ bwGewicht: v })} /></Box>
          <Typography variant="caption" color="text.secondary">
            {x.vergleichsQm.length ? `Median ${n0(x.medianQm)} €/m² · Spanne ${n0(Math.min(...x.vergleichsQm))}–${n0(Math.max(...x.vergleichsQm))} €/m² · ${x.vergleichsQm.length < 3 ? "mindestens 3 nötig" : "fließt ein"}` : ""}
          </Typography>
        </Stack>
      </Section>

      <Section title="Ertragswert (Gegenprobe)" intro="Für Wohnungen, die vermietet werden könnten: Reinertrag mal Vervielfältiger. Vereinfacht, ohne gesonderten Bodenwert. Als grobe Gegenprobe zum Vergleichswert gedacht.">
        <FormControlLabel control={<Switch checked={s.ertrag} onChange={(e) => set({ ertrag: e.target.checked })} />} label="Ertragswert berechnen" />
        {s.ertrag && (
          <>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><NumField label="Nettomiete" suffix="€/m²" value={s.mieteQm} onChange={(v) => set({ mieteQm: v })} helper="Nettomiete pro Monat ohne BK und USt" /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><NumField label="Mietausfall + nicht umlegbare Kosten" suffix="%" value={s.mietausfall} onChange={(v) => set({ mietausfall: v })} /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><NumField label="Liegenschaftszins" suffix="%" value={s.liZins} onChange={(v) => set({ liZins: v })} /></Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}><NumField label="Restnutzungsdauer" suffix="Jahre" value={s.rnd} onChange={(v) => set({ rnd: v })} helper={`0 = automatisch (${rndAuto(s.baujahr)} Jahre)`} /></Grid>
            </Grid>
            <Stack spacing={0.5}>
              <Line label="Reinertrag pro Jahr" value={eur(x.reinertrag)} />
              <Line label={`Vervielfältiger (${pct(num(s.liZins))}, ${x.rndJ} Jahre)`} value={x.vf.toLocaleString("de-AT", { maximumFractionDigits: 2 })} />
              <Line strong label="Ertragswert" value={x.ertragswert !== null ? eur(x.ertragswert) : "–"} />
              <Line label="Abweichung zum Vergleichswert" value={x.ewAbw !== null ? `${sgn(x.ewAbw * 100)} %` : "–"} />
            </Stack>
          </>
        )}
      </Section>

      <details>
        <summary style={{ cursor: "pointer", fontWeight: 600 }}>Datenquellen, Methodik und Parameter</summary>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}><NumField label="Marktentwicklung seit Datenstand" suffix="%" value={s.markt} onChange={(v) => set({ markt: v })} helper={`Datenstand ${REF0.stand} · ${REF0.marktQ}`} /></Grid>
            <Grid size={{ xs: 12, sm: 6 }}><NumField label="Bewertungsspanne ±" suffix="%" value={s.spanne} onChange={(v) => set({ spanne: v })} /></Grid>
          </Grid>
          {QUELLEN.map(([k, v]) => (
            <Typography key={k} variant="body2" color="text.secondary"><strong>{k}.</strong> {v}</Typography>
          ))}
          <Button size="small" sx={{ alignSelf: "flex-start" }} onClick={() => setS(DEFAULTS)}>Eingaben zurücksetzen</Button>
        </Stack>
      </details>
    </Stack>
  );
}
