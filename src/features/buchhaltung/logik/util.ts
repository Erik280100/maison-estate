import type { Zeile } from "../types";

export const cents = (n: unknown) => Math.round(Number(n || 0) * 100);
export const fmt = (c: number | undefined | null) =>
  ((c || 0) / 100).toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtE = (n: unknown) =>
  Number(n || 0).toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const eur = (c: number) => `${fmt(c)} €`;

export function parseNum(v: unknown): number {
  if (typeof v === "number") return v;
  let s = String(v ?? "").trim().replace(/\s|€|EUR/g, "");
  if (!s) return 0;
  const neg = /^-|-$/.test(s);
  s = s.replace(/^-|-$/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isFinite(n) ? (neg ? -n : n) : 0;
}

export const dAT = (iso?: string | null) =>
  iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? iso.slice(0, 10).split("-").reverse().join(".") : "–";
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const isoD = (d: Date) => d.toISOString().slice(0, 10);
export function addMonths(iso: string, m: number): string {
  const d = new Date(iso + "T12:00:00Z");
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + m);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return isoD(d);
}
export const monthEnd = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  return isoD(new Date(Date.UTC(y, m, 0)));
};
export const mName = (ym: string) => {
  const [y, mo] = ym.split("-");
  return new Date(+y, +mo - 1, 1).toLocaleDateString("de-AT", { month: "long", year: "numeric" });
};
export const sumL = (L: Zeile[], k: "soll" | "haben") => L.reduce((a, l) => a + (l[k] || 0), 0);
export const norm = (s: unknown) => String(s || "").toLowerCase().replace(/[^a-z0-9äöüß]/g, "");
export const clean = <T,>(o: T): T => JSON.parse(JSON.stringify(o));
export const uidOk = (u?: string) =>
  !u ||
  /^ATU\d{8}$/.test(u.replace(/\s/g, "")) ||
  /^(?!AT)[A-Z]{2}[0-9A-Z+*]{2,12}$/.test(u.replace(/\s/g, ""));
