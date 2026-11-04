// Umschuldungsrechner: Rechenlogik (bestehender Kredit gegen neues Angebot). Reine Funktionen, keine UI.

export type Art = "fix" | "var" | "misch";

export type S = {
  kunde: string; bank: string; quelle: "vertrag" | "bank";
  kbA: number; lzGes: number; startM: number; startJ: number; sondBisher: number;
  rest: number; kennt: "lz" | "rate"; lzA: number; rateA: number; kbA2: number;
  zA: number; artA: Art; fixA: number; aufA: number; floorA: number; capA: number; effAv: number; feeA: number; versA: number; kontoA: number;
  eur: number;
  zN: number; artN: Art; fixN: number; aufN: number; floorN: number; capN: number;
  ziel: "rate" | "lz"; lzN: number; tfN: number; sondN: number; effNv: number; feeN: number; versN: number; kontoN: number;
  vfe: number; vfeFix: number; bearb: number; verm: number; pfandOn: boolean; pfand: number; pfandH: number;
  schaetz: number; notar: number; sonst: number; mitfin: boolean;
  wert: number; quote: number; aufst: number;
};

export const DEFAULTS: S = {
  kunde: "Beispiel Wohnkredit", bank: "", quelle: "vertrag",
  kbA: 220000, lzGes: 30, startM: 3, startJ: 2020, sondBisher: 0,
  rest: 180000, kennt: "lz", lzA: 22, rateA: 1150, kbA2: 0,
  zA: 4.8, artA: "fix", fixA: 0, aufA: 1.5, floorA: 0, capA: 0, effAv: 0, feeA: 8, versA: 0, kontoA: 0, eur: 2.676,
  zN: 3.4, artN: "fix", fixN: 0, aufN: 1.125, floorN: 0, capN: 0,
  ziel: "rate", lzN: 23, tfN: 0, sondN: 0, effNv: 0, feeN: 7, versN: 0, kontoN: 0,
  vfe: 1, vfeFix: 0, bearb: 1, verm: 0, pfandOn: true, pfand: 1.2, pfandH: 120, schaetz: 370, notar: 500, sonst: 0, mitfin: true,
  wert: 340000, quote: 80, aufst: 0,
};

export const PRESETS = {
  top: { aufN: 1.125, bearb: 0.5, schaetz: 370, feeN: 7, pfand: 1.2, pfandH: 120, t: "sehr gute Bonität" },
  mid: { aufN: 1.25, bearb: 1, schaetz: 370, feeN: 7, pfand: 1.2, pfandH: 120, t: "ausreichende Bonität" },
  low: { aufN: 0.84, bearb: 0, schaetz: 0, feeN: 3, pfand: 1.2, pfandH: 100, t: "günstigsten Fall" },
} as const;

const n = (v: unknown) => +(v as number) || 0;
const pc = (v: unknown) => n(v) / 100;

export function ann(P: number, i: number, nn: number) {
  if (nn <= 0) return P;
  return i > 0 ? (P * i) / (1 - Math.pow(1 + i, -nn)) : P / nn;
}

export type SRow = { B: number; pay: number; paid: number; zins: number };
export type Sched = { rows: SRow[]; n: number; paid: number; zins: number; R: number; Rstart?: number; inf?: boolean };

