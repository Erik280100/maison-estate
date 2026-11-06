// Anlegerwohnungsrechner (Verkauf): Rechenlogik nach "DAS IMMO EXCEL - mit Maximalkreditbetrag".
// Reine Funktionen, keine UI. Netto-Kaufpreis + Nebenkosten auf Bruttobasis, Kredit in % vom Nettokaufpreis
// (Kreditkosten werden mitfinanziert), Miete mit jährlicher Wertsicherung, AfA, Einkommensteuer mit Grenzsteuersatz.
// Optional: monatliche Zuzahlung, die direkt tilgt oder in ein Depot / eine FLV fließt und den Kredit vorzeitig ablöst.
import { simulateMerkurFLVPraemie } from "../kredit/merkurFlv";
import { irr } from "../miete/rechne";

export type Modus = "tilgen" | "depot" | "flv";

export type S = {
  name: string; adresse: string;
  // Objekt
  A: number; miete: number; kp: number; ust: number;
  // Kaufnebenkosten (Basis: Bruttokaufpreis)
  kv: number; notar: number; eintr: number; grest: number; makler: number;
  // Finanzierung
  kreditPct: number; zins: number; lz: number; vertrag: number; pfand: number; ngs: number;
  // Annahmen
  mietSteig: number; wert: number; leer: number; kosten: number;
  // Steuer
  grenz: number; geb: number; afa: number; beschl: boolean; gbk: boolean;
  // Zuzahlung
  zuz: number; modus: Modus; depotRend: number; kest: number; flvPerf: number; vfe: number;
};

/** Werte aus dem Excel (Blatt "Berechnung"). */
export const DEFAULTS: S = {
  name: "Anlegerwohnung Beispiel", adresse: "",
  A: 66, miete: 9.47, kp: 175000, ust: 20,
  kv: 1.5, notar: 1000, eintr: 1.1, grest: 3.5, makler: 3.6,
  kreditPct: 85, zins: 3.8, lz: 34, vertrag: 3, pfand: 1.2, ngs: 20,
  mietSteig: 2, wert: 2, leer: 0, kosten: 0,
  grenz: 40, geb: 80, afa: 1.5, beschl: true, gbk: false,
  zuz: 0, modus: "tilgen", depotRend: 5, kest: 27.5, flvPerf: 6, vfe: 1,
};

export const MODUS_TEXT: Record<Modus, string> = {
  tilgen: "Direkt tilgen (Sondertilgung)",
  depot: "Depot / ETF-Sparplan",
  flv: "Fondsgebundene Lebensversicherung (FLV)",
};

const n = (v: unknown) => +(v as number) || 0;
const pc = (v: unknown) => n(v) / 100;

export type Row = {
  t: number; mieteM: number; miete: number; kosten: number; rate: number; bal: number; zinsen: number;
  ueberschuss: number; afa: number; evs: number; steuer: number; netto: number; tilgung: number;
  zuz: number; rueck: number; cf: number; spar: number; wertT: number;
};

export type Lauf = {
  rows: Row[]; kreditEndeMonat: number; abloeseMonat: number | null; zinsenGesamt: number; zuzGesamt: number;
  sumCf: number; sparEnde: number; balEnde: number; vermoegen: number; gewinn: number; irr: number; flows: number[];
  abloeseSpar: number; abloeseVfe: number; abloeseUeberschuss: number; kestAbloese: number;
};

