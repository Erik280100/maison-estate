import { KREDIT_DEFAULTS } from "../kredit/kredit";

// ---------------------------------------------------------------------------
// Standardwerte
// Kauf-/Kreditnebenkosten: identisch mit dem Finanzierungsrechner (AT, Stand 2026).
// Sanierung: Richtwert 1.000 €/m² brutto (Mitte zwischen mittlerer Sanierung
// 700–1.000 und Kernsanierung 1.000–1.500 €/m²). Gewerke wie im Fix-&-Flip-Rechner.
// Alles sind Platzhalter und im Formular änderbar.
// ---------------------------------------------------------------------------

export type Gewerk = { n: string; menge: number; einh: string; mat: number; lohn: number };
export type NkPos = { n: string; betrag: number };
export type Gesellschafter = { name: string; gew: number; haft: number; ek: number };

export const GEWERKE: Gewerk[] = [
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

export const SAN_NK: NkPos[] = [
  { n: "Container / Entsorgung", betrag: 0 },
  { n: "Planung / Statiker", betrag: 0 },
  { n: "Energieausweis neu", betrag: 350 },
  { n: "Meldung / Bewilligung Baubehörde", betrag: 0 },
  { n: "Baustellenkoordinator (BauKG)", betrag: 0 },
  { n: "Prüfbefunde Elektro / Gas", betrag: 350 },
  { n: "Endreinigung", betrag: 300 },
];

export const GESELLSCHAFTER: Gesellschafter[] = [
  { name: "Gesellschafter 1", gew: 40, haft: 40, ek: 40 },
  { name: "Gesellschafter 2", gew: 30, haft: 30, ek: 30 },
  { name: "Gesellschafter 3", gew: 30, haft: 30, ek: 30 },
];

export const D = {
  flaeche: 60,
  einkauf: "frei" as "frei" | "versteigerung",
  kauf: 150000,
  schaetz: 160000,
  risiko: 15,
  // Ankaufsnebenkosten
  grest: KREDIT_DEFAULTS.grunderwerbsteuerPct,
  eintr: KREDIT_DEFAULTS.grundbuchEintragungPct,
  notar: 1.5,
  maklerOn: false,
  makler: KREDIT_DEFAULTS.maklerprovisionPct,
  kaufSonst: 1500,
  sonder: 0,
  // Steuern
  ust: KREDIT_DEFAULTS.ustPct,
  ustOpt: false,
  koest: 23,
  ziel: 10,
  // Sanierung
  sanModus: "pausch" as "pausch" | "gewerke",
  sanM2: 1000,
  puffer: 10,
  // Zeitplan
  monate: 9,
  mVor: 1,
  mSan: 3,
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
  verkM2: 4500,
  provision: 2,
  provisionUst: false,
  rlOn: true,
  // Stresstest
  stVk: -5,
  stSan: 15,
  stMon: 3,
  stZins: 1,
  // Reserve / Bank
  liqRes: 10,
  bwAbschlag: 20,
  // Plan B: Halten
  miete: 11,
  leer: 3,
  nichtuml: 30,
  instand: 10,
  gebAnteil: 70,
  afa: 1.5,
  // Gesellschafter
  kestS: 27.5,
  ges: GESELLSCHAFTER,
};

export type V = typeof D;

export type Opts = { kp?: number; vkM2?: number; sanF?: number; extraM?: number; zinsAdd?: number };

export const num = (x: number) => (Number.isFinite(x) ? x : 0);
export const eur = (x: number) =>
  `${x < -0.5 ? "−" : ""}${Math.round(Math.abs(x)).toLocaleString("de-AT")} €`;
export const pct = (x: number, d = 1) =>
  Number.isFinite(x)
    ? `${x < 0 ? "−" : ""}${Math.abs(x).toLocaleString("de-AT", { minimumFractionDigits: d, maximumFractionDigits: d })} %`
    : "–";

export function rechne(v: V, gewerke: Gewerk[], nk: NkPos[], o: Opts = {}) {
  const A = Math.max(num(v.flaeche), 0.0001);
  const p = (x: number) => num(x) / 100;
  const ustF = 1 + p(v.ust);
  const ustOpt = v.ustOpt;
  const vers = v.einkauf === "versteigerung";

  // Ankauf
  const kp = o.kp !== undefined ? o.kp : num(v.kauf);
  const grest = kp * p(v.grest);
  const eintr = kp * p(v.eintr);
  const notar = kp * p(v.notar);
  const makler = !vers && v.maklerOn ? kp * p(v.makler) * (ustOpt ? 1 : ustF) : 0;
  const kaufSonst = num(v.kaufSonst);
  const kaufNk = grest + eintr + notar + makler + kaufSonst;
  const sonder = num(v.sonder);

  // Sanierung
  const gewerkeNetto = gewerke.reduce((s, g) => s + num(g.menge) * (num(g.mat) + num(g.lohn)), 0);
  const gewerkePuffer = gewerkeNetto * p(v.puffer);
  const sanNkNetto = nk.reduce((s, n) => s + num(n.betrag), 0);
  const gewerkeSumNetto = gewerkeNetto + gewerkePuffer + sanNkNetto;
  let sanNet = v.sanModus === "pausch" ? (num(v.sanM2) * A) / ustF : gewerkeSumNetto;
  if (vers) sanNet *= 1 + p(v.risiko);
  sanNet *= o.sanF ?? 1;
  const san = ustOpt ? sanNet : sanNet * ustF;

  // Finanzierung & Haltedauer (monatsgenau)
  const M = Math.max(0, Math.round(num(v.monate) + (o.extraM ?? 0)));
  const kredit = Math.max(0, num(v.fremd));
  const i = (p(v.zins) + (o.zinsAdd ?? 0) / 100) / 12;
  const G = Math.max(0, num(v.tilgFrei));
  const n = Math.max(1, Math.round(num(v.laufzeit) * 12));
  const rate = kredit > 0 ? (i > 0 ? (kredit * i) / (1 - Math.pow(1 + i, -n)) : kredit / n) : 0;
  let b = kredit;
  let zinsen = 0;
  let tilg = 0;
  const zA: number[] = [];
  const tA: number[] = [];
  for (let m = 1; m <= M; m++) {
    const z = b * i;
    zinsen += z;
    zA[m] = z;
    tA[m] = 0;
    if (m > G) {
      const t = Math.min(b, Math.max(0, rate - z));
      tilg += t;
      b -= t;
      tA[m] = t;
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
  const vk = (o.vkM2 !== undefined ? o.vkM2 : num(v.verkM2)) * A;
  const erloes = ustOpt ? vk / ustF : vk;
  const provF = p(v.provision) * (v.provisionUst && !ustOpt ? ustF : 1);
  const prov = vk * provF;
  const rl = v.rlOn ? vk * 0.01 : 0;

  const tot = kp + kaufNk + sonder + san + finNk + zinsen + halte + prov + rl;
  const gewinn = erloes - tot;
  const marge = tot > 0 ? (gewinn / tot) * 100 : 0;
  const ek = tot - kredit + tilg;
  const roiPa = ek > 0 && M > 0 ? ((gewinn / ek) * 12 * 100) / M : 0;
  const netto = gewinn > 0 ? gewinn * (1 - p(v.koest)) : gewinn;

  return {
    A, vers, kp, grest, eintr, notar, makler, kaufSonst, kaufNk, sonder,
    gewerkeNetto, gewerkePuffer, sanNkNetto, gewerkeSumNetto, sanNet, san,
    M, G, kredit, rate, i, zinsen, tilg, rest, zA, tA, kreditVertrag, pfand, nebengeb, finSonst, finNk,
    halteM, halte, vk, erloes, prov, provF, rl, tot, gewinn, marge, ek, roiPa, netto,
  };
}

export type Ergebnis = ReturnType<typeof rechne>;

export function cash(v: V, g: Gewerk[], nk: NkPos[], o: Opts = {}) {
  const r = rechne(v, g, nk, o);
  const N = Math.max(1, r.M);
  const R = Array.from({ length: N + 1 }, (_, m) => ({
    m, ank: 0, san: 0, fin: 0, halte: 0, zins: 0, tilg: 0, bank: 0, verk: 0, net: 0, cum: 0,
  }));
  R[0].ank = r.kp + r.kaufNk + r.sonder;
  R[0].fin = r.finNk;
  R[0].bank = r.kredit;
  const start = Math.min(N, Math.floor(num(v.mVor)) + 1);
  const end = Math.min(N, start + Math.max(1, Math.ceil(num(v.mSan))) - 1);
  for (let m = start; m <= end; m++) R[m].san += r.san / (end - start + 1);
  for (let m = 1; m <= N; m++) {
    R[m].halte = r.halteM;
    R[m].zins = r.zA[m] ?? 0;
    R[m].tilg = r.tA[m] ?? 0;
  }
  R[N].verk = r.erloes - r.prov - r.rl - r.rest;
  let cum = 0;
  let min = 0;
  let peakM = 0;
  for (const x of R) {
    x.net = x.bank + x.verk - x.ank - x.san - x.fin - x.halte - x.zins - x.tilg;
    cum += x.net;
    x.cum = cum;
    if (cum < min - 1e-9) {
      min = cum;
      peakM = x.m;
    }
  }
  return { R, N, peak: -min, peakM, r };
}

/** Maximal zahlbarer Kaufpreis und nötige Verkaufspreise (€/m²). */
export function limits(v: V, g: Gewerk[], nk: NkPos[]) {
  const r = rechne(v, g, nk);
  const ziel = num(v.ziel) / 100;
  const t0 = rechne(v, g, nk, { kp: 0 }).tot;
  const t1 = rechne(v, g, nk, { kp: 1000 }).tot;
  const slope = (t1 - t0) / 1000;
  const kmax = slope > 0 ? (r.erloes / (1 + ziel) - t0) / slope : NaN;
  const f = v.ustOpt ? 1 / (1 + num(v.ust) / 100) : 1;
  const share = r.provF + (v.rlOn ? 0.01 : 0);
  const rest = r.tot - r.prov - r.rl;
  const vmin = (rest * (1 + ziel)) / (f - share * (1 + ziel));
  const vbe = rest / (f - share);
  return { kmax, vmin: vmin / r.A, vbe: vbe / r.A };
}

/** Plan B: Objekt nach der Sanierung vermieten. */
export function halten(v: V, g: Gewerk[], nk: NkPos[]) {
  const r = rechne(v, g, nk);
  const p = (x: number) => num(x) / 100;
  const ustF = 1 + p(v.ust);
  const ankauf = r.kp + r.grest + r.eintr + r.notar + r.makler / (v.ustOpt ? 1 : ustF);
  const invest = ankauf + r.sanNet + r.finNk;
  const mieteJ = num(v.miete) * r.A * 12;
  const eff = mieteJ * (1 - p(v.leer));
  const kosten = num(v.nichtuml) * 12 + num(v.instand) * r.A;
  const netto = eff - kosten;
  const afaBasis = ankauf * p(v.gebAnteil) + r.sanNet;
  const afaJ = afaBasis * p(v.afa);
  const kredit = r.kredit;
  const i = p(v.zins);
  const n = Math.max(num(v.laufzeit), 1);
  const ann = kredit > 0 ? (i > 0 ? (kredit * i) / (1 - Math.pow(1 + i, -n)) : kredit / n) : 0;
  const zinsJ = kredit * i;
  const evs = netto - zinsJ - afaJ;
  const koest = evs > 0 ? evs * p(v.koest) : 0;
  const cf = netto - ann - koest;
  return {
    invest, mieteJ, eff, kosten, netto, afaBasis, afaJ, ann, zinsJ, evs, koest, cf,
    brutto: invest > 0 ? (mieteJ / invest) * 100 : 0,
    nettoR: invest > 0 ? (netto / invest) * 100 : 0,
  };
}

export function ampel(marge: number, ziel: number): "good" | "warn" | "bad" {
  return marge >= ziel - 1e-9 ? "good" : marge >= 0 ? "warn" : "bad";
}