/** Tilgungsplan: P Betrag, i1 Zins bis Monat F, danach i2; n Laufzeit (Annuität) oder R feste Rate; G tilgungsfreie Monate; fee monatlich; sond pro Jahr. */
export function sched(o: { P: number; i1: number; i2?: number; F?: number; G?: number; fee?: number; sond?: number; R?: number; n?: number }): Sched {
  const { P, i1, F = 0, G = 0, fee = 0, sond = 0 } = o, i2 = o.i2 === undefined ? i1 : o.i2, fixR = o.R !== undefined;
  const rows: SRow[] = [];
  let B = P, paid = 0, zins = 0, m = 0, R = fixR ? (o.R as number) : ann(P, i1, (o.n || 1) - G);
  if (P <= 0.005) return { rows, n: 0, paid: 0, zins: 0, R: 0 };
  let R0: number | null = null;
  const inf = (): Sched => ({ inf: true, rows, n: Infinity, paid: Infinity, zins: Infinity, R });
  while (B > 0.005 && m < 1200) {
    m++;
    const i = F > 0 && m > F ? i2 : i1, z = B * i;
    if (!fixR && (m === G + 1 || (F > 0 && m === F + 1 && m > G))) R = ann(B, i, Math.max((o.n || 1) - m + 1, 1));
    if (fixR && m === F + 1 && F > 0 && R <= z + 1e-9) return inf();
    let pay: number;
    if (m <= G) pay = z;
    else { if (R <= z + 1e-9) return inf(); pay = Math.min(R, B + z); }
    if (R0 === null && m > G) R0 = pay;
    B = B + z - pay;
    if (sond > 0 && m % 12 === 0 && B > 0) { const s = Math.min(sond, B); B -= s; pay += s; }
    paid += pay + fee; zins += z;
    rows.push({ B: Math.max(B, 0), pay: pay + fee, paid, zins });
  }
  return { rows, n: m, paid, zins, R: R0 === null ? 0 : R0, Rstart: G > 0 ? rows[0].pay - fee : (R0 ?? 0) };
}

/** Effektivzins (interner Zinsfuß der Monatszahlungen, annualisiert). */
export function irr(net: number, pays: number[]) {
  if (!(net > 0) || !pays.length) return NaN;
  const pv = (r: number) => { let a = 0, d = 1; for (let t = 0; t < pays.length; t++) { d /= 1 + r; a += pays[t] * d; } return a - net; };
  let lo = -0.009, hi = 0.05;
  if (pv(lo) < 0 || pv(hi) > 0) return NaN;
  for (let k = 0; k < 60; k++) { const m = (lo + hi) / 2; if (pv(m) > 0) lo = m; else hi = m; }
  return Math.pow(1 + (lo + hi) / 2, 12) - 1;
}

type Opt = { dEur?: number; aufst?: boolean; zN?: number; lzN?: number; ziel?: "rate" | "lz"; light?: boolean; effOnly?: boolean };

export function zinsPlan(s: S, X: "A" | "N", o: Opt = {}) {
  const art = s[("art" + X) as "artA" | "artN"], eur = n(s.eur) + (o.dEur || 0);
  const auf = n(s[("auf" + X) as "aufA" | "aufN"]), fl = n(s[("floor" + X) as "floorA" | "floorN"]), cp = n(s[("cap" + X) as "capA" | "capN"]);
  const z = pc(s[("z" + X) as "zA" | "zN"]) / 12;
  const clamp = (v: number) => { if (fl > 0) v = Math.max(v, fl); if (cp > 0) v = Math.min(v, cp); return v; };
  if (art === "var") return { i1: clamp(eur + auf) / 1200, i2: clamp(eur + auf) / 1200, F: 0 };
  if (art === "misch") return { i1: z, i2: clamp(eur + auf) / 1200, F: Math.round(n(s[("fix" + X) as "fixA" | "fixN"]) * 12) };
  return { i1: z, i2: z, F: 0 };
}

function altBestand(s: S) {
  const iA = zinsPlan(s, "A").i1;
  if (s.quelle === "bank") {
    const B0 = Math.max(n(s.rest), 0), kb = n(s.kbA2);
    let nn: number | null = null, R: number | null = null;
    if (s.kennt === "rate") R = n(s.rateA); else nn = Math.round(n(s.lzA) * 12);
    return { B0, kb, tilg: kb > 0 ? kb - B0 : NaN, zinsBisher: NaN, raten: NaN, n: nn, R };
  }
  const d = new Date(), t = { y: d.getFullYear(), m: d.getMonth() + 1 };
  const kb = Math.max(n(s.kbA), 0), N = Math.round(n(s.lzGes) * 12);
  const k = Math.min(Math.max((t.y - (n(s.startJ) || t.y)) * 12 + (t.m - (n(s.startM) || 1)) + 1, 0), N);
  const R = ann(kb, iA, N);
  let B = kb, z = 0;
  for (let m = 1; m <= k && B > 0; m++) { const zi = B * iA; z += zi; B = Math.max(B + zi - R, 0); }
  B = Math.max(B - n(s.sondBisher), 0);
  return { B0: B, kb, tilg: kb - B, zinsBisher: z, raten: k, n: N - k as number | null, R: n(s.sondBisher) > 0 ? R : null };
}