export function calc(s: S) {
  const A = Math.max(n(s.A), 0.0001);
  const lz = Math.min(Math.max(Math.round(n(s.lz)) || 1, 1), 50);
  const kp = n(s.kp), brutto = kp * (1 + pc(s.ust));
  const nkPos: [string, number, string][] = [
    ["Kaufvertrag", brutto * pc(s.kv), `${s.kv} % vom Bruttopreis`],
    ["Notar", n(s.notar), "pauschal"],
    ["Eintragungsgebühren", brutto * pc(s.eintr), `${s.eintr} % vom Bruttopreis`],
    ["Grunderwerbsteuer", brutto * pc(s.grest), `${s.grest} % vom Bruttopreis`],
    ["Makler", brutto * pc(s.makler), `${s.makler} % vom Bruttopreis`],
  ];
  const nk = nkPos.reduce((a, p) => a + p[1], 0);
  const summeOhneKredit = kp + nk;

  const maxKredit = kp * pc(s.kreditPct);
  const kreditPos: [string, number, string][] = [
    ["Errichtung des Kreditvertrags", maxKredit * pc(s.vertrag), `${s.vertrag} % der Kreditsumme`],
    ["Eintragung des Kredits", maxKredit * pc(s.pfand) * (1 + pc(s.ngs)), `${s.pfand} % + ${s.ngs} % Nebengebühren`],
  ];
  const kreditNK = kreditPos.reduce((a, p) => a + p[1], 0);
  const kredit = maxKredit + kreditNK;
  const ek = Math.max(summeOhneKredit - maxKredit, 0);

  const i = pc(s.zins) / 12, nMon = lz * 12;
  const rateM = kredit <= 0 ? 0 : i > 0 ? (kredit * i) / (1 - Math.pow(1 + i, -nMon)) : kredit / nMon;

  const mieteM0 = n(s.miete) * A, mieteJ0 = mieteM0 * 12;
  const mietrendite = kp > 0 ? mieteJ0 / kp : 0;
  const ekRenditeHebel = ek > 0 ? mietrendite + ((mietrendite - pc(s.zins)) * maxKredit) / ek : NaN;
  const nettoRendite = summeOhneKredit > 0 ? (mieteJ0 * (1 - pc(s.leer)) - n(s.kosten) * 12) / summeOhneKredit : 0;

  const afaBasis = summeOhneKredit * pc(s.geb), afaSatz = pc(s.afa), kst = pc(s.grenz);
  const finJ = kreditNK / lz;

  function lauf(zuz: number, modus: Modus): Lauf {
    const rm = Math.pow(1 + pc(s.depotRend), 1 / 12) - 1, kestR = pc(s.kest), vfe = pc(s.vfe);
    const flv = zuz > 0 && modus === "flv" ? simulateMerkurFLVPraemie(zuz, lz, pc(s.flvPerf), 0) : [];
    let bal = kredit, spar = 0, eingez = 0, mon = 0, cumAfa = 0, ended = false;
    let abloeseMonat: number | null = null, kreditEnde = nMon, abloeseSpar = 0, abloeseVfe = 0, abloeseUeberschuss = 0, kestAbloese = 0;
    let zuzGes = 0, zinsGes = 0;
    const rows: Row[] = [], flows = [-ek];
    const sparNetto = (v: number, ein: number) => (modus === "depot" ? v - kestR * Math.max(v - ein, 0) : v);

    for (let t = 1; t <= lz; t++) {
      const mf = Math.pow(1 + pc(s.mietSteig), t - 1);
      const miete = mieteJ0 * (1 - pc(s.leer)) * mf, kosten = n(s.kosten) * 12 * mf, ertrag = miete - kosten;
      let zinsJ = 0, tilgJ = 0, rateJ = 0, zuzJ = 0, rueckJ = 0;
      for (let m = 0; m < 12; m++) {
        mon++;
        if (bal > 0.005) {
          const z = bal * i, r = Math.min(rateM, bal + z);
          zinsJ += z; tilgJ += r - z; rateJ += r; bal -= r - z;
          if (bal <= 0.005) { bal = 0; if (kreditEnde === nMon && mon < nMon) kreditEnde = mon; }
        }
        if (zuz > 0 && !ended) {
          if (modus === "tilgen") {
            if (bal > 0) { const x = Math.min(zuz, bal); bal -= x; tilgJ += x; zuzJ += x; zuzGes += x; if (bal <= 0.005) { bal = 0; ended = true; kreditEnde = Math.min(kreditEnde, mon); abloeseMonat = mon; } }
          } else {
            zuzJ += zuz; zuzGes += zuz; eingez += zuz;
            spar = modus === "depot" ? spar * (1 + rm) + zuz : flv[mon] ?? 0;
            const netto = sparNetto(spar, eingez);
            if (bal > 0.005 && mon < nMon && netto >= bal * (1 + vfe)) {
              abloeseSpar = spar; abloeseVfe = bal * vfe; abloeseUeberschuss = netto - bal * (1 + vfe);
              kestAbloese = spar - netto;
              rueckJ += abloeseUeberschuss; bal = 0; spar = 0; eingez = 0; ended = true; abloeseMonat = mon; kreditEnde = Math.min(kreditEnde, mon);
            }
          }
        }
      }
      const mult = s.beschl ? (t === 1 ? 3 : t === 2 ? 2 : 1) : 1;
      const afaJ = Math.min(afaBasis * afaSatz * mult, Math.max(afaBasis - cumAfa, 0)); cumAfa += afaJ;
      const fa = s.gbk ? finJ : 0;
      const evs = ertrag - zinsJ - afaJ - fa, steuer = evs * kst;
      const cfExcel = ertrag - rateJ - steuer;
      const cf = cfExcel - zuzJ + rueckJ;
      zinsGes += zinsJ;
      rows.push({
        t, mieteM: miete / 12, miete, kosten, rate: rateJ, bal, zinsen: zinsJ, ueberschuss: ertrag - zinsJ, afa: afaJ, evs, steuer,
        netto: evs - steuer, tilgung: tilgJ, zuz: zuzJ, rueck: rueckJ, cf, spar: sparNetto(spar, eingez), wertT: kp * Math.pow(1 + pc(s.wert), t),
      });
      flows.push(cf);
    }
    const last = rows[rows.length - 1];
    const sparEnde = last.spar, balEnde = last.bal;
    flows[flows.length - 1] += last.wertT - balEnde + sparEnde;
    const sumCf = rows.reduce((a, x) => a + x.cf, 0);
    const vermoegen = last.wertT - balEnde + sparEnde;
    return {
      rows, kreditEndeMonat: kreditEnde, abloeseMonat, zinsenGesamt: zinsGes, zuzGesamt: zuzGes, sumCf, sparEnde, balEnde, vermoegen,
      gewinn: sumCf + vermoegen - ek, irr: irr(flows), flows, abloeseSpar, abloeseVfe, abloeseUeberschuss, kestAbloese,
    };
  }

  const zuz = Math.max(n(s.zuz), 0);
  const basis = lauf(0, s.modus);
  const mit = zuz > 0 ? lauf(zuz, s.modus) : basis;
  const r1 = mit.rows[0], b1 = basis.rows[0];

  return {
    A, lz, kp, brutto, nkPos, nk, summeOhneKredit, maxKredit, kreditPos, kreditNK, kredit, ek, rateM, rateJ: rateM * 12,
    mieteM0, mieteJ0, mietrendite, ekRenditeHebel, nettoRendite, afaBasis, zuz, basis, mit,
    cfM1: b1.cf / 12, cfM1Zuz: r1.cf / 12,
    // Eigenkapitalrendite Jahr 1 auf das eingesetzte Eigenkapital
    cashOnCash: ek > 0 ? b1.cf / ek : NaN,
    gesamtJ1: ek > 0 ? (b1.cf + b1.tilgung + (b1.wertT - kp)) / ek : NaN,
    ekQuote: summeOhneKredit > 0 ? ek / summeOhneKredit : 0,
    deckung: rateM > 0 ? b1.miete / 12 / rateM : Infinity,
    jahreFrueher: Math.max((nMon - mit.kreditEndeMonat) / 12, 0),
    zinsErsparnis: basis.zinsenGesamt - mit.zinsenGesamt,
    vorteil: mit.gewinn - basis.gewinn,
  };
}
export type Result = ReturnType<typeof calc>;

// ---- Formatierung ----
const de = (v: number, d: number) => v.toLocaleString("de-AT", { minimumFractionDigits: d, maximumFractionDigits: d });
export const eur = (v: number) => (isFinite(v) ? (v < 0 ? "−" : "") + Math.round(Math.abs(v)).toLocaleString("de-AT") + " €" : "–");
export const pct = (v: number, d = 1) => (isFinite(v) ? (v < 0 ? "−" : "") + de(Math.abs(v * 100), d) + " %" : "–");
export const n2 = (v: number) => (isFinite(v) ? de(v, 2) : "–");
export const jahreMonate = (monate: number) => {
  const j = Math.floor(monate / 12), m = Math.round(monate - j * 12);
  return m === 12 ? `${j + 1} Jahre` : `${j} Jahre${m ? ` ${m} Mon.` : ""}`;
};
