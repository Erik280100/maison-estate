"use client";

// Anlegerwohnungsrechner (Verkauf): zeigt dem Kunden Mietrendite, Eigenkapitalrendite, Cashflow nach Steuer und AfA.
// Optional mit monatlicher Zuzahlung (direkt tilgen / Depot / FLV), die den Kredit früher zurückzahlt.
// Rechenlogik: ./anleger/rechne.ts (Grundlage: DAS IMMO EXCEL – mit Maximalkreditbetrag)
import { useMemo, useState } from "react";
import {
  Chart as ChartJS, CategoryScale, LinearScale, LineElement, PointElement, Tooltip as ChartTooltip, Legend, Filler,
} from "chart.js";
import { Line as LineChart } from "react-chartjs-2";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
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
import { Details, Line, Section, ampelColor } from "./ankauf/ui";
import { Fields, Switches, type CF, type NF } from "./felder";
import { DEFAULTS, MODUS_TEXT, calc, eur, jahreMonate, n2, pct, type Modus, type S } from "./anleger/rechne";

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, ChartTooltip, Legend, Filler);

const th = { fontWeight: 700, whiteSpace: "nowrap", fontSize: 12 } as const;
const td = { whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", fontSize: 13 } as const;

const OBJEKT: NF<S>[] = [
  { k: "A", label: "Größe", unit: "m²" },
  { k: "miete", label: "Netto-Miete", unit: "€/m²", helper: "Hauptmietzins pro Monat, ohne Betriebskosten und USt" },
  { k: "kp", label: "Nettokaufpreis", unit: "€" },
  { k: "ust", label: "Umsatzsteuer auf den Kaufpreis", unit: "%", helper: "Basis der Nebenkosten (Bruttopreis); die Vorsteuer holt sich der Anleger vom Finanzamt zurück" },
];
const NEBENKOSTEN: NF<S>[] = [
  { k: "kv", label: "Kaufvertrag", unit: "%", helper: "vom Bruttopreis" },
  { k: "notar", label: "Notar", unit: "€", helper: "pauschal inkl. Puffer" },
  { k: "eintr", label: "Eintragungsgebühren", unit: "%", helper: "vom Bruttopreis" },
  { k: "grest", label: "Grunderwerbsteuer", unit: "%", helper: "vom Bruttopreis" },
  { k: "makler", label: "Makler", unit: "%", helper: "vom Bruttopreis" },
];
const FINANZ: NF<S>[] = [
  { k: "kreditPct", label: "Kredit in % vom Nettokaufpreis", unit: "%", helper: "Maximalkreditbetrag; die Kreditkosten kommen obendrauf und werden mitfinanziert" },
  { k: "zins", label: "Zinssatz p.a.", unit: "%" },
  { k: "lz", label: "Kreditlaufzeit", unit: "J." },
];
const KREDITKOSTEN: NF<S>[] = [
  { k: "vertrag", label: "Errichtung des Kreditvertrags", unit: "%", helper: "der Kreditsumme" },
  { k: "pfand", label: "Eintragung des Kredits", unit: "%", helper: "der Kreditsumme" },
  { k: "ngs", label: "Nebengebührenaufschlag", unit: "%", helper: "auf die Eintragung" },
];
const ANNAHMEN: NF<S>[] = [
  { k: "mietSteig", label: "Mietsteigerung p.a.", unit: "%", helper: "Wertsicherung" },
  { k: "wert", label: "Wertsteigerung der Wohnung p.a.", unit: "%" },
  { k: "leer", label: "Leerstand / Mietausfall", unit: "%" },
  { k: "kostenM2", label: "Nicht umlegbare Kosten inkl. Rücklage", unit: "€/m²·Monat", helper: "z. B. Verwaltung, Rücklage" },
];
const STEUER: NF<S>[] = [
  { k: "grenz", label: "Grenzsteuersatz", unit: "%", helper: "Verluste aus der Vermietung mindern die Steuer auf das übrige Einkommen" },
  { k: "geb", label: "Gebäudeanteil", unit: "%", helper: "von Kaufpreis + Nebenkosten abschreibbar, der Rest ist Grund und Boden" },
  { k: "afa", label: "AfA-Satz", unit: "%" },
];
const STEUER_CHECKS: CF<S>[] = [
  { k: "beschl", label: "Beschleunigte AfA", helper: "Dreifacher Satz im 1., doppelter im 2. Jahr – nur für neu errichtete Wohngebäude (Fertigstellung bis 2026). Mit dem Steuerberater klären." },
  { k: "gbk", label: "Kreditkosten steuerlich absetzen", helper: "Geldbeschaffungskosten, verteilt auf die Kreditlaufzeit" },
];

export function AnlegerRechner() {
  const [s, setS] = useState<S>(DEFAULTS);
  const [armReset, setArmReset] = useState(false);

  const setN = (k: keyof S, v: number) => setS((o) => ({ ...o, [k]: v }));
  const setB = (k: keyof S, v: boolean) => setS((o) => ({ ...o, [k]: v }));
  const r = useMemo(() => calc(s), [s]);
  const zuzAktiv = r.zuz > 0;
  const b = r.basis, m = r.mit, last = b.rows[b.rows.length - 1];
  const reset = () => {
    if (!armReset) { setArmReset(true); setTimeout(() => setArmReset(false), 4000); return; }
    setArmReset(false); setS(DEFAULTS);
  };

  const hinweise: ["error" | "warning" | "info", string][] = [];
  if (r.deckung < 1) hinweise.push(["warning", `Die Miete deckt die Kreditrate nicht: Der Anleger zahlt im 1. Jahr ${eur((r.rateM - b.rows[0].miete / 12))} pro Monat aus eigener Tasche zu (vor Steuerersparnis).`]);
  if (zuzAktiv && s.modus === "flv" && m.abloeseMonat !== null && m.abloeseMonat < 15 * 12) hinweise.push(["warning", "Die Ablöse läge vor Ablauf von 15 Vertragsjahren der FLV – das löst eine Nachversteuerung (11 % Versicherungssteuer) aus, die hier nicht berücksichtigt ist."]);
  if (zuzAktiv && s.modus !== "tilgen" && m.abloeseMonat === null) hinweise.push(["info", "Mit dieser Zuzahlung reicht das Guthaben nicht aus, um den Kredit vorzeitig abzulösen. Es bleibt als Vermögen am Ende der Laufzeit stehen."]);
  if (zuzAktiv && s.modus === "depot") hinweise.push(["info", "Depot: Die Rendite ist eine Annahme und nicht garantiert; bei der Ablöse fällt KESt auf den Kursgewinn an. Wertschwankungen sind nicht abgebildet."]);

  const labels = ["0", ...b.rows.map((x) => String(x.t))];
  const chartData = {
    labels,
    datasets: [
      { label: "Wohnungswert", data: [r.kp, ...b.rows.map((x) => x.wertT)], borderColor: brand.gold600, backgroundColor: "rgba(194,164,103,.18)", fill: true, pointRadius: 0, tension: 0.2 },
      { label: zuzAktiv ? "Restschuld ohne Zuzahlung" : "Restschuld", data: [r.kredit, ...b.rows.map((x) => x.bal)], borderColor: brand.navy700, borderDash: zuzAktiv ? [6, 4] : [], fill: false, pointRadius: 0, tension: 0.2 },
      ...(zuzAktiv ? [{ label: "Restschuld mit Zuzahlung", data: [r.kredit, ...m.rows.map((x) => x.bal)], borderColor: "#2e7d32", fill: false, pointRadius: 0, tension: 0.2, borderDash: [] as number[], backgroundColor: "transparent" }] : []),
      ...(zuzAktiv && s.modus !== "tilgen" ? [{ label: s.modus === "flv" ? "FLV-Guthaben" : "Depot (nach KESt)", data: [0, ...m.rows.map((x) => x.spar)], borderColor: "#8d6e63", fill: false, pointRadius: 0, tension: 0.2, borderDash: [] as number[], backgroundColor: "transparent" }] : []),
    ],
  };

  const kennzahlen: [string, string, string, string?][] = [
    ["Mietrendite", pct(r.mietrendite, 2), "text.primary", "Jahresmiete ÷ Nettokaufpreis"],
    ["Eigenkapitalrendite", pct(r.ekRenditeHebel, 2), r.ekRenditeHebel > r.mietrendite ? ampelColor.good : "text.primary", "Mietrendite + Hebel durch den Kredit"],
    ["Cashflow / Monat", eur(r.cfM1), r.cfM1 < 0 ? ampelColor.bad : ampelColor.good, "Jahr 1, nach Rate und Steuer"],
    ["Eigenkapital", eur(r.ek), "text.primary", `${pct(r.ekQuote, 0)} der Gesamtkosten`],
  ];

  return (
    <Stack spacing={3}>
      <Card sx={{ p: 3 }}>
        <Grid container spacing={2} sx={{ alignItems: "center" }}>
          <Grid size={{ xs: 12, md: 5 }}><TextField fullWidth label="Objekt" value={s.name} onChange={(e) => setS((o) => ({ ...o, name: e.target.value }))} /></Grid>
          <Grid size={{ xs: 12, md: 5 }}><TextField fullWidth label="Adresse" value={s.adresse} onChange={(e) => setS((o) => ({ ...o, adresse: e.target.value }))} /></Grid>
          <Grid size={{ xs: 12, md: 2 }}><Button fullWidth variant="outlined" onClick={reset}>{armReset ? "Wirklich?" : "Standardwerte"}</Button></Grid>
        </Grid>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Beispielrechnung für Anleger: Netto-Kaufpreis, Nebenkosten auf den Bruttopreis, Kredit samt Kreditkosten, Mietsteigerung, AfA und Einkommensteuer. Alle Werte lassen sich anpassen.
        </Typography>
      </Card>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={3}>
            <Section title="Wohnung & Miete">
              <Fields<S> list={OBJEKT} s={s} set={setN} />
              <Details title="Kaufnebenkosten" sum={eur(r.nk)}>
                <Stack spacing={2}>
                  <Fields<S> list={NEBENKOSTEN} s={s} set={setN} />
                  {r.nkPos.map(([l, v, h]) => <Line key={l} label={l} hint={h} value={eur(v)} />)}
                </Stack>
              </Details>
              <Line label="Bruttokaufpreis" value={eur(r.brutto)} />
              <Line label="Kaufpreis + Nebenkosten" value={eur(r.summeOhneKredit)} strong />
            </Section>

            <Section title="Finanzierung">
              <Fields<S> list={FINANZ} s={s} set={setN} />
              <Details title="Kreditkosten (mitfinanziert)" sum={eur(r.kreditNK)}>
                <Stack spacing={2}>
                  <Fields<S> list={KREDITKOSTEN} s={s} set={setN} />
                  {r.kreditPos.map(([l, v, h]) => <Line key={l} label={l} hint={h} value={eur(v)} />)}
                </Stack>
              </Details>
              <Line label="Maximaler Kreditbetrag · Kredit inkl. Kosten" value={`${eur(r.maxKredit)} · ${eur(r.kredit)}`} />
              <Line label="Kreditrate pro Monat" value={eur(r.rateM)} strong />
            </Section>

            <Section title="Annahmen">
              <Fields<S> list={ANNAHMEN} s={s} set={setN} />
            </Section>

            <Section title="Steuer & AfA" intro="Die AfA mindert den steuerpflichtigen Gewinn. Ein steuerlicher Verlust im Anfangsjahr senkt die Steuer auf das übrige Einkommen.">
              <Fields<S> list={STEUER} s={s} set={setN} />
              <Switches<S> list={STEUER_CHECKS} s={s} set={setB} />
              <Line label="AfA-Bemessungsgrundlage" value={eur(r.afaBasis)} />
              <Line label="AfA Jahr 1 · Jahr 3" value={`${eur(b.rows[0].afa)} · ${eur(b.rows[Math.min(2, b.rows.length - 1)].afa)}`} />
            </Section>

            <Section
              title="Optionale Zuzahlung pro Monat"
              intro="Der Anleger zahlt zusätzlich aus eigener Tasche monatlich einen Betrag ein – direkt in den Kredit oder in ein Depot bzw. eine FLV, die den Kredit früher ablösen."
            >
              <Fields<S> list={[{ k: "zuz", label: "Zuzahlung pro Monat", unit: "€", helper: "0 = keine Zuzahlung" }]} s={s} set={setN} />
              {r.zuz > 0 && (
                <>
                  <ToggleButtonGroup exclusive size="small" value={s.modus} onChange={(_, v: Modus | null) => v && setS((o) => ({ ...o, modus: v }))} sx={{ flexWrap: "wrap" }}>
                    {(Object.keys(MODUS_TEXT) as Modus[]).map((k) => <ToggleButton key={k} value={k}>{MODUS_TEXT[k]}</ToggleButton>)}
                  </ToggleButtonGroup>
                  <Fields<S>
                    s={s} set={setN}
                    list={[
                      { k: "depotRend", label: "Rendite des Depots p.a.", unit: "%", helper: "Annahme, nicht garantiert", when: (x) => x.modus === "depot" },
                      { k: "kest", label: "KESt auf Kursgewinne", unit: "%", when: (x) => x.modus === "depot" },
                      { k: "flvPerf", label: "Fondsperformance p.a.", unit: "%", helper: "vor Kosten; Kosten und Zillmerung sind im Merkur-Modell enthalten", when: (x) => x.modus === "flv" },
                      { k: "vfe", label: "Vorfälligkeitsentschädigung", unit: "%", helper: "der Restschuld bei vorzeitiger Ablöse", when: (x) => x.modus !== "tilgen" },
                    ]}
                  />
                </>
              )}
            </Section>

            <Stack direction="row" sx={{ gap: 1, flexWrap: "wrap" }}>
              <Button variant="outlined" onClick={() => window.print()}>Drucken / als PDF speichern</Button>
            </Stack>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Card sx={{ p: 3, position: { lg: "sticky" }, top: { lg: 88 }, borderTop: 3, borderTopColor: "secondary.main" }}>
            <Stack spacing={2}>
              <Box>
                <Typography variant="overline" color="text.secondary">Eigenkapitalrendite</Typography>
                <Typography variant="h3" sx={{ fontWeight: 700 }}>{pct(r.ekRenditeHebel, 2)}</Typography>
                <Typography variant="caption" color="text.secondary">bei {pct(r.mietrendite, 2)} Mietrendite und {s.zins.toLocaleString("de-AT")} % Kreditzins</Typography>
              </Box>
              <Grid container spacing={1}>
                {kennzahlen.map(([l, v, c, h]) => (
                  <Grid key={l} size={6}>
                    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 1.25, height: "100%" }}>
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</Typography>
                      <Typography sx={{ fontWeight: 700, color: c }}>{v}</Typography>
                      {h && <Typography variant="caption" color="text.secondary">{h}</Typography>}
                    </Box>
                  </Grid>
                ))}
              </Grid>
              <Stack spacing={0.75}>
                <Line label="Jahresmiete netto (Jahr 1)" value={eur(r.mieteJ0)} />
                <Line label="Nettomietrendite nach Kosten" hint="auf Kaufpreis + Nebenkosten" value={pct(r.nettoRendite, 2)} />
                <Line label="Rendite Jahr 1 inkl. Tilgung & Wertsteigerung" value={pct(r.gesamtJ1, 1)} />
                <Line label="Cashflow Jahr 1 nach Rate" value={eur(b.rows[0].miete - b.rows[0].rate)} />
                <Line label="Steuerersparnis Jahr 1" value={b.rows[0].steuer < 0 ? eur(-b.rows[0].steuer) : "–"} hint={b.rows[0].steuer > 0 ? `Steuer ${eur(b.rows[0].steuer)}` : undefined} />
                <Line strong label="Cashflow Jahr 1 nach Steuer" value={eur(b.rows[0].cf)} />
                <Line label="Summe Cashflow über die Laufzeit" value={eur(b.sumCf)} />
                <Line label="Wohnungswert nach Laufzeit" value={eur(last.wertT)} />
                <Line strong label="Gesamtgewinn nach Steuer (ohne Verkauf)" value={eur(b.gewinn)} hint={`IRR ${pct(b.irr, 1)}`} />
              </Stack>
              {hinweise.map(([sev, t]) => <Alert key={t} severity={sev} sx={{ py: 0, fontSize: 13 }}>{t}</Alert>)}
            </Stack>
          </Card>
        </Grid>
      </Grid>

      {zuzAktiv && (
        <Section
          title={`Mit Zuzahlung von ${eur(r.zuz)} pro Monat`}
          intro={`${MODUS_TEXT[s.modus]} – im Vergleich zur Rechnung ohne Zuzahlung.`}
        >
          <Grid container spacing={1}>
            {([
              ["Kredit zurückgezahlt nach", jahreMonate(m.kreditEndeMonat), `statt ${jahreMonate(r.lz * 12)}`, ampelColor.good],
              ["Früher schuldenfrei", `${n2(r.jahreFrueher)} Jahre`, m.abloeseMonat !== null ? "durch vorzeitige Ablöse" : "keine vorzeitige Ablöse", r.jahreFrueher > 0 ? ampelColor.good : "text.primary"],
              ["Zinsersparnis", eur(r.zinsErsparnis), "über die Laufzeit", r.zinsErsparnis > 0 ? ampelColor.good : "text.primary"],
              ["Eingezahlt (Zuzahlungen)", eur(m.zuzGesamt), s.modus === "tilgen" ? "geht komplett in den Kredit" : "bis zur Ablöse", "text.primary"],
              ["Gesamtgewinn nach Steuer", eur(m.gewinn), `${r.vorteil >= 0 ? "+" : "−"}${eur(Math.abs(r.vorteil))} gegenüber ohne Zuzahlung`, r.vorteil >= 0 ? ampelColor.good : ampelColor.bad],
              ["EK-IRR inkl. Wert am Ende", pct(m.irr, 1), `ohne Zuzahlung ${pct(b.irr, 1)}`, "text.primary"],
            ] as [string, string, string, string][]).map(([l, v, h, c]) => (
              <Grid key={l} size={{ xs: 6, md: 4 }}>
                <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, p: 1.25, height: "100%" }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", textTransform: "uppercase", letterSpacing: 0.5 }}>{l}</Typography>
                  <Typography sx={{ fontWeight: 700, color: c }}>{v}</Typography>
                  <Typography variant="caption" color="text.secondary">{h}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
          {m.abloeseMonat !== null && s.modus !== "tilgen" && (
            <Stack spacing={0.75}>
              <Line label={`Ablöse nach ${jahreMonate(m.abloeseMonat)}: ${s.modus === "flv" ? "FLV-Guthaben" : "Depotwert"}`} value={eur(m.abloeseSpar)} />
              {s.modus === "depot" && <Line label="abzüglich KESt auf Kursgewinn" value={eur(m.kestAbloese)} />}
              <Line label="Vorfälligkeitsentschädigung" value={eur(m.abloeseVfe)} />
              <Line strong label="Rest, der dem Anleger zufließt" value={eur(m.abloeseUeberschuss)} />
            </Stack>
          )}
          {m.abloeseMonat !== null && s.modus === "tilgen" && (
            <Typography variant="body2" color="text.secondary">Nach der vollständigen Tilgung entfallen Kreditrate und Zuzahlung – die Miete bleibt (nach Steuer) beim Anleger.</Typography>
          )}
        </Section>
      )}

      <Section title="Vermögensaufbau" intro="Wohnungswert mit der angenommenen Wertsteigerung gegen die Restschuld. Die Mieter tilgen den Kredit mit.">
        <Box sx={{ height: 320 }}>
          <LineChart
            data={chartData}
            options={{
              responsive: true, maintainAspectRatio: false, interaction: { mode: "index", intersect: false },
              plugins: { legend: { position: "bottom" }, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${eur(c.parsed.y ?? NaN)}` } } },
              scales: { y: { beginAtZero: true, ticks: { callback: (v) => Math.round(+v / 1000).toLocaleString("de-AT") + " T" } }, x: { title: { display: true, text: "Jahre" } } },
            }}
          />
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Nach {r.lz} Jahren: Wohnung {eur(last.wertT)}, Kredit zurückgezahlt{zuzAktiv && m.sparEnde > 0 ? `, Depot/FLV ${eur(m.sparEnde)}` : ""}.
        </Typography>
      </Section>

      <Section
        title="Jahresübersicht"
        intro={`Miete, Kreditrate, Zinsen, Überschuss vor AfA, AfA, steuerpflichtiger Gewinn und Cashflow${zuzAktiv ? " – hier mit Zuzahlung" : ""}. Ein negativer Steuerbetrag ist eine Steuerersparnis.`}
      >
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Jahr", "Miete/Monat", "Miete", "Kreditrate", "Restschuld", "Zinsen", "Überschuss vor AfA", "AfA", "Steuerpfl. Gewinn", "Steuer", "Nettogewinn", "Tilgung",
                  ...(zuzAktiv ? ["Zuzahlung", ...(s.modus !== "tilgen" ? ["Guthaben"] : [])] : []), "Cashflow", "Wohnungswert"].map((h, i) => (
                  <TableCell key={h} sx={th} align={i ? "right" : "left"}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(zuzAktiv ? m : b).rows.map((x) => (
                <TableRow key={x.t} hover>
                  <TableCell sx={td}>{x.t}</TableCell>
                  {[x.mieteM, x.miete, x.rate, x.bal, x.zinsen, x.ueberschuss, x.afa, x.evs, x.steuer, x.netto, x.tilgung].map((v, i) => <TableCell key={i} sx={td} align="right">{eur(v)}</TableCell>)}
                  {zuzAktiv && <TableCell sx={td} align="right">{eur(x.zuz)}</TableCell>}
                  {zuzAktiv && s.modus !== "tilgen" && <TableCell sx={td} align="right">{eur(x.spar)}</TableCell>}
                  <TableCell sx={{ ...td, color: x.cf < 0 ? "error.main" : undefined, fontWeight: 600 }} align="right">{eur(x.cf)}</TableCell>
                  <TableCell sx={td} align="right">{eur(x.wertT)}</TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell sx={{ ...td, fontWeight: 700 }} colSpan={zuzAktiv ? (s.modus !== "tilgen" ? 14 : 13) : 11}>Summe Cashflow über die Laufzeit</TableCell>
                <TableCell sx={{ ...td, fontWeight: 700 }} align="right">{eur((zuzAktiv ? m : b).sumCf)}</TableCell>
                <TableCell sx={td} />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Typography variant="caption" color="text.secondary">
        Beispielrechnung der Maison Estate GmbH auf Basis von Annahmen. Keine Zusicherung von Miete, Wertsteigerung oder Rendite; keine Steuer-, Anlage- oder Finanzierungsberatung.
        Die Umsatzsteuer auf den Kaufpreis wird vom Finanzamt erstattet und ist hier nicht im Eigenkapital enthalten. Nicht berücksichtigt: Immobilienertragsteuer bei einem Verkauf, Zinsänderungen nach einer Fixzinsphase.
      </Typography>
    </Stack>
  );
}
