// Ergänzungen zum Ankauf-Rechner (aus dem früheren Fix-&-Flip-Rechner): Bewertung, Vergleichsobjekte,
// Freigaben, Plan/Ist, Objektliste, Portfolio und Preisspiegel. Reine Funktionen, keine UI.
import { cash, num, rechne, type Ergebnis, type Gewerk, type NkPos, type V } from "./rechne";

export const STATI = ["In Prüfung", "Angebot gelegt", "Gekauft", "In Sanierung", "Im Verkauf", "Verkauft", "Abgelehnt"];

export type Vergleich = { lage: string; m2: number; preis: number; quelle: string };
export type Plan = { am: string; ank: number; san: number; fin: number; halte: number; vertr: number; mehr: number; tot: number; erl: number; gew: number; marge: number; M: number };
export type BwMode = "realistisch" | "neutral" | "optimistisch";

export type Zus = {
  name: string; adresse: string; status: string;
  haftrl: number; rlHaus: number; nwAnteil: number;
  bwMode: BwMode; bwRegion: string; bwBezirk: string; bwBau: string; bwAussen: boolean; bwLage: string; bwVor: string; bwNach: string;
  bwStock: string; bwEnergie: string; bwStoer: string; bwStell: number; bwGewicht: number;
  vergleiche: Vergleich[];
  frKalkBy: string; frKalkAm: string; frFinBy: string; frFinAm: string; frBank: boolean; frLimit: number; quorum: number; frBeschlAm: string;
  plan: Plan | null; istVk: number; istDauer: number; istMehr: number;
};

export const ZUS0: Zus = {
  name: "Beispiel 60 m² Graz-Jakomini", adresse: "", status: "In Prüfung",
  haftrl: 5, rlHaus: 0, nwAnteil: 0,
  bwMode: "realistisch", bwRegion: "Graz-Stadt", bwBezirk: "VI. Jakomini", bwBau: "bis 1960", bwAussen: false, bwLage: "mittel",
  bwVor: "unsaniert", bwNach: "saniert", bwStock: "1.–2. OG", bwEnergie: "C/D", bwStoer: "keine", bwStell: 0, bwGewicht: 50,
  vergleiche: [
    { lage: "Beispiel: Jakomini, Altbau saniert", m2: 58, preis: 224000, quelle: "Beispiel – ersetzen" },
    { lage: "Beispiel: Jakomini, 2. OG", m2: 64, preis: 236000, quelle: "Beispiel – ersetzen" },
    { lage: "Beispiel: St. Leonhard", m2: 61, preis: 238000, quelle: "Beispiel – ersetzen" },
  ],
  frKalkBy: "", frKalkAm: "", frFinBy: "", frFinAm: "", frBank: false, frLimit: 0, quorum: 2, frBeschlAm: "",
  plan: null, istVk: 0, istDauer: 0, istMehr: 0,
};

export const median = (a: number[]) => {
  const s = a.slice().sort((x, y) => x - y), n = s.length;
  return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : NaN;
};

// ---------------------------------------------------------------------------
// Bewertung (Vergleichswert-Schätzung aus amtlichen Transaktionsdaten)
// ---------------------------------------------------------------------------
export type Ref = {
  stand: string; quelle: string; markt: number; marktQ: string; at: number; regionen: string[];
  basis: Record<string, number[][]>;
  bezirke: [string, number, string][];
  zustand: Record<string, [number, number]>;
  lage: Record<string, number>; stock: Record<string, number>; energie: Record<string, number>; stoer: Record<string, number>;
  spanne: number;
  modi: Record<BwMode, { up: number; down: number; markt: number; adj: number }>;
};

