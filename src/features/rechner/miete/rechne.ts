// Mietrechner: Rechenlogik (Bestandsvermietung nach MRG, inkl. Annahmen aus "DAS IMMO EXCEL").
// Reine Funktionen, keine UI. Alle Kosten netto, Wohnraumvermietung mit 10 % USt, Vorsteuer abziehbar.

export type Mrg = "voll" | "teil" | "aus";

export type S = {
  name: string; adresse: string; status: string;
  A: number; kaufM2: number; kpBrutto: boolean; nettoAnt: number;
  grest: number; eintr: number; notar: number; notarFix: number;
  maklerOn: boolean; makler: number; sonst: number; sanM2: number; einr: number;
  mrg: Mrg; rw: number; zu: number; ab: number; befr: boolean; miete: number; extra: number; bk: number;
  leer: number; verw: number; rl: number; inst: number; infl: number;
  wJ: number; wMM: number; wRen: number; rueck: number; verzD: number; verzZ: number; ausfall: number;
  ekMode: "pct" | "eur"; fk: number; ekEur: number;
  zins: number; zinsFix: number; zins2: number; lz: number; tf: number; sond: number; bearb: number; pfand: number; dscrZiel: number;
  stMode: "gmbh" | "privat"; geb: number; afa: number; beschl: boolean; sanJ: number; koest: number; verlust: boolean; grenz: number; immoest: number;
  docBk: boolean; docNwg: boolean; docEa: boolean; docHv: boolean;
  H: number; mw: number; wert: number; vkk: number; ziel: number;
};

export const STATI = ["In Prüfung", "Angebot gelegt", "Gekauft", "Vermietet", "Im Verkauf", "Abgelehnt"];

export const DEFAULTS: S = {
  name: "Beispiel 60 m² Graz – Bestand", adresse: "", status: "In Prüfung",
  A: 60, kaufM2: 2300, kpBrutto: false, nettoAnt: 82,
  grest: 3.5, eintr: 1.1, notar: 1.5, notarFix: 0, maklerOn: false, makler: 3, sonst: 0, sanM2: 250, einr: 0,
  mrg: "teil", rw: 9.3, zu: 10, ab: 0, befr: true, miete: 11.5, extra: 60, bk: 2.6,
  leer: 3, verw: 25, rl: 1, inst: 10, infl: 2.5,
  wJ: 5, wMM: 2, wRen: 1500, rueck: 5, verzD: 1, verzZ: 4, ausfall: 0.5,
  ekMode: "pct", fk: 60, ekEur: 0,
  zins: 3.5, zinsFix: 0, zins2: 4.5, lz: 30, tf: 0, sond: 0, bearb: 1, pfand: 1.44, dscrZiel: 1.2,
  stMode: "gmbh", geb: 70, afa: 1.5, beschl: false, sanJ: 15, koest: 23, verlust: true, grenz: 40, immoest: 30,
  docBk: false, docNwg: false, docEa: false, docHv: false,
  H: 10, mw: 3300, wert: 2.5, vkk: 3, ziel: 4,
};

/** Annahmen aus "DAS IMMO EXCEL" (Blatt Berechnung 2): privat, 40 % Grenzsteuersatz, Brutto-Kaufpreis, Eigenmittel in Euro. */
export const EXCEL_TPL: S = {
  ...DEFAULTS,
  name: "Excel-Vorlage 58 m²", A: 58, kaufM2: 200000 / 58, kpBrutto: true, nettoAnt: 82,
  grest: 3.5, eintr: 1.1, notar: 1.5, notarFix: 800, maklerOn: true, makler: 3.6, sonst: 500, sanM2: 0, einr: 0,
  mrg: "teil", miete: 10.6, extra: 0, bk: 0, leer: 0, verw: 0, rl: 0, inst: 0, infl: 2,
  wJ: 0, wMM: 0, wRen: 0, rueck: 0, verzD: 0, ausfall: 0,
  ekMode: "eur", ekEur: 34000, zins: 3, zinsFix: 0, lz: 35, tf: 0, sond: 0, bearb: 3, pfand: 1.44,
  stMode: "privat", grenz: 40, geb: 80, afa: 1.5, beschl: true, sanJ: 15, H: 35, mw: 200000 / 58, wert: 2, vkk: 0,
};