export function calc(s: S, o: Opt = {}) {
  const A = altBestand(s), B0 = A.B0;
  const ZA = zinsPlan(s, "A", o), iA = ZA.i1, FA = ZA.F, iA2 = ZA.i2, feeA = n(s.feeA) + n(s.versA) + n(s.kontoA);
  const alt = A.R !== null && A.R !== undefined
    ? sched({ P: B0, i1: iA, i2: iA2, F: FA, R: A.R, fee: feeA })
    : sched({ P: B0, i1: iA, i2: iA2, F: FA, n: Math.max(A.n || 1, 1), fee: feeA });
  const aufst = o.aufst ? Math.max(n(s.aufst), 0) : 0;
  const fixed = B0 * pc(s.vfe) + n(s.vfeFix) + n(s.schaetz) + n(s.notar) + n(s.sonst);
  const p = pc(s.bearb) + pc(s.verm) + (s.pfandOn ? pc(s.pfand) * pc(s.pfandH) : 0);
  const base = B0 + aufst;
  let B1: number, kost: number, cash: number;
  if (s.mitfin) { B1 = p < 1 ? (base + fixed) / (1 - p) : base + fixed; kost = B1 - base; cash = 0; }
  else { B1 = base; kost = fixed + p * base; cash = kost; }
  const ZN = zinsPlan(s, "N", o), iN = o.zN !== undefined ? o.zN / 12 : ZN.i1, FN = ZN.F;
  const iN2 = s.artN === "var" && o.zN !== undefined ? iN : ZN.i2;
  const feeN = n(s.feeN) + n(s.versN) + n(s.kontoN), G = Math.max(Math.round(n(s.tfN)), 0), sond = n(s.sondN);
  const ziel = o.ziel || s.ziel, lz = o.lzN !== undefined ? o.lzN : n(s.lzN);
  const neu = ziel === "lz" && !aufst
    ? sched({ P: B1, i1: iN, i2: iN2, F: FN, G, R: alt.R || alt.Rstart || 0, fee: feeN, sond })
    : sched({ P: B1, i1: iN, i2: iN2, F: FN, G, n: ziel === "lz" ? Math.max(alt.n, 1) : Math.round(lz * 12), fee: feeN, sond });
  const tA = alt.paid, tN = neu.paid + cash, sav = tA - tN;
  const r = { A, B0, B1, alt, neu, kost, cash, tA, tN, sav, feeA, feeN, fixed, aufst, be: null as number | null, effA: NaN, effN: NaN, zMax: NaN };
  if (o.effOnly) { r.effN = neu.inf ? NaN : irr(B0 - cash, neu.rows.map((x) => x.pay)); return r; }
  if (o.light) return r;
  if (!alt.inf && !neu.inf) {
    const N = Math.max(alt.n, neu.n);
    for (let t = 1; t <= N; t++) {
      const a = alt.rows[Math.min(t, alt.n) - 1], b = neu.rows[Math.min(t, neu.n) - 1];
      const ca = a ? a.paid + (t < alt.n ? a.B : 0) : 0, cb = cash + (b ? b.paid + (t < neu.n ? b.B : 0) : 0);
      if (cb <= ca + 1e-6) { r.be = t; break; }
    }
  }
  r.effA = alt.inf ? NaN : irr(B0, alt.rows.map((x) => x.pay));
  r.effN = neu.inf ? NaN : irr(B0 - cash, neu.rows.map((x) => x.pay));
  const f = (z: number) => calc(s, { zN: z, light: true });
  if (f(0).sav <= 0) r.zMax = NaN;
  else {
    let lo = 0, hi = 0.25;
    if (f(hi).sav > 0) r.zMax = hi;
    else { for (let k = 0; k < 45; k++) { const m = (lo + hi) / 2, x = f(m); if (!x.neu.inf && x.sav > 0) lo = m; else hi = m; } r.zMax = lo; }
  }
  return r;
}
export type Result = ReturnType<typeof calc>;

