"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
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
import { Analyse } from "./ankauf/Analyse";
import { ObjektKopf, Zusatz } from "./ankauf/Zusatz";
import { pdfKreditanfrage, pdfObjektakte } from "./ankauf/pdf";
import { REF0, ZUS0, type Objekt, type Ref, type Zus } from "./ankauf/zusatzRechne";
import { download } from "./miete/export";
import {
  ampel, cash, D, eur, GEWERKE, limits, num, pct, rechne, SAN_NK,
  type Gewerk, type NkPos, type V,
} from "./ankauf/rechne";
import { Details, Line, NumField, Section, ampelColor } from "./ankauf/ui";

const DRAFT_KEY = "maison-ankauf-draft-v1";
const REF_KEY = "maison-bewertung-ref";
const OBJ_KEY = "maison-ankauf-objekte";

function loadDraft(): { v: V; gewerke: Gewerk[]; nk: NkPos[]; z: Zus; id: string | null } {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
    if (d?.v) return { v: { ...D, ...d.v }, gewerke: d.gewerke ?? GEWERKE, nk: d.nk ?? SAN_NK, z: { ...ZUS0, ...d.z }, id: d.id ?? null };
  } catch { /* ignorieren */ }
  return { v: D, gewerke: GEWERKE, nk: SAN_NK, z: ZUS0, id: null };
}
function loadRef(): Ref {
  try {
    const d = JSON.parse(localStorage.getItem(REF_KEY) || "null");
    if (d?.basis) return { ...REF0, ...d };
  } catch { /* ignorieren */ }
  return REF0;
}
function loadObjs(): Objekt[] {
  try { return JSON.parse(localStorage.getItem(OBJ_KEY) || "[]"); } catch { return []; }
}