export const MARKT = 15.15; // Angebotsmiete Graz brutto €/m² (ImmoScout24, Mai 2026)

export const MRG_TEXT: Record<Mrg, string> = {
  voll: "Vollanwendung MRG (Richtwert)",
  teil: "Teilanwendung MRG (freier Mietzins)",
  aus: "Vollausnahme (ABGB)",
};
export const MRG_INFO: Record<Mrg, string> = {
  voll: "Altbau mit Baubewilligung vor 1945 bzw. 1953 oder gefördert errichtet: Richtwertmietzins mit Zu- und Abschlägen.",
  teil: "Frei finanzierter Neubau nach 1945 bzw. 1953, WE-Wohnung im Neubau: Mietzins frei vereinbar, aber Kündigungsschutz und Befristungsregeln.",
  aus: "Ein- oder Zweiobjekthaus, Dienstwohnung u. Ä.: ABGB statt MRG, Wertsicherung frei vereinbar.",
};

const n = (v: unknown) => +(v as number) || 0;
const pc = (v: unknown) => n(v) / 100;

function annuityM(K: number, i: number, nn: number) {
  if (K <= 0) return 0;
  nn = Math.max(nn, 1);
  return i > 0 ? (K * i) / (1 - Math.pow(1 + i, -nn)) : K / nn;
}

export function hmzOf(s: S) {
  if (s.mrg === "voll") return n(s.rw) * (1 + (n(s.zu) - n(s.ab)) / 100) * (s.befr ? 0.75 : 1);
  return n(s.miete);
}

/** Jährliche Mietanpassung ab 2028 (MieWeG): voller VPI bis 3 %, darüber nur die Hälfte. 2026 (max. 1 %) und 2027 (max. 2 %) sind gedeckelt und werden konservativ nicht angesetzt. */
export function growth(s: S) {
  const inf = n(s.infl) / 100;
  if (s.mrg === "aus") return inf;
  return inf <= 0.03 ? inf : 0.03 + (inf - 0.03) / 2;
}

/** Käufersicht: Kaufpreis = Marktwert, keine Sanierung, keine Steuer. */
export function kundeS(s: S): S {
  return { ...s, kaufM2: n(s.mw), sanM2: 0, einr: 0, koest: 0, verlust: false, beschl: false, stMode: "gmbh", kpBrutto: false };
}

export function irr(f: number[]) {
  const npv = (r: number) => f.reduce((a, c, t) => a + c / Math.pow(1 + r, t), 0);
  let lo = -0.99, hi = 2;
  if (!(f[0] < 0) || npv(lo) * npv(hi) > 0) return NaN;
  for (let k = 0; k < 200; k++) {
    const m = (lo + hi) / 2;
    if (npv(lo) * npv(m) <= 0) hi = m; else lo = m;
  }
  return (lo + hi) / 2;
}

export type Row = {
  t: number; eff: number; mieteM: number; kost: number; ertrag: number; zinsJ: number; tilgJ: number; afaJ: number;
  st: number; cf: number; bal: number; paid: number; wertT: number; vorAfa: number; evs: number; netto: number;
};
type Opt = { kpM2?: number; hmz?: number };

