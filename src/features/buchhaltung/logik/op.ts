import type { Beleg } from "../types";
import { gebucht } from "./buchung";
import { sumL } from "./util";

export type OffenerPosten = {
  b: Beleg;
  konto: string;
  betrag: number;
  bezahlt: number;
  offen: number;
  typ: "Forderung" | "Verbindlichkeit";
};

export function offenePosten(belege: Beleg[]): OffenerPosten[] {
  const G = gebucht(belege);
  const res: OffenerPosten[] = [];
  G.filter((b) => !b.storniert && (b.art === "ER" || b.art === "AR" || b.art === "KA")).forEach((b) => {
    const k = b.art === "AR" ? "2000" : "3300";
    const L = b.zeilen || [];
    const betrag = b.art === "AR" ? sumL(L.filter((l) => l.konto === k), "soll") : sumL(L.filter((l) => l.konto === k), "haben");
    if (!betrag) return;
    const bez = G.filter((x) => x.ausgleich === b.id && !x.storniert).reduce(
      (a, x) => a + (x.zeilen || []).filter((l) => l.konto === k).reduce((s, l) => s + (b.art === "AR" ? l.haben || 0 : l.soll || 0), 0),
      0,
    );
    const offen = betrag - bez;
    if (offen > 0) res.push({ b, konto: k, betrag, bezahlt: bez, offen, typ: b.art === "AR" ? "Forderung" : "Verbindlichkeit" });
  });
  return res.sort((a, b) => (a.b.faellig || a.b.belegdatum || "").localeCompare(b.b.faellig || b.b.belegdatum || ""));
}
