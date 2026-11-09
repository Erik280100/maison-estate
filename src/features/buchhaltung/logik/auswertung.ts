import type { Anlage, Beleg, Gesellschafter, Projekt } from "../types";
import { ANLAGE_KONTEN, GWG_GRENZE, OBJEKT_KONTEN, gsKonto } from "../konten";
import { addMonths, cents, monthEnd } from "./util";
import { gebucht } from "./buchung";

export type Saldo = { s: number; h: number };

export function salden(belege: Beleg[], filter?: ((b: Beleg) => boolean) | null): [string, Saldo][] {
  const m: Record<string, Saldo> = {};
  gebucht(belege)
    .filter(filter || (() => true))
    .forEach((b) =>
      (b.zeilen || []).forEach((l) => {
        const k = (m[l.konto] ||= { s: 0, h: 0 });
        k.s += l.soll || 0;
        k.h += l.haben || 0;
      }),
    );
  return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0]));
}

export const bisMonat = (ym: string) => (b: Beleg) => (b.belegdatum || "") <= monthEnd(ym);

export function ustJeMonat(belege: Beleg[]) {
  const m: Record<string, { vst: number; ust: number; rc: number }> = {};
  gebucht(belege).forEach((b) => {
    const mo = (b.belegdatum || "").slice(0, 7);
    if (!mo) return;
    const x = (m[mo] ||= { vst: 0, ust: 0, rc: 0 });
    (b.zeilen || []).forEach((l) => {
      if (l.konto === "2500" || l.konto === "2506") x.vst += (l.soll || 0) - (l.haben || 0);
      if (l.konto === "3500") x.ust += (l.haben || 0) - (l.soll || 0);
      if (l.konto === "3506") {
        x.ust += (l.haben || 0) - (l.soll || 0);
        x.rc += (l.haben || 0) - (l.soll || 0);
      }
    });
  });
  return m;
}

// ---------- Übersicht ----------
export type Monat = { einnahmen: number; ausgaben: number; invObjekte: number; invAnlagen: number };
export type Uebersicht = {
  monate: Record<string, Monat>;
  summe: Monat;
  topKosten: { konto: string; betrag: number }[];
  bank: number;
  kassa: number;
};

export function uebersicht(belege: Beleg[], jahr: string): Uebersicht {
  const monate: Record<string, Monat> = {};
  for (let i = 1; i <= 12; i++) monate[`${jahr}-${String(i).padStart(2, "0")}`] = { einnahmen: 0, ausgaben: 0, invObjekte: 0, invAnlagen: 0 };
  const kosten: Record<string, number> = {};
  let bank = 0, kassa = 0;
  gebucht(belege).forEach((b) => {
    const inJahr = (b.belegdatum || "").startsWith(jahr);
    (b.zeilen || []).forEach((l) => {
      if ((b.belegdatum || "") <= `${jahr}-12-31`) {
        if (l.konto === "2800") bank += (l.soll || 0) - (l.haben || 0);
        if (l.konto === "2700") kassa += (l.soll || 0) - (l.haben || 0);
      }
      if (!inJahr) return;
      const mo = monate[b.belegdatum.slice(0, 7)];
      const k = l.konto;
      const netto = (l.soll || 0) - (l.haben || 0);
      if (k[0] === "4") mo.einnahmen -= netto;
      else if (OBJEKT_KONTEN.includes(k)) mo.invObjekte += netto;
      else if (k[0] === "0") mo.invAnlagen += l.soll || 0;
      else if (["5", "7", "8"].includes(k[0])) {
        mo.ausgaben += netto;
        kosten[k] = (kosten[k] || 0) + netto;
      }
    });
  });
  const summe = Object.values(monate).reduce(
    (a, m) => ({ einnahmen: a.einnahmen + m.einnahmen, ausgaben: a.ausgaben + m.ausgaben, invObjekte: a.invObjekte + m.invObjekte, invAnlagen: a.invAnlagen + m.invAnlagen }),
    { einnahmen: 0, ausgaben: 0, invObjekte: 0, invAnlagen: 0 },
  );
  const topKosten = Object.entries(kosten).map(([konto, betrag]) => ({ konto, betrag })).sort((a, b) => b.betrag - a.betrag).slice(0, 8);
  return { monate, summe, topKosten, bank, kassa };
}

// ---------- Objekte / Projekte ----------
export type ProjektKosten = {
  ankauf: number; nebenkosten: number; material: number; handwerker: number; zinsen: number; sonstiges: number;
  investiert: number; erloes: number; marge: number; roi: number | null;
  belege: Beleg[];
};