export function calc(s: S, o: Opt = {}) {
  const A = Math.max(n(s.A), 0.0001);
  const kpIn = (o.kpM2 !== undefined ? o.kpM2 : n(s.kaufM2)) * A;
  // Brutto-Kaufpreis (inkl. USt): Netto = Netto-Anteil, Nebenkosten und AfA auf Bruttobasis (wie im Immo-Excel)
  const nettoF = s.kpBrutto ? pc(s.nettoAnt) : 1;
  const kp = kpIn * nettoF;
  const nkRate = pc(s.grest) + pc(s.eintr) + pc(s.notar) + (s.maklerOn ? pc(s.makler) : 0);
  const nkFix = n(s.notarFix), sonst = n(s.sonst);
  const nk = kpIn * nkRate + nkFix, nkR = kp > 0 ? nk / kp : 0, cK = nettoF + nkRate;
  const san = n(s.sanM2) * A + n(s.einr);
  const fin = pc(s.pfand) + pc(s.bearb);
  const basis = kp + nk + sonst + san;
  const kredit = s.ekMode === "eur" ? Math.max((basis - n(s.ekEur)) / (1 - fin), 0) : pc(s.fk) * basis;
  const finK = kredit * fin, inv = basis + finK, ek = inv - kredit, fkEff = basis > 0 ? kredit / basis : 0;

  const hmz = o.hmz !== undefined ? o.hmz : hmzOf(s);
  const mieteJ = hmz * A * 12 + n(s.extra) * 12, leer = pc(s.leer), bk = n(s.bk);
  const verzF = pc(s.rueck) * (pc(s.verzZ) - pc(s.zins)) * n(s.verzD) / 12, vf = 1 + verzF - pc(s.ausfall); // Zinseffekt des Verzugs minus uneinbringliche Mieten
  const wJ = n(s.wJ), wMM = n(s.wMM);
  const kH = wJ > 0 ? (wMM * A) / wJ : 0; // Maklerkosten hängen am Hauptmietzins
  const kostenFix = n(s.verw) * 12 + n(s.rl) * A * 12 + n(s.inst) * A + leer * bk * A * 12 + (wJ > 0 ? (wMM * bk * A + n(s.wRen)) / wJ : 0);
  const kostenJ = kostenFix + kH * hmz;
  const verzJ = mieteJ * (1 - leer) * verzF;
  const noi = mieteJ * (1 - leer) * vf - kostenJ;

  const lz = Math.max(n(s.lz) || 1, 1), tf = Math.min(Math.max(Math.round(n(s.tf)), 0), lz - 1);
  const i1 = pc(s.zins) / 12, F = Math.round(n(s.zinsFix) * 12), i2 = F > 0 ? pc(s.zins2) / 12 : i1;
  const annM = annuityM(kredit, i1, (lz - tf) * 12), annJ = annM * 12;
  const H = Math.min(Math.max(Math.round(n(s.H) || 1), 1), 50), inf = pc(s.infl), nMon = lz * 12, sond = n(s.sond);

  const priv = s.stMode === "privat", kpAfa = s.kpBrutto ? kpIn : kp;
  // Gebäude: AfA mit Satz (ggf. beschleunigt). Sanierung (Instandsetzung): gleichmäßig über sanJ Jahre. Einrichtung: 10 Jahre.
  const afaBase = (kpAfa + nk) * pc(s.geb), grundAnt = (kpAfa + nk) * (1 - pc(s.geb));
  const sanBase = n(s.sanM2) * A, einrBase = n(s.einr), sanN = Math.max(Math.round(n(s.sanJ)) || 15, 1), EINR_J = 10;
  const afaR = pc(s.afa), kst = priv ? pc(s.grenz) : pc(s.koest), verl = priv || s.verlust, finJ = finK / lz;

  let bal = kredit, mf = 1, cf0 = 1, cumAfa = 0, cumSan = 0, cumEinr = 0, mon = 0, R = annM;
  const rows: Row[] = [], flows = [-ek];
  for (let t = 1; t <= H; t++) {
    if (t > 1) { mf *= 1 + growth(s); cf0 *= 1 + inf; }
    const eff = mieteJ * (1 - leer) * mf * vf, kost = kostenFix * cf0 + kH * hmz * mf, ertrag = eff - kost;
    let zinsJ = 0, tilgJ = 0, paid = 0;
    for (let m = 0; m < 12; m++) {
      mon++;
      if (bal <= 0.005 || mon > nMon) continue;
      const i = F > 0 && mon > F ? i2 : i1, z = bal * i;
      if (mon <= tf * 12) { zinsJ += z; paid += z; continue; }
      if (mon === tf * 12 + 1 || (F > 0 && mon === F + 1 && mon > tf * 12)) R = annuityM(bal, i, nMon - mon + 1);
      const r = Math.min(R, bal + z);
      zinsJ += z; tilgJ += r - z; bal -= r - z; paid += r;
      if (sond > 0 && mon % 12 === 0 && bal > 0) { const x = Math.min(sond, bal); bal -= x; tilgJ += x; paid += x; }
    }
    const mult = s.beschl ? (t === 1 ? 3 : t === 2 ? 2 : 1) : 1;
    const afaG = Math.min(afaBase * afaR * mult, Math.max(afaBase - cumAfa, 0));
    const afaS = Math.min(sanBase / sanN, Math.max(sanBase - cumSan, 0));
    const afaE = Math.min(einrBase / EINR_J, Math.max(einrBase - cumEinr, 0));
    cumAfa += afaG; cumSan += afaS; cumEinr += afaE;
    const afaJ = afaG + afaS + afaE;
    const fa = t <= lz ? finJ : 0, evs = ertrag - zinsJ - afaJ - fa, st = evs > 0 ? evs * kst : verl ? evs * kst : 0;
    const cf = ertrag - paid - st, wertT = n(s.mw) * A * Math.pow(1 + pc(s.wert), t);
    rows.push({ t, eff, mieteM: eff / 12, kost, ertrag, zinsJ, tilgJ, afaJ, st, cf, bal: Math.max(bal, 0), paid, wertT, vorAfa: ertrag - zinsJ, evs, netto: evs - st });
    flows.push(cf);
  }
  const sale = n(s.mw) * A * Math.pow(1 + pc(s.wert), H), vkk = sale * pc(s.vkk);
  const buch = afaBase - cumAfa + (sanBase - cumSan) + (einrBase - cumEinr) + grundAnt + Math.max(finK - finJ * Math.min(H, lz), 0);
  const gain = sale - vkk - buch;
  const exTax = priv ? (gain > 0 ? gain * pc(s.immoest) : 0) : gain > 0 ? gain * kst : s.verlust ? gain * kst : 0;
  const exNet = sale - vkk - Math.max(bal, 0) - exTax;
  flows[flows.length - 1] += exNet;
  const r1 = rows[0];
  const sumCf = rows.reduce((a, x) => a + x.cf, 0);
  return {
    A, kp, kpIn, nk, nkR, nkFix, cK, sonst, fkEff, fin, basis, priv, sumCf,
    mieteKredit: kredit > 0 ? mieteJ / kredit : NaN,
    san, kredit, finK, inv, ek, hmz, mieteJ, vf, kostenJ, kostenFix, kH, noi, verzJ, verzF,
    wechselJ: wJ > 0 ? (wMM * (hmz + bk) * A + n(s.wRen)) / wJ : 0,
    tf, annM, annJ, rows, sale, vkk, buch, gain, exTax, exNet, H,
    net: inv > 0 ? noi / inv : 0,
    brutto: kp > 0 ? mieteJ / kp : 0,
    faktor: mieteJ > 0 ? kp / mieteJ : NaN,
    dscr: annJ > 0 ? noi / annJ : Infinity,
    cf1: r1.cf, cfM: r1.cf / 12, cfPre1: r1.ertrag - r1.paid, st1: r1.st,
    coc: ek > 0 ? r1.cf / ek : NaN, irr: irr(flows), flows,
  };
}
export type Result = ReturnType<typeof calc>;