export const REF0: Ref = {
  stand: "2026-11-01",
  quelle: "Basis: Statistik Austria / Land Steiermark, Immobiliendurchschnittspreise auf regionaler Ebene 2021–2025 (Kaufverträge aus dem Grundbuch, Wohnungseigentum, geometrisches Mittel). Bezirksfaktoren Graz: Angebotsdaten grazjournal (06/2026) und IMMOXX (10/2026), relativ zum Graz-Median.",
  markt: 4.06, marktQ: "WKO Steiermark Preisspiegel 2026: gebrauchte Wohnungen Graz +4,06 %",
  at: 4162,
  regionen: ["Graz-Stadt", "Graz-Umgebung", "Deutschlandsberg", "Leibnitz", "Leoben", "Liezen", "Murau", "Voitsberg", "Weiz", "Murtal", "Bruck-Mürzzuschlag", "Hartberg-Fürstenfeld", "Südoststeiermark", "Österreich (andere)"],
  /* je Region: 3 Bauperioden × [ohne <58, ohne 58–78, ohne >78, mit <58, mit 58–78, mit >78] €/m² */
  basis: {
    "Graz-Stadt": [[2625, 2407, 2562, 3223, 2954, 3145], [2669, 2447, 2605, 2794, 2561, 2726], [3861, 3539, 3768, 4312, 3952, 4208]],
    "Graz-Umgebung": [[1919, 1681, 1716, 2948, 2583, 2636], [2158, 1891, 1930, 2317, 2030, 2072], [3153, 2763, 2819, 3759, 3293, 3360]],
    "Deutschlandsberg": [[1211, 1175, 1148, 1219, 1183, 1157], [1584, 1537, 1502, 1698, 1648, 1611], [2622, 2545, 2487, 3138, 3046, 2977]],
    "Leibnitz": [[1617, 1600, 1557, 2065, 2043, 1988], [1788, 1769, 1721, 1723, 1705, 1659], [2790, 2760, 2685, 2998, 2966, 2886]],
    "Leoben": [[1255, 1211, 1253, 1488, 1436, 1486], [1288, 1242, 1286, 1414, 1364, 1412], [2051, 1978, 2048, 2620, 2527, 2616]],
    "Liezen": [[1773, 1525, 1532, 2462, 2118, 2128], [2351, 2023, 2032, 2563, 2206, 2215], [4722, 4063, 4081, 5064, 4358, 4376]],
    "Murau": [[1305, 1149, 1342, 1672, 1472, 1720], [1661, 1462, 1708, 1901, 1674, 1956], [2653, 2335, 2729, 3397, 2990, 3494]],
    "Voitsberg": [[1157, 1218, 1280, 1395, 1469, 1544], [1203, 1266, 1331, 1322, 1391, 1463], [1761, 1854, 1949, 2477, 2607, 2741]],
    "Weiz": [[1383, 1249, 1181, 1653, 1492, 1411], [1855, 1674, 1583, 2145, 1936, 1831], [2921, 2636, 2493, 3323, 2999, 2836]],
    "Murtal": [[983, 937, 947, 1232, 1175, 1187], [1059, 1010, 1020, 1142, 1089, 1100], [2218, 2115, 2137, 2194, 2093, 2114]],
    "Bruck-Mürzzuschlag": [[943, 793, 845, 1847, 1552, 1654], [1377, 1158, 1234, 1566, 1317, 1403], [2567, 2158, 2300, 2721, 2287, 2437]],
    "Hartberg-Fürstenfeld": [[1563, 1524, 1332, 1795, 1750, 1529], [1658, 1616, 1413, 1667, 1626, 1421], [2607, 2541, 2221, 3129, 3051, 2666]],
    "Südoststeiermark": [[1689, 1566, 1412, 1816, 1684, 1517], [1566, 1452, 1309, 1818, 1685, 1519], [2358, 2186, 1971, 3064, 2841, 2561]],
  },
  bezirke: [["I. Innere Stadt", 1.10, "Angebot 06/2026"], ["II. St. Leonhard", 1.05, "Annahme – prüfen"], ["III. Geidorf", 1.05, "Annahme – prüfen"], ["IV. Lend", 0.99, "Angebot Lend+Gries 06/2026"], ["V. Gries", 0.99, "Angebot Lend+Gries 06/2026"], ["VI. Jakomini", 0.92, "Annahme (PLZ 8010) – prüfen"], ["VII. Liebenau", 0.89, "Angebot 06/2026"], ["VIII. St. Peter", 1.16, "Angebot 06/2026"], ["IX. Waltendorf", 1.18, "Angebot 06/2026"], ["X. Ries", 0.86, "PLZ 8047, kleine Stichprobe"], ["XI. Mariatrost", 0.95, "PLZ 8044"], ["XII. Andritz", 1.15, "Angebot 06/2026"], ["XIII. Gösting", 0.75, "PLZ 8051, kleine Stichprobe"], ["XIV. Eggenberg", 0.85, "Annahme – prüfen"], ["XV. Wetzelsdorf", 0.91, "PLZ 8052, kleine Stichprobe"], ["XVI. Straßgang", 0.90, "PLZ 8054, kleine Stichprobe"], ["XVII. Puntigam", 0.81, "Angebot 06/2026"]],
  /* Zustand: [Abschlag %, Verjüngung % Richtung Baujahr ab 1991] */
  zustand: { "unsaniert": [-10, 0], "teilsaniert": [0, 0], "saniert": [0, 50], "kernsaniert / neuwertig": [-5, 100] },
  lage: { "einfach": -7, "mittel": 0, "gut": 5, "sehr gut": 10 },
  stock: { "EG ohne Garten": -5, "EG mit Garten": 3, "1.–2. OG": 0, "ab 3. OG mit Lift": 3, "ab 3. OG ohne Lift": -5, "Dachgeschoß": 5 },
  energie: { "A/B": 3, "C/D": 0, "E bis G": -5 },
  stoer: { "keine": 0, "leicht (Straße, Gewerbe)": -5, "stark (Hauptverkehr, Bahn)": -10 },
  spanne: 7,
  modi: { realistisch: { up: 0.5, down: 1, markt: 0.5, adj: -5 }, neutral: { up: 1, down: 1, markt: 1, adj: 0 }, optimistisch: { up: 1, down: 0.5, markt: 1, adj: 3 } },
};