export function AnkaufVerkaufRechner() {
  const [init] = useState(loadDraft);
  const [v, setV] = useState<V>(init.v);
  const [gewerke, setGewerke] = useState<Gewerk[]>(init.gewerke);
  const [nk, setNk] = useState<NkPos[]>(init.nk);
  const [z, setZState] = useState<Zus>(init.z);
  const [REF, setREFState] = useState<Ref>(loadRef);
  const [objs, setObjs] = useState<Objekt[]>(loadObjs);
  const [currentId, setCurrentId] = useState<string | null>(init.id);
  const [msg, setMsg] = useState("");
  const [armReset, setArmReset] = useState(false);
  const setZ = (p: Partial<Zus>) => setZState((o) => ({ ...o, ...p }));
  const setREF = (x: Ref) => {
    setREFState(x);
    try { localStorage.setItem(REF_KEY, JSON.stringify(x)); } catch { /* ignorieren */ }
  };
  useEffect(() => {
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ v, gewerke, nk, z, id: currentId })); } catch { /* ignorieren */ }
  }, [v, gewerke, nk, z, currentId]);
  const saveObj = (asNew: boolean) => {
    const x = rechne(v, gewerke, nk);
    let list = loadObjs(), id = currentId;
    const row = {
      name: z.name || "Ohne Namen", adresse: z.adresse, status: z.status, a: x.A, kp: x.kp, vk: x.vk, marge: x.marge, ziel: num(v.ziel),
      updatedAt: Date.now(), state: JSON.parse(JSON.stringify({ v, gewerke, nk, z })),
    };
    if (asNew || !id || !list.some((o) => o.id === id)) { id = "l" + Date.now().toString(36); list = [{ ...row, id }, ...list]; }
    else list = list.map((o) => (o.id === id ? { ...row, id: id! } : o));
    try { localStorage.setItem(OBJ_KEY, JSON.stringify(list)); setObjs(list); setCurrentId(id); setMsg("Gespeichert: " + row.name + " (in diesem Browser)"); }
    catch { setMsg("Speichern hat nicht geklappt."); }
  };
  const loadObj = (o: Objekt) => {
    setV({ ...D, ...o.state.v }); setGewerke(o.state.gewerke); setNk(o.state.nk); setZState({ ...ZUS0, ...o.state.z });
    setCurrentId(o.id); setMsg("Geladen: " + o.name); window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const delObj = (id: string) => {
    const list = loadObjs().filter((o) => o.id !== id);
    try { localStorage.setItem(OBJ_KEY, JSON.stringify(list)); } catch { /* ignorieren */ }
    setObjs(list); if (currentId === id) setCurrentId(null); setMsg("Objekt gelöscht.");
  };
  const resetAll = () => {
    if (!armReset) { setArmReset(true); setTimeout(() => setArmReset(false), 4000); return; }
    setArmReset(false); setV(D); setGewerke(GEWERKE); setNk(SAN_NK); setZState(ZUS0); setCurrentId(null); setMsg("Beispielwerte geladen, neues Objekt.");
  };
  const runPdf = async (fn: () => Promise<{ blob: Blob; name: string }>) => {
    setMsg("PDF wird erstellt …");
    try { const { blob, name } = await fn(); download(blob, name); setMsg("Heruntergeladen: " + name); } catch { setMsg("PDF hat nicht geklappt."); }
  };
  const set = <K extends keyof V>(k: K) => (x: V[K]) => setV((o) => ({ ...o, [k]: x }));
  const setGes = (idx: number, patch: Partial<V["ges"][number]>) =>
    setV((o) => ({ ...o, ges: o.ges.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }));

  const r = useMemo(() => rechne(v, gewerke, nk), [v, gewerke, nk]);
  const L = useMemo(() => limits(v, gewerke, nk), [v, gewerke, nk]);
  const C = useMemo(() => cash(v, gewerke, nk), [v, gewerke, nk]);

  const patchG = (idx: number, patch: Partial<Gewerk>) =>
    setGewerke((l) => l.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  const patchN = (idx: number, patch: Partial<NkPos>) =>
    setNk((l) => l.map((g, i) => (i === idx ? { ...g, ...patch } : g)));

  const ziel = num(v.ziel);
  const cls = ampel(r.marge, ziel);
  const vers = r.vers;
  const gewerkeBrutto = (v.ustOpt ? 1 : 1 + num(v.ust) / 100) * r.gewerkeSumNetto;
  const kmaxText = vers
    ? `Maximalgebot für ${pct(ziel, 0)} Marge: ${eur(L.kmax)}${num(v.schaetz) ? ` (${pct((L.kmax / num(v.schaetz)) * 100, 0)} vom Schätzwert)` : ""}.`
    : `Für ${pct(ziel, 0)} Marge höchstens ${Math.round(L.kmax / r.A).toLocaleString("de-AT")} €/m² zahlen (${eur(L.kmax)}).`;

  const rows: [string, string, boolean?][] = [
    ["Verkaufspreis", eur(r.vk)],
    ["Erlös" + (v.ustOpt ? " (ohne USt)" : ""), eur(r.erloes)],
    ["Gesamtkosten", eur(r.tot)],
    ["Gewinn vor Steuern", eur(r.gewinn), true],
    ["Gewinn nach KöSt", eur(r.netto)],
    ["Marge auf Gesamtkosten", pct(r.marge)],
    ["Eigenkapitalbedarf", eur(r.ek) + (vers ? ` + Vadium ${eur(Math.max(num(v.schaetz) * 0.1, 1000))}` : "")],
    ["Spitzenbedarf EK (Liquiditätsplan)", `${eur(C.peak)} · Monat ${C.peakM}`],
    ["Eigenkapitalrendite", `${pct(r.ek > 0 ? (r.gewinn / r.ek) * 100 : NaN)} · ${pct(r.roiPa)} p. a.`],
    ["Break-even Verkaufspreis", `${Math.round(L.vbe).toLocaleString("de-AT")} €/m²`],
    [`Mindestpreis für ${pct(ziel, 0)} Marge`, `${Math.round(L.vmin).toLocaleString("de-AT")} €/m²`],
  ];

  const kosten: [string, number][] = [
    [vers ? "Meistbot" : "Ankaufspreis", r.kp],
    ["Ankaufsnebenkosten", r.kaufNk],
    ...(r.sonder ? ([["Sonderumlage", r.sonder]] as [string, number][]) : []),
    [v.ustOpt ? "Sanierung (netto)" : "Sanierung (brutto)", r.san],
    ["Finanzierungsnebenkosten", r.finNk],
    [`Zinsen (${r.M} Monate)`, r.zinsen],
    ["Betriebskosten, Strom & Co.", r.halte],
    ["Verkaufsprovision", r.prov],
    ...(r.rl ? ([["Gewährleistungsvorsorge", r.rl]] as [string, number][]) : []),
  ];

  return (
    <Stack spacing={3}>
      <ObjektKopf
        z={z} setZ={setZ} msg={msg} armReset={armReset}
        onSave={() => saveObj(false)} onSaveNew={() => saveObj(true)} onReset={resetAll}
        onPdf={() => runPdf(() => pdfObjektakte(v, gewerke, nk, z))} onBank={() => runPdf(() => pdfKreditanfrage(v, gewerke, nk, z))}
      />
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <Stack spacing={3}>
            <Section title="Ankauf">
              <ToggleButtonGroup exclusive size="small" value={v.einkauf} onChange={(_, m) => m && set("einkauf")(m)}>
                <ToggleButton value="frei">Freihändiger Kauf</ToggleButton>
                <ToggleButton value="versteigerung">Versteigerung</ToggleButton>
              </ToggleButtonGroup>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <NumField
                    label={vers ? "Geplantes Meistbot" : "Ankaufspreis"}
                    suffix="€"
                    value={v.kauf}
                    onChange={set("kauf")}
                    helper={r.A > 0 ? `${Math.round(r.kp / r.A).toLocaleString("de-AT")} €/m²` : undefined}
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <NumField label="Nutzfläche" suffix="m²" value={v.flaeche} onChange={set("flaeche")} />
                </Grid>
                {vers && (
                  <>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <NumField
                        label="Schätzwert (laut Gutachten)"
                        suffix="€"
                        value={v.schaetz}
                        onChange={set("schaetz")}
                        helper={num(v.schaetz) ? `Meistbot = ${pct((r.kp / num(v.schaetz)) * 100, 0)} vom Schätzwert` : undefined}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <NumField
                        label="Risikoaufschlag Sanierung"
                        suffix="%"
                        value={v.risiko}
                        onChange={set("risiko")}
                        helper="keine Besichtigung, keine Gewährleistung"
                      />
                    </Grid>
                  </>
                )}
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
                      <NumField label="Vertragserrichtung / Treuhand (zzgl. USt)" suffix="%" value={v.notar} onChange={set("notar")} helper={eur(r.notar)} />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <NumField
                        label={vers ? "Räumung / Schlüsseldienst" : "Sonstiges (Räumung, Schlüsseldienst …)"}
                        suffix="€"
                        value={v.kaufSonst}
                        onChange={set("kaufSonst")}
                      />
                    </Grid>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <NumField
                        label="Sonderumlage, euer Anteil"
                        suffix="€"
                        value={v.sonder}
                        onChange={set("sonder")}
                        helper="beschlossen oder absehbar laut Protokollen"
                      />
                    </Grid>
                  </Grid>
                  {!vers && (
                    <>
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
                    </>
                  )}
                </Stack>
              </Details>
            </Section>

            <Section title="Steuern & Ziel">
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <NumField label="USt-Satz" suffix="%" value={v.ust} onChange={set("ust")} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <NumField label="Körperschaftsteuer" suffix="%" value={v.koest} onChange={set("koest")} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <NumField label="Mindestmarge vor Steuer (auf Kosten)" suffix="%" value={v.ziel} onChange={set("ziel")} />
                </Grid>
              </Grid>
              <FormControlLabel
                control={<Switch checked={v.ustOpt} onChange={(e) => set("ustOpt")(e.target.checked)} />}
                label="Option zur Umsatzsteuer (Vorsteuer aus Sanierung und Makler zurück, dafür USt auf den Verkaufspreis)"
              />
            </Section>

            <Section title="Sanierung">
              <ToggleButtonGroup exclusive size="small" value={v.sanModus} onChange={(_, m) => m && set("sanModus")(m)}>
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
                sum={`${eur(gewerkeBrutto)} · ${Math.round(gewerkeBrutto / r.A).toLocaleString("de-AT")} €/m²`}
              >
                <Stack spacing={2}>
                  {v.sanModus === "pausch" && (
                    <Typography variant="caption" color="text.secondary">
                      Aktuell zählt der Pauschalwert oben. Auf „Nach Gewerken“ umschalten, damit diese Aufstellung in die Rechnung eingeht.
                    </Typography>
                  )}
                  {gewerke.map((g, idx) => (
                    <Grid container spacing={1} key={idx} sx={{ alignItems: "center" }}>
                      <Grid size={{ xs: 12, sm: 2 }}>
                        <TextField fullWidth size="small" label="Gewerk" value={g.n} onChange={(e) => patchG(idx, { n: e.target.value })} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 1.4 }}>
                        <TextField fullWidth size="small" label="Firma" value={g.firma ?? ""} onChange={(e) => patchG(idx, { firma: e.target.value })} />
                      </Grid>
                      <Grid size={{ xs: 4, sm: 1.1 }}>
                        <TextField fullWidth size="small" type="number" label="Menge" value={Number.isFinite(g.menge) ? g.menge : ""} onChange={(e) => patchG(idx, { menge: e.target.value === "" ? NaN : Number(e.target.value) })} />
                      </Grid>
                      <Grid size={{ xs: 4, sm: 1.1 }}>
                        <TextField fullWidth size="small" label="Einh." value={g.einh} onChange={(e) => patchG(idx, { einh: e.target.value })} />
                      </Grid>
                      <Grid size={{ xs: 4, sm: 1.3 }}>
                        <TextField fullWidth size="small" type="number" label="Mat. €/E" value={Number.isFinite(g.mat) ? g.mat : ""} onChange={(e) => patchG(idx, { mat: e.target.value === "" ? NaN : Number(e.target.value) })} />
                      </Grid>
                      <Grid size={{ xs: 4, sm: 1.3 }}>
                        <TextField fullWidth size="small" type="number" label="Lohn €/E" value={Number.isFinite(g.lohn) ? g.lohn : ""} onChange={(e) => patchG(idx, { lohn: e.target.value === "" ? NaN : Number(e.target.value) })} />
                      </Grid>
                      <Grid size={{ xs: 4, sm: 1.2 }}>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {eur(num(g.menge) * (num(g.mat) + num(g.lohn)))}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 4, sm: 1.4 }}>
                        <TextField fullWidth size="small" type="number" label="Ist €" value={g.ist ? g.ist : ""} onChange={(e) => patchG(idx, { ist: e.target.value === "" ? 0 : Number(e.target.value) })} />
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
                    <Line
                      label={v.ustOpt ? "USt (Vorsteuer, wird zurückgeholt)" : `USt ${v.ust} % (nicht rückholbar)`}
                      value={eur(r.gewerkeSumNetto * (num(v.ust) / 100))}
                    />
                    <Line label={v.ustOpt ? "Summe netto (zählt als Kosten)" : "Summe brutto"} value={eur(v.ustOpt ? r.gewerkeSumNetto : gewerkeBrutto)} strong />
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
              <Details title="Zeitplan (für den Liquiditätsplan)" sum={`Start Monat ${num(v.mVor)} · ${num(v.mSan)} Monate`}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <NumField label="Bis Sanierungsstart" suffix="Monate" value={v.mVor} onChange={set("mVor")} helper="Übergabe, Planung, Meldung" />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <NumField label="Sanierungsdauer" suffix="Monate" value={v.mSan} onChange={set("mSan")} helper="Sanierungskosten werden gleichmäßig verteilt" />
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
                    label="Pfandrecht ins Grundbuch (aus = kurze Zwischenfinanzierung nur mit Bankzusage)"
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
              <Typography variant="body2" color="text.secondary">
                {r.M > r.G
                  ? `Tilgung startet vor dem Verkauf: ab Monat ${r.G + 1} ${eur(r.rate)} pro Monat (Zins und Tilgung). Bis zum Verkauf getilgt: ${eur(r.tilg)}, Restschuld ${eur(r.rest)}.`
                  : `Verkauf vor Tilgungsstart: bis zum Verkauf nur Zinsen (ca. ${eur(r.kredit * r.i)} pro Monat). Der Kredit wird aus dem Erlös abgelöst.`}
              </Typography>
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
              <FormControlLabel
                control={<Switch checked={v.rlOn} onChange={(e) => set("rlOn")(e.target.checked)} />}
                label="Gewährleistungsvorsorge 1 % vom Verkaufspreis (als Kosten angesetzt)"
              />
            </Section>
          </Stack>
        </Grid>

        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={3} sx={{ position: { lg: "sticky" }, top: { lg: 88 } }}>
            <Card sx={{ p: 3, bgcolor: "primary.main", color: "common.white" }}>
              <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                <Typography variant="overline" sx={{ color: "secondary.light" }}>
                  Ergebnis
                </Typography>
                <Chip
                  size="small"
                  label={cls === "good" ? "Hürde erreicht" : cls === "warn" ? `unter ${pct(ziel, 0)}` : "Verlust"}
                  color={cls === "good" ? "success" : cls === "warn" ? "warning" : "error"}
                />
              </Stack>
              <Stack divider={<Divider flexItem sx={{ borderColor: "rgba(255,255,255,0.12)" }} />} sx={{ mt: 1 }}>
                {rows.map(([k, val, strong]) => (
                  <Stack key={k} direction="row" sx={{ py: 1.25, gap: 2, justifyContent: "space-between" }}>
                    <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)" }}>
                      {k}
                    </Typography>
                    <Typography variant={strong ? "h6" : "body2"} sx={{ fontWeight: 700, textAlign: "right", color: strong ? "secondary.main" : "inherit" }}>
                      {val}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              <Typography variant="body2" sx={{ mt: 2, color: "rgba(255,255,255,0.8)" }}>
                {kmaxText}
              </Typography>
              <Typography variant="caption" sx={{ display: "block", mt: 1.5, color: "rgba(255,255,255,0.55)" }}>
                Gewinn vor KöSt/ImmoESt. Alle Werte sind Platzhalter und mit dem Steuerberater abzustimmen.
              </Typography>
            </Card>

            <Card sx={{ p: 3 }}>
              <Typography variant="overline" color="text.secondary">
                Kostenaufstellung
              </Typography>
              <Stack spacing={0.75} sx={{ mt: 1 }}>
                {kosten.map(([k, val]) => (
                  <Line key={k} label={k} value={`${eur(val)} · ${pct(r.tot > 0 ? (val / r.tot) * 100 : 0)}`} />
                ))}
                <Divider />
                <Line label="Gesamtkosten" value={eur(r.tot)} strong />
                <Line label="Erlös" value={eur(r.erloes)} />
                <Typography variant="caption" sx={{ fontWeight: 800, color: ampelColor[cls] }}>
                  Gewinn vor Steuern: {eur(r.gewinn)} · Marge vor Steuer {pct(r.marge)}
                </Typography>
                <Divider />
                <Line label="Kredit" value={eur(r.kredit)} hint={`Rate ${eur(r.rate)} / Monat`} />
                <Line label={`Getilgt in ${r.M} Monaten`} value={eur(r.tilg)} />
                <Line label="Restschuld bei Verkauf" value={eur(r.rest)} />
              </Stack>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      <Analyse v={v} set={set} setGes={setGes} g={gewerke} nk={nk} />
      <Zusatz
        v={v} set={set} setGes={setGes} gewerke={gewerke} nk={nk} z={z} setZ={setZ} REF={REF} setREF={setREF}
        objs={objs} currentId={currentId} onLoad={loadObj} onDelete={delObj}
      />
    </Stack>
  );
}