export function projektAuswertung(belege: Beleg[], p: Pick<Projekt, "id" | "name">): ProjektKosten {
  const r: ProjektKosten = { ankauf: 0, nebenkosten: 0, material: 0, handwerker: 0, zinsen: 0, sonstiges: 0, investiert: 0, erloes: 0, marge: 0, roi: null, belege: [] };
  gebucht(belege)
    .filter((b) => b.projektId === p.id || (!b.projektId && b.objekt && b.objekt === p.name))
    .forEach((b) => {
      r.belege.push(b);
      (b.zeilen || []).forEach((l) => {
        const n = (l.soll || 0) - (l.haben || 0);
        const k = l.konto;
        if (k === "5000") r.ankauf += n;
        else if (k === "5100") r.nebenkosten += n;
        else if (k === "5300") r.material += n;
        else if (k === "5800") r.handwerker += n;
        else if (k === "8280") r.zinsen += n;
        else if (k[0] === "7") r.sonstiges += n;
        else if (k[0] === "4") r.erloes -= n;
      });
    });
  r.investiert = r.ankauf + r.nebenkosten + r.material + r.handwerker + r.zinsen + r.sonstiges;
  r.marge = r.erloes - r.investiert;
  r.roi = r.investiert > 0 && r.erloes > 0 ? r.marge / r.investiert : null;
  return r;
}

// ---------- Anlagen / AfA ----------
export type AfaZeile = { jahr: number; afa: number; restbuchwert: number };

export const istGwg = (akEuro: number) => cents(akEuro) <= GWG_GRENZE;

/** Lineare AfA mit Halbjahresregel (Anschaffung in der 2. Jahreshälfte → halbe AfA im ersten Jahr). GWG: Sofortabschreibung. */
export function afaPlan(a: Pick<Anlage, "ak" | "anschaffung" | "nutzungsdauer" | "konto">): AfaZeile[] {
  const ak = cents(a.ak);
  const j0 = Number(a.anschaffung.slice(0, 4));
  const monat = Number(a.anschaffung.slice(5, 7));
  if (!ak || !j0) return [];
  if (a.konto === "0680" || istGwg(a.ak)) return [{ jahr: j0, afa: ak, restbuchwert: 0 }];
  const nd = Math.max(1, Number(a.nutzungsdauer) || 1);
  const voll = Math.round(ak / nd);
  const rows: AfaZeile[] = [];
  let rest = ak;
  for (let j = j0; rest > 0 && j < j0 + nd + 2; j++) {
    let afa = j === j0 && monat >= 7 ? Math.round(voll / 2) : voll;
    afa = Math.min(afa, rest);
    rest -= afa;
    rows.push({ jahr: j, afa, restbuchwert: rest });
  }
  return rows;
}

export const mindestNutzungsdauer = (konto: string) => (konto === "0630" ? 8 : 1);
export const afaKontoFuer = (a: Pick<Anlage, "konto" | "ak">) => (a.konto === "0680" || istGwg(a.ak) ? "7020" : "7010");
export const isAnlagenKonto = (k: string) => ANLAGE_KONTEN.includes(k);
/** Bereits gebuchte AfA je Jahr (aus den gebuchten, nicht stornierten AfA-Belegen). */
export function afaGebuchtMap(belege: Beleg[], a: Pick<Anlage, "id">): Record<number, number> {
  const m: Record<number, number> = {};
  gebucht(belege)
    .filter((b) => b.anlageId === a.id && b.afaJahr && !b.storniert)
    .forEach((b) => {
      m[b.afaJahr!] = (m[b.afaJahr!] || 0) + (b.zeilen || []).filter((l) => l.konto.startsWith("0")).reduce((s, l) => s + (l.haben || 0) - (l.soll || 0), 0);
    });
  return m;
}
export const naechsteAfa = (belege: Beleg[], a: Anlage) => {
  const m = afaGebuchtMap(belege, a);
  const entwuerfe = belege.filter((b) => b.status === "Entwurf" && b.anlageId === a.id && b.afaJahr).map((b) => b.afaJahr);
  return afaPlan(a).find((r) => !m[r.jahr] && !entwuerfe.includes(r.jahr));
};
export const afaBelegDatum = (jahr: number) => `${jahr}-12-31`;

// ---------- Gesellschafter ----------
export type GsSaldo = {
  g: Gesellschafter;
  auslagen: number;
  erstattet: number;
  saldo: number;
  stammkapital: number;
  zuschuss: number;
  darlehen: number;
};

export function gsSalden(belege: Beleg[], gs: Gesellschafter[]): GsSaldo[] {
  const G = gebucht(belege);
  return gs.map((g) => {
    const k = gsKonto(g);
    let auslagen = 0, erstattet = 0, stamm = 0, zusch = 0, darl = 0;
    G.forEach((b) =>
      (b.zeilen || []).forEach((l) => {
        if (l.konto === k) {
          auslagen += l.haben || 0;
          erstattet += l.soll || 0;
        }
        if (b.gs === g.id) {
          if (l.konto === "9000") stamm += (l.haben || 0) - (l.soll || 0);
          if (l.konto === "9100") zusch += (l.haben || 0) - (l.soll || 0);
          if (l.konto === "3180") darl += (l.haben || 0) - (l.soll || 0);
        }
      }),
    );
    return { g, auslagen, erstattet, saldo: auslagen - erstattet, stammkapital: stamm, zuschuss: zusch, darlehen: darl };
  });
}

export const jahreVon = (belege: Beleg[]) =>
  [...new Set([String(new Date().getFullYear()), ...gebucht(belege).map((b) => (b.belegdatum || "").slice(0, 4)).filter(Boolean)])].sort().reverse();
export const monateVon = (belege: Beleg[]) =>
  [...new Set(gebucht(belege).map((b) => (b.belegdatum || "").slice(0, 7)).filter(Boolean))].sort().reverse();

export { addMonths };