export const BAU = ["bis 1960", "1961–1990", "ab 1991"];
export const MODENAME: Record<BwMode, string> = { realistisch: "Streng realistisch", neutral: "Neutral", optimistisch: "Optimistisch" };
const gk = (A: number) => (A < 58 ? 0 : A <= 78 ? 1 : 2);
const n0 = (v: number) => Math.round(v).toLocaleString("de-AT");

export type Bewertung = { base: number; hin: string; adj: [string, number, number][]; qm: number; lo: number; hi: number; tot: number };

export function bewert(REF: Ref, z: Zus, flaeche: number, zustand: string): Bewertung {
  const A = Math.max(num(flaeche), 1), reg = z.bwRegion || "Graz-Stadt", bi = Math.max(0, BAU.indexOf(z.bwBau)), out = z.bwAussen ? 3 : 0;
  const md = REF.modi[z.bwMode] || REF.modi.realistisch;
  const L: [string, number, number][] = [];
  let base: number, hin: string;
  const zz = REF.zustand[zustand] || [0, 0];
  if (REF.basis[reg]) {
    const row = REF.basis[reg], own = row[bi][out + gk(A)], neu = row[2][out + gk(A)];
    base = own + ((neu - own) * (zz[1] || 0)) / 100;
    hin = `${reg}, ${BAU[bi]}, ${["unter 58", "58–78", "über 78"][gk(A)]} m², ${z.bwAussen ? "mit" : "ohne"} Außenfläche: ${n0(own)} €/m²` + (zz[1] ? ` · ${zz[1]} % Richtung Neubauniveau ${n0(neu)} €/m²` : "");
  } else {
    base = REF.at; hin = `Österreich-Median ${n0(REF.at)} €/m² (grobe Näherung, ohne Baujahr)`;
  }
  if (zz[0]) L.push(["Zustand: " + zustand, zz[0], 1]);
  L.unshift(["Marktentwicklung seit Datenstand", num(REF.markt) * md.markt, 0]);
  if (reg === "Graz-Stadt") { const b = REF.bezirke.find((x) => x[0] === z.bwBezirk); if (b) L.push(["Bezirk " + b[0] + " (" + b[2] + ")", (b[1] - 1) * 100, 0]); }
  const sc = (val: string, grp: Record<string, number>) => { const v = grp[val]; if (v !== undefined) L.push([val, v, 1]); };
  sc(z.bwLage, REF.lage); sc(z.bwStock, REF.stock); sc(z.bwEnergie, REF.energie); sc(z.bwStoer, REF.stoer);
  const adj = L.map(([nm, p, s]) => { let q = p; if (s === 1) q = p > 0 ? p * md.up : p * md.down; return [nm, p, q] as [string, number, number]; });
  if (md.adj) adj.push(["Bewertungsmodus " + MODENAME[z.bwMode || "realistisch"], md.adj, md.adj]);
  const qm = adj.reduce((v, a) => v * (1 + a[2] / 100), base);
  return { base, hin, adj, qm, lo: qm * (1 - REF.spanne / 100), hi: qm * (1 + REF.spanne / 100), tot: qm * A + num(z.bwStell) };
}

// ---------------------------------------------------------------------------
// Freigaben, Rücklagen, Plan/Ist
// ---------------------------------------------------------------------------
export const fmtD = (d: string) => (d ? new Date(d + "T12:00:00").toLocaleDateString("de-AT") : "");
export const reserve = (v: V, x: Ergebnis) => (x.tot * num(v.liqRes)) / 100;