// ---- Formatierung ----
const de = (v: number, d: number) => v.toLocaleString("de-AT", { minimumFractionDigits: d, maximumFractionDigits: d });
export const eur = (v: number) => (isFinite(v) ? (v < 0 ? "−" : "") + Math.round(Math.abs(v)).toLocaleString("de-AT") + " €" : "–");
export const eur2 = (v: number) => (isFinite(v) ? (v < 0 ? "−" : "") + de(Math.abs(v), 2) + " €" : "–");
export const pct = (v: number, d = 2) => (isFinite(v) ? (v < 0 ? "−" : "") + de(Math.abs(v * 100), d) + " %" : "–");
export const dur = (nn: number) => {
  if (!isFinite(nn)) return "tilgt nicht";
  const j = Math.floor(nn / 12), m = nn % 12;
  return ((j ? j + " J." : "") + (j && m ? " " : "") + (m ? m + " M." : "")) || "0 M.";
};
export const deNum = (v: number, max = 3) => v.toLocaleString("de-AT", { maximumFractionDigits: max });

export const zText = (s: S, X: "A" | "N") => {
  const z = zinsPlan(s, X), a = s[("art" + X) as "artA" | "artN"], f = (v: number) => pct(v * 12);
  const auf = n(s[("auf" + X) as "aufA" | "aufN"]);
  if (a === "var") return f(z.i1) + " = Euribor " + deNum(n(s.eur)) + " % + " + deNum(auf) + " %" + (Math.abs(z.i1 * 1200 - (n(s.eur) + auf)) > 1e-9 ? " (Grenze greift)" : "");
  if (a === "misch") return f(z.i1) + " fix " + dur(z.F) + ", danach " + f(z.i2) + " (Euribor + Aufschlag)";
  return f(z.i1) + " fix";
};
export const zNow = (s: S, X: "A" | "N") => zinsPlan(s, X).i1 * 12;

/** Textzusammenfassung zum Kopieren. */
export function summary(s: S) {
  const r = calc(s), A = r.A, Ra = r.alt.Rstart || r.alt.R, Rn = r.neu.Rstart || r.neu.R, mon = Ra + r.feeA - (Rn + r.feeN);
  const wert = n(s.wert), res = (wert * n(s.quote)) / 100 - r.B0;
  const L = [
    `Umschuldung ${s.kunde || ""}`.trim() + (s.bank ? ` · Angebot ${s.bank}` : ""),
    A.kb > 0 ? `Ursprünglich ${eur(A.kb)}, bereits getilgt ${eur(A.tilg)} (${pct(A.tilg / A.kb, 1)}), offen ${eur(r.B0)}` : `Offene Restschuld ${eur(r.B0)}`,
    `Bisher: ${zText(s, "A")} Sollzins, Rate ${eur2(Ra + r.feeA)}, noch ${dur(r.alt.n)}`,
    `Neu: ${zText(s, "N")} Sollzins, Rate ${eur2(Rn + r.feeN)}, Laufzeit ${dur(r.neu.n)}`,
    `Monatlich ${eur2(mon)} weniger`,
    `Umschuldungskosten ${eur(r.kost)} (${s.mitfin ? "mitfinanziert" : "bar"}), hereingespielt nach ${r.be ? dur(r.be) : "–"}`,
    `Ersparnis über die Laufzeit: ${eur(r.sav)}`,
    `Effektivzins alt ${pct(r.effA)} · neu inkl. Kosten ${pct(r.effN)}`,
  ];
  if (wert) L.push(`Freier Beleihungsrahmen (${s.quote} % von ${eur(wert)}): ${eur(res)}`);
  if (n(s.aufst) > 0) { const x = calc(s, { aufst: true, light: true }); L.push(`Mit Aufstockung ${eur(n(s.aufst))}: Kredit ${eur(x.B1)}, Rate ${eur2((x.neu.Rstart || x.neu.R) + x.feeN)}`); }
  L.push(`Unverbindliche Berechnung, Maison Estate GmbH, Stand ${new Date().toLocaleDateString("de-AT")}`);
  return L.join("\n");
}
