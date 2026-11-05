"use client";

import { useMemo, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import {
  ampel, cash, eur, halten, limits, num, pct, rechne,
  type Gewerk, type NkPos, type V,
} from "./rechne";
import { Line, NumField, Section, ampelColor } from "./ui";

type Cell = ReactNode | { v: ReactNode; c?: keyof typeof ampelColor; bold?: boolean };

function isCell(x: Cell): x is { v: ReactNode; c?: keyof typeof ampelColor; bold?: boolean } {
  return typeof x === "object" && x !== null && "v" in (x as object);
}

function Tbl({ head, rows, total }: { head: string[]; rows: Cell[][]; total?: Cell[] }) {
  const cell = (x: Cell, i: number, bold?: boolean) => {
    const o = isCell(x) ? x : { v: x };
    return (
      <TableCell
        key={i}
        align={i === 0 ? "left" : "right"}
        sx={{ whiteSpace: "nowrap", fontWeight: o.bold || bold ? 700 : 400, color: o.c ? ampelColor[o.c] : undefined, py: 0.75 }}
      >
        {o.v}
      </TableCell>
    );
  };
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            {head.map((h, i) => (
              <TableCell key={i} align={i === 0 ? "left" : "right"} sx={{ whiteSpace: "nowrap", fontWeight: 700, py: 0.75 }}>
                {h}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r, ri) => (
            <TableRow key={ri}>{r.map((x, i) => cell(x, i))}</TableRow>
          ))}
          {total && <TableRow>{total.map((x, i) => cell(x, i, true))}</TableRow>}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function Bars({ cum, peakM }: { cum: number[]; peakM: number }) {
  const W = 720, H = 200, pl = 64, pr = 12, pt = 12, pb = 28;
  const mx = Math.max(0, ...cum);
  const mn = Math.min(0, ...cum);
  const rng = mx - mn || 1;
  const y = (x: number) => pt + ((mx - x) / rng) * (H - pt - pb);
  const bw = (W - pl - pr) / cum.length;
  return (
    <Box component="svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Kumulierter Saldo je Monat" sx={{ width: "100%", height: "auto" }}>
      <line x1={pl} x2={W - pr} y1={y(0)} y2={y(0)} stroke="currentColor" strokeOpacity={0.4} />
      {[mn, 0, mx]
        .filter((x, i, a) => a.indexOf(x) === i)
        .map((x) => (
          <text key={x} x={pl - 6} y={y(x) + 4} textAnchor="end" fontSize={11} fill="currentColor" opacity={0.7}>
            {Math.round(x / 1000).toLocaleString("de-AT")} T€
          </text>
        ))}
      {cum.map((x, i) => {
        const y0 = y(0);
        const y1 = y(x);
        return (
          <g key={i}>
            <rect
              x={pl + i * bw + bw * 0.15}
              y={Math.min(y0, y1)}
              width={bw * 0.7}
              height={Math.max(Math.abs(y1 - y0), 1)}
              rx={2}
              fill={x >= 0 ? "#2e7d32" : i === peakM ? "#c9a24b" : "#6b7a99"}
            >
              <title>{`Monat ${i}: ${eur(x)}`}</title>
            </rect>
            <text x={pl + i * bw + bw / 2} y={H - 10} textAnchor="middle" fontSize={11} fill="currentColor" opacity={0.7}>
              {i}
            </text>
          </g>
        );
      })}
    </Box>
  );
}

export function Analyse({
  v,
  set,
  setGes,
  g,
  nk,
}: {
  v: V;
  set: <K extends keyof V>(k: K) => (x: V[K]) => void;
  setGes: (idx: number, patch: Partial<V["ges"][number]>) => void;
  g: Gewerk[];
  nk: NkPos[];
}) {
  const r = useMemo(() => rechne(v, g, nk), [v, g, nk]);
  const L = useMemo(() => limits(v, g, nk), [v, g, nk]);
  const C = useMemo(() => cash(v, g, nk), [v, g, nk]);
  const H = useMemo(() => halten(v, g, nk), [v, g, nk]);
  const ziel = num(v.ziel);
  const res = (num(v.liqRes) / 100) * r.tot;
  const peak = C.peak;
  const vers = r.vers;

  // Sensitivität
  const vs = [-400, -200, 0, 200, 400].map((d) => num(v.verkM2) + d).filter((x) => x >= 0);
  const ks: { label: string; kp: number; cur: boolean }[] = vers
    ? [-0.15, -0.1, -0.05, 0, 0.05, 0.1, 0.15]
        .map((d) => Math.round(num(v.kauf) + d * num(v.schaetz)))
        .filter((x) => x >= 0)
        .map((x) => ({ label: eur(x), kp: x, cur: x === Math.round(num(v.kauf)) }))
    : [-300, -200, -100, 0, 100, 200, 300]
        .map((d) => num(v.kauf) / r.A + d)
        .filter((x) => x >= 0)
        .map((x) => ({ label: `${Math.round(x).toLocaleString("de-AT")} €/m²`, kp: x * r.A, cur: Math.abs(x - num(v.kauf) / r.A) < 1e-6 }));
  const sens = ks.map((k) => [
    { v: k.label, bold: k.cur },
    ...vs.map((x) => {
      const m = rechne(v, g, nk, { kp: k.kp, vkM2: x }).marge;
      return { v: pct(m), c: ampel(m, ziel), bold: k.cur && x === num(v.verkM2) };
    }),
  ] as Cell[]);

  // Verzögerung
  const delay = [0, 3, 6, 9, 12].map((d) => {
    const x = rechne(v, g, nk, { extraM: d });
    const late = x.M > x.G;
    const mon = (late ? x.rate : x.rest * x.i) + x.halteM;
    return [
      d ? `+${d} Mon.` : "Plan",
      `${x.M} Mon.`,
      eur(x.zinsen),
      eur(x.halte),
      x.tilg ? { v: eur(x.tilg), c: "warn" as const } : "–",
      eur(mon),
      eur(x.gewinn),
      { v: pct(x.marge), c: ampel(x.marge, ziel), bold: d === 0 },
    ] as Cell[];
  });

  // Stresstest
  const sg = (x: number) => `${x > 0 ? "+" : ""}${x.toLocaleString("de-AT")}`;
  const allO = { vkM2: num(v.verkM2) * (1 + num(v.stVk) / 100), sanF: 1 + num(v.stSan) / 100, extraM: num(v.stMon), zinsAdd: num(v.stZins) };
  const scen: [string, typeof allO | object][] = [
    ["Plan", {}],
    [`Verkaufspreis ${sg(num(v.stVk))} %`, { vkM2: allO.vkM2 }],
    [`Sanierung ${sg(num(v.stSan))} %`, { sanF: allO.sanF }],
    [`Verkauf ${sg(num(v.stMon))} Mon. später`, { extraM: allO.extraM }],
    [`Zins ${sg(num(v.stZins))} %-P.`, { zinsAdd: allO.zinsAdd }],
    ["Alles zusammen", allO],
  ];
  const stress = scen.map(([name, o], idx) => {
    const x = rechne(v, g, nk, o);
    const c = cash(v, g, nk, o);
    return { name, x, c, row: [
      { v: name, bold: idx === scen.length - 1 },
      eur(x.tot),
      eur(x.gewinn),
      { v: pct(x.marge), c: ampel(x.marge, ziel), bold: idx === 0 },
      eur(c.peak),
      idx ? eur(c.peak - peak) : "–",
    ] as Cell[] };
  });
  const worst = stress[stress.length - 1];
  const dBe = num(v.verkM2) > 0 ? (1 - L.vbe / num(v.verkM2)) * 100 : NaN;
  const dMin = num(v.verkM2) > 0 ? (1 - L.vmin / num(v.verkM2)) * 100 : NaN;

  // Liquidität
  const d = (x: number) => (x ? eur(x) : "–");
  const liqRows = C.R.map((x) => [
    x.m === 0 ? "Ankauf" : x.m === C.N ? `Monat ${x.m} · Verkauf` : `Monat ${x.m}`,
    d(x.ank), d(x.san), d(x.fin), d(x.zins), d(x.tilg), d(x.halte), d(x.bank), d(x.verk),
    { v: eur(x.net), c: x.net < 0 ? ("bad" as const) : ("good" as const) },
    { v: eur(x.cum), bold: x.m === C.peakM && peak > 0 },
  ] as Cell[]);
  const T = C.R.reduce(
    (a, x) => ({
      ank: a.ank + x.ank, san: a.san + x.san, fin: a.fin + x.fin, zins: a.zins + x.zins, tilg: a.tilg + x.tilg,
      halte: a.halte + x.halte, bank: a.bank + x.bank, verk: a.verk + x.verk, net: a.net + x.net,
    }),
    { ank: 0, san: 0, fin: 0, zins: 0, tilg: 0, halte: 0, bank: 0, verk: 0, net: 0 },
  );

  // Gesellschafter
  const kest = num(v.kestS) / 100;
  const extra = Math.max(0, worst.c.peak - peak);
  const sums = { gew: 0, haft: 0, ek: 0 };
  const gesRows = v.ges.map((s) => {
    const a = (r.netto * num(s.gew)) / 100;
    sums.gew += num(s.gew); sums.haft += num(s.haft); sums.ek += num(s.ek);
    return { a, b: a > 0 ? a * (1 - kest) : a, c: (r.kredit * num(s.haft)) / 100, e: ((peak + res) * num(s.ek)) / 100, n: (extra * num(s.ek)) / 100 };
  });
  const offSum = (["gew", "haft", "ek"] as const).filter((k) => Math.abs(sums[k] - 100) > 0.01);

  // Bank
  const invest = r.tot - r.prov - r.rl;
  const bw = r.vk * (1 - num(v.bwAbschlag) / 100);
  const ba = bw > 0 ? r.kredit / bw : NaN;
  const dscr = H.ann > 0 ? H.netto / H.ann : NaN;

  const patchGes = (idx: number, patch: Partial<V["ges"][number]>) => setGes(idx, patch);

  return (
    <Stack spacing={3}>
      <Section
        title={vers ? "Sensitivität: Gebot gegen Verkauf" : "Sensitivität: Einkauf gegen Verkauf"}
        intro="Marge vor Steuer (auf Kosten) bei anderem Einkaufs- und Verkaufspreis. Fett = aktueller Ansatz."
      >
        <Tbl head={[`${vers ? "Gebot" : "Kauf"} ↓ / Verkauf →`, ...vs.map((x) => `${x.toLocaleString("de-AT")} €/m²`)]} rows={sens} />
      </Section>

      <Section title="Wenn der Verkauf länger dauert" intro="Mehr Monate bedeuten mehr Zinsen, laufende Kosten und gegebenenfalls Tilgung aus Eigenmitteln.">
        <Tbl head={["Verzögerung", "Dauer", "Zinsen", "Haltekosten", "Tilgung aus EK", "Belastung letzter Monat", "Gewinn", "Marge"]} rows={delay} />
      </Section>

      <Section title="Stresstest: alles läuft schlechter">
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, md: 3 }}><NumField label="Verkaufspreis" suffix="%" value={v.stVk} onChange={set("stVk")} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><NumField label="Sanierungskosten" suffix="%" value={v.stSan} onChange={set("stSan")} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><NumField label="Verkauf später" suffix="Mon." value={v.stMon} onChange={set("stMon")} /></Grid>
          <Grid size={{ xs: 6, md: 3 }}><NumField label="Zinsanstieg" suffix="%-P." value={v.stZins} onChange={set("stZins")} /></Grid>
        </Grid>
        <Tbl head={["Szenario", "Gesamtkosten", "Gewinn", "Marge", "Spitzenbedarf EK", "Mehr-EK zum Plan"]} rows={stress.map((s) => s.row)} />
        {num(v.verkM2) > 0 && (
          <Typography variant="body2">
            Der Verkaufspreis darf um <b>{pct(dBe)}</b> fallen, bevor ihr Verlust macht
            {dMin >= 0 ? `, und um ${pct(dMin)}, bevor die Mindestmarge verfehlt wird.` : "; die Mindestmarge ist schon im Plan verfehlt."}
          </Typography>
        )}
      </Section>

      <Section title="Liquiditätsplan" intro="Monatlicher Geldfluss von Ankauf bis Verkauf. Der Spitzenbedarf ist das Eigenkapital, das maximal gebunden ist.">
        <Grid container spacing={2}>
          {[
            ["Spitzenbedarf EK", eur(peak), `in Monat ${C.peakM}`],
            ["EK am Ankaufstag", eur(Math.max(0, -C.R[0].cum)), "Kaufpreis und Nebenkosten"],
            ["Kreditauszahlung", eur(r.kredit), v.pfandOn ? "mit Grundbucheintrag" : "ohne Grundbucheintrag"],
            ["Rückfluss beim Verkauf", eur(C.R[C.N].verk), "nach Kreditablöse"],
            ["Gewinn", eur(r.gewinn), `${pct(r.marge)} Marge`],
          ].map(([a, b, c]) => (
            <Grid key={a} size={{ xs: 6, md: 2.4 }}>
              <Typography variant="caption" color="text.secondary">{a}</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{b}</Typography>
              <Typography variant="caption" color="text.secondary">{c}</Typography>
            </Grid>
          ))}
        </Grid>
        <Bars cum={C.R.map((x) => x.cum)} peakM={C.peakM} />
        <Typography variant="caption" color="text.secondary">
          Balken = Kontostand des Objekts (unter null = gebundenes Eigenkapital, gold = Spitze).
        </Typography>
        <Tbl
          head={["Monat", "Ankauf + NK", "Sanierung", "Bankgebühren", "Zinsen", "Tilgung", "Haltekosten", "Bank zahlt", "Verkauf", "Saldo", "Kumuliert"]}
          rows={liqRows}
          total={["Summe", eur(T.ank), eur(T.san), eur(T.fin), eur(T.zins), eur(T.tilg), eur(T.halte), eur(T.bank), eur(T.verk), eur(T.net), ""]}
        />
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <NumField label="Liquiditätsreserve" suffix="% der Gesamtkosten" value={v.liqRes} onChange={set("liqRes")} helper={`= ${eur(res)} · Puffer, keine Kosten`} />
          </Grid>
        </Grid>
        <Stack spacing={0.5}>
          <Line label="Eigenkapital inkl. Reserve" value={eur(peak + res)} strong />
          <Line label={`KöSt-Rückstellung beim Verkauf (${num(v.koest)} %)`} value={eur(r.gewinn > 0 ? r.gewinn - r.netto : 0)} />
          <Line label="Frei verfügbar nach Verkauf und KöSt" value={eur(C.R[C.N].verk - (r.gewinn > 0 ? r.gewinn - r.netto : 0))} />
          <Line label="Gewährleistungsvorsorge" value={r.rl ? `${eur(r.rl)} · Kostenansatz für 3 Jahre Gewährleistung; Nicht Verbrauchtes ist Zusatzgewinn` : "nicht aktiviert"} />
          <Line label="Gewinn nach KöSt und KESt (bei Vollausschüttung)" value={eur(r.netto > 0 ? r.netto * (1 - kest) : r.netto)} />
        </Stack>
      </Section>

      <Section
        title="Gesellschafter: Gewinn, Haftung, Eigenkapital"
        intro="Aufteilung des Gewinns nach KöSt, Bürgschaft bei persönlicher Haftung und Eigenkapitalbeitrag je Gesellschafter."
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}><NumField label="KESt auf Ausschüttung" suffix="%" value={v.kestS} onChange={set("kestS")} /></Grid>
        </Grid>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Name", "Gewinn %", "Haftung %", "EK %", "Gewinn nach KöSt", "nach KESt", "Bürgschaft", "EK-Beitrag", "Nachschuss Stress"].map((h, i) => (
                  <TableCell key={h} align={i === 0 ? "left" : "right"} sx={{ whiteSpace: "nowrap", fontWeight: 700, py: 0.75 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {v.ges.map((s, idx) => (
                <TableRow key={idx}>
                  <TableCell sx={{ minWidth: 150 }}>
                    <TextField size="small" fullWidth value={s.name} onChange={(e) => patchGes(idx, { name: e.target.value })} />
                  </TableCell>
                  {(["gew", "haft", "ek"] as const).map((k) => (
                    <TableCell key={k} align="right" sx={{ width: 90 }}>
                      <TextField
                        size="small"
                        type="number"
                        value={Number.isFinite(s[k]) ? s[k] : ""}
                        onChange={(e) => patchGes(idx, { [k]: e.target.value === "" ? NaN : Number(e.target.value) })}
                      />
                    </TableCell>
                  ))}
                  {[gesRows[idx].a, gesRows[idx].b, gesRows[idx].c, gesRows[idx].e, gesRows[idx].n].map((x, i) => (
                    <TableCell key={i} align="right" sx={{ whiteSpace: "nowrap" }}>{eur(x)}</TableCell>
                  ))}
                </TableRow>
              ))}
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>Summe</TableCell>
                {(["gew", "haft", "ek"] as const).map((k) => (
                  <TableCell key={k} align="right" sx={{ fontWeight: 700, color: Math.abs(sums[k] - 100) > 0.01 ? "error.main" : undefined }}>
                    {sums[k].toLocaleString("de-AT")} %
                  </TableCell>
                ))}
                {(["a", "b", "c", "e", "n"] as const).map((k) => (
                  <TableCell key={k} align="right" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    {eur(gesRows.reduce((s, x) => s + x[k], 0))}
                  </TableCell>
                ))}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary">
          {offSum.length > 0 && (
            <Box component="span" sx={{ color: "error.main" }}>
              Summe {offSum.map((k) => ({ gew: "Gewinn", haft: "Haftung", ek: "Eigenkapital" })[k]).join(", ")} ergibt nicht 100 %.{" "}
            </Box>
          )}
          Bürgschaft = Kredit × Haftungsanteil. EK-Beitrag = (Spitzenbedarf + Reserve) × EK-Anteil. Nachschuss = zusätzliches EK im Stresstest „Alles zusammen“.
        </Typography>
      </Section>

      <Section
        title="Plan B: Halten statt Verkaufen"
        intro="Was das Objekt nach der Sanierung als Vermietung bringt. Rechnet die Sanierung netto (Vorsteuer abziehbar). AfA-Satz und Gebäudeanteil mit dem Steuerberater abstimmen."
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><NumField label="Nettomiete" suffix="€/m²" value={v.miete} onChange={set("miete")} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><NumField label="Leerstand / Mietausfall" suffix="%" value={v.leer} onChange={set("leer")} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><NumField label="Nicht umlegbare Kosten" suffix="€/Monat" value={v.nichtuml} onChange={set("nichtuml")} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><NumField label="Instandhaltung" suffix="€/m²·Jahr" value={v.instand} onChange={set("instand")} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><NumField label="Gebäudeanteil (AfA-Basis)" suffix="%" value={v.gebAnteil} onChange={set("gebAnteil")} /></Grid>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}><NumField label="Abschreibung (AfA) p. a." suffix="%" value={v.afa} onChange={set("afa")} /></Grid>
        </Grid>
        <Stack spacing={0.5}>
          <Line label="Investition (Sanierung netto)" value={eur(H.invest)} />
          <Line label="Jahresnettomiete" value={eur(H.mieteJ)} />
          <Line label="Bruttomietrendite" value={pct(H.brutto, 2)} />
          <Line label="Nettomietrendite" value={pct(H.nettoR, 2)} strong />
          <Line label="Abschreibung (AfA)" value={`${eur(H.afaJ)} von ${eur(H.afaBasis)}`} />
          <Line label="Zinsen Jahr 1" value={eur(H.zinsJ)} />
          <Line label="Ergebnis vor Steuern" value={eur(H.evs)} strong />
          <Line label="KöSt" value={eur(H.koest)} />
          <Line label={`Annuität (${num(v.laufzeit)} J.)`} value={eur(H.ann)} />
          <Line label="Cashflow nach Kredit und Steuer" value={eur(H.cf)} strong />
          <Line label="Zum Vergleich: Verkauf nach KöSt" value={`${eur(r.netto)} einmalig in ${r.M} Mon.`} />
        </Stack>
      </Section>

      <Section title="Bank-Kennzahlen">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <NumField label="Abschlag Beleihungswert" suffix="%" value={v.bwAbschlag} onChange={set("bwAbschlag")} helper="vom Marktwert nach Sanierung, bankabhängig" />
          </Grid>
        </Grid>
        <Stack spacing={0.5}>
          <Line label="Gesamtinvestition (ohne Vertrieb)" value={eur(invest)} />
          <Line label="Kreditbetrag" value={eur(r.kredit)} />
          <Line label="Eigenkapital (Spitzenbedarf)" value={eur(peak)} />
          <Line label="EK inkl. Liquiditätsreserve" value={eur(peak + res)} />
          <Line label="EK-Quote" value={pct(invest > 0 ? (peak / invest) * 100 : NaN)} strong />
          <Line label="Kredit zu Kaufpreis" value={pct(r.kp > 0 ? (r.kredit / r.kp) * 100 : NaN)} />
          <Line label="Kredit zu Gesamtkosten (LTC)" value={pct(invest > 0 ? (r.kredit / invest) * 100 : NaN)} />
          <Line label="Marktwert nach Sanierung" value={eur(r.vk)} strong />
          <Line label={`Beleihungswert (−${num(v.bwAbschlag)} %)`} value={eur(bw)} />
          <Line
            label="Beleihungsauslauf"
            value={<Box component="span" sx={{ color: ba > 1 ? "error.main" : ba > 0.8 ? "warning.main" : undefined }}>{pct(ba * 100)}</Box>}
          />
          <Line label="Laufzeit · tilgungsfrei" value={`${r.M} Mon. · ${r.G} Mon.`} strong />
          <Line label="Zinsen bis Verkauf" value={eur(r.zinsen)} />
          <Line label="Exit 1: Verkauf" value={`${eur(r.erloes)} · Marge ${pct(r.marge)}`} strong />
          <Line label="Exit 2: Halten" value={`${pct(H.nettoR, 2)} netto · Ratendeckung ${Number.isFinite(dscr) ? dscr.toLocaleString("de-AT", { maximumFractionDigits: 2 }) : "–"}`} />
          <Line label="Stresstest (alles zusammen)" value={`${pct(worst.x.marge)} Marge`} />
        </Stack>
      </Section>
    </Stack>
  );
}