export function freigabe(v: V, z: Zus, x: Ergebnis) {
  const ziel = num(v.ziel), ges = v.ges || [];
  const ja = ges.filter((g) => g.vote === "ja").length, nein = ges.filter((g) => g.vote === "nein").length, q = Math.max(1, num(z.quorum) || 1);
  const pctS = (m: number) => m.toLocaleString("de-AT", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " %";
  const L: [boolean, string][] = [
    [x.marge >= ziel - 1e-9, `Kalkulation erreicht die Mindestmarge (${pctS(x.marge)})`],
    [!!z.frKalkBy, z.frKalkBy ? `Kalkulation bestätigt: ${z.frKalkBy} ${fmtD(z.frKalkAm)}` : "Kalkulation noch nicht bestätigt"],
    [!!z.frFinBy, z.frFinBy ? `Finanzierung freigegeben: ${z.frFinBy} ${fmtD(z.frFinAm)}` : "Finanzierung noch nicht freigegeben"],
    [z.frBank, z.frBank ? "Schriftliche Bankzusage liegt vor" : "Bankzusage fehlt – sonst Finanzierungsvorbehalt ins Anbot"],
    [ja >= q, `Beschluss: ${ja} Ja, ${nein} Nein, nötig ${q}${z.frBeschlAm ? " · " + fmtD(z.frBeschlAm) : ""}`],
  ];
  if (x.vers) {
    const gebot = num(v.kauf), lim = num(z.frLimit);
    L.push([lim > 0 && gebot <= lim, lim > 0 ? `Gebot ${Math.round(gebot).toLocaleString("de-AT")} € ${gebot <= lim ? "innerhalb" : "über"} Bieterlimit ${Math.round(lim).toLocaleString("de-AT")} €` : "Bieterlimit noch nicht beschlossen"]);
  }
  return { L, ok: L.every((l) => l[0]) };
}

export const cats = (x: Ergebnis): Omit<Plan, "am"> => ({
  ank: x.kp + x.kaufNk + x.sonder, san: x.san, fin: x.finNk + x.zinsen, halte: x.halte, vertr: x.prov + x.rl, mehr: x.mehr,
  tot: x.tot, erl: x.erloes, gew: x.gewinn, marge: x.marge, M: x.M,
});

export function istCalc(v: V, z: Zus, g: Gewerk[], nk: NkPos[]) {
  const x = rechne(v, g, nk);
  return rechne(v, g, nk, {
    mehr: num(z.istMehr), ist: true,
    ...(num(z.istVk) > 0 ? { vk: num(z.istVk) } : {}),
    ...(num(z.istDauer) > 0 ? { extraM: num(z.istDauer) - x.M } : {}),
  });
}

// ---------------------------------------------------------------------------
// Objektliste, Portfolio, Preisspiegel
// ---------------------------------------------------------------------------
export type Objekt = {
  id: string; name: string; adresse: string; status: string; a: number; kp: number; vk: number; marge: number; ziel: number; updatedAt: number;
  state: { v: V; gewerke: Gewerk[]; nk: NkPos[]; z: Zus };
};

export function portfolio(objs: Objekt[]) {
  const committed = ["Gekauft", "In Sanierung", "Im Verkauf"], pipe = ["In Prüfung", "Angebot gelegt"];
  const list = objs.filter((o) => o.state).map((o) => {
    const { v, gewerke, nk, z } = o.state, x = rechne(v, gewerke, nk), c = cash(v, gewerke, nk), peak = c.peak + reserve(v, x);
    const ist = o.status === "Verkauft" ? istCalc(v, z, gewerke, nk) : null;
    return { o, v, z, x, peak, ist, F: freigabe(v, z, x) };
  });
  return { C: list.filter((l) => committed.includes(l.o.status)), P: list.filter((l) => pipe.includes(l.o.status)), V: list.filter((l) => l.o.status === "Verkauft") };
}

export function preisspiegel(objs: Objekt[]) {
  const agg: Record<string, { ep: number[]; einh: Set<string>; n: number; firmen: Set<string> }> = {};
  objs.forEach((o) => (o.state?.gewerke || []).forEach((g) => {
    const key = (g.n || "").trim();
    if (!key) return;
    const a = agg[key] || (agg[key] = { ep: [], einh: new Set(), n: 0, firmen: new Set() });
    if (num(g.mat) + num(g.lohn) > 0) { a.ep.push(num(g.mat) + num(g.lohn)); a.einh.add(g.einh || ""); a.n++; }
    if (g.firma) a.firmen.add(g.firma);
  }));
  return Object.keys(agg).sort().map((k) => {
    const a = agg[k];
    return { gewerk: k, einh: [...a.einh].join(", "), ep: a.ep.length ? a.ep.reduce((x, y) => x + y, 0) / a.ep.length : NaN, n: a.n, firmen: [...a.firmen].join(", ") };
  });
}