export function limits(s: S) {
  const r = calc(s), ziel = pc(s.ziel), f = 1 + r.fkEff * r.fin;
  const kmax = ziel > 0 ? ((r.noi / ziel) / f - r.san - r.nkFix - r.sonst) / r.cK : NaN;
  const vf = r.vf, leer = pc(s.leer);
  const fac = r.A * 12 * (1 - leer) * vf - r.kH, base = n(s.extra) * 12 * (1 - leer) * vf - r.kostenFix;
  const need = (x: number) => (fac > 0 ? (x - base) / fac : NaN);
  return { kmax: kmax / r.A, hDscr: need(n(s.dscrZiel) * r.annJ), hNull: need(r.annJ), hZiel: need(ziel * r.inv) };
}

export function stress(s: S) {
  const sc: [string, Partial<S> & { hmzF?: number }][] = [
    ["Basis", {}],
    ["Zins +2 Prozentpunkte", { zins: n(s.zins) + 2, zins2: n(s.zins2) + 2 }],
    ["Leerstand 10 %", { leer: 10 }],
    ["Miete −10 %", { hmzF: 0.9 }],
    ["Kosten +25 %", { verw: n(s.verw) * 1.25, rl: n(s.rl) * 1.25, inst: n(s.inst) * 1.25 }],
    ["Keine Wertsteigerung", { wert: 0 }],
    ["Kombiniert: Zins +1, Leerstand 8 %, Miete −5 %", { zins: n(s.zins) + 1, zins2: n(s.zins2) + 1, leer: 8, hmzF: 0.95 }],
  ];
  return sc.map(([name, o]) => {
    const { hmzF, ...rest } = o;
    return { n: name, r: calc({ ...s, ...rest }, hmzF ? { hmz: hmzOf(s) * hmzF } : {}) };
  });
}

// ---- Formatierung ----
const de = (v: number, d: number) => v.toLocaleString("de-AT", { minimumFractionDigits: d, maximumFractionDigits: d });
export const eur = (v: number) => (isFinite(v) ? (v < 0 ? "−" : "") + Math.round(Math.abs(v)).toLocaleString("de-AT") + " €" : "–");
export const pct = (v: number, d = 1) => (isFinite(v) ? (v < 0 ? "−" : "") + de(Math.abs(v * 100), d) + " %" : "–");
export const n0 = (v: number) => (isFinite(v) ? Math.round(v).toLocaleString("de-AT") : "–");
export const n2 = (v: number) => (isFinite(v) ? de(v, 2) : "–");

/** Exposé-Text (Käufersicht). */
export function exposeText(s: S) {
  const x = calc(kundeS(s)), A = x.A, last = x.rows[x.rows.length - 1];
  return [
    `${s.name || "Anlagewohnung"}${s.adresse ? " – " + s.adresse : ""}`,
    `Nutzfläche ${n0(A)} m² · Kaufpreis ${eur(x.kp)} (${n0(x.kp / A)} €/m²) zzgl. Nebenkosten ca. ${eur(x.nk)}`,
    `Mietzins: ${n2(x.hmz)} €/m² netto (${eur(x.hmz * A + n(s.extra))} pro Monat) zzgl. Betriebskosten und 10 % USt · ${MRG_TEXT[s.mrg]}`,
    `Bruttomietrendite ${pct(x.brutto, 2)} auf den Kaufpreis · Nettomietrendite ${pct(x.net, 2)} nach Kosten und ${s.leer} % Leerstand`,
    `Finanzierungsbeispiel: ${pct(x.inv > 0 ? x.ek / x.inv : 0, 0)} Eigenmittel (${eur(x.ek)}), Kredit ${eur(x.kredit)} zu ${s.zins} % auf ${s.lz} Jahre, Rate ${eur(x.annM)}/Monat`,
    `Monatlicher Überschuss vor Steuern im 1. Jahr: ${eur(x.cfPre1 / 12)}`,
    `Vermögensaufbau: nach ${x.H} Jahren rund ${eur(last.wertT - last.bal)} Eigenkapital im Objekt (bei ${s.wert} % Wertsteigerung p.a.)`,
    `Wertsicherung nach Mieten-Wertsicherungsgesetz, jährlich zum 1. April.`,
    `Beispielrechnung der Maison Estate GmbH auf Basis von Annahmen (Stand ${new Date().toLocaleDateString("de-AT")}). Keine Zusicherung von Ertrag, Mietentwicklung oder Wertsteigerung; keine Steuer- oder Finanzierungsberatung.`,
  ].join("\n");
}
