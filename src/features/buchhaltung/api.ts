import type { SupabaseClient } from "@supabase/supabase-js";
import type { Anlage, Auszug, Beleg, Gesellschafter, Kredit, Perioden, Projekt, Protokoll } from "./types";
import { GENESIS, HASH_VERSION, hashInput, sha256Hex } from "./logik/hash";
import { clean, fmt, mName, sumL } from "./logik/util";
import { ARTEN } from "./konten";

const TABLE = "buchhaltung_docs";
const BUCKET = "buchhaltung";
const PAGE = 1000;

type Row = { collection: string; id: string; data: Record<string, unknown> };

export type Daten = {
  belege: Beleg[];
  auszuege: Auszug[];
  kredite: Kredit[];
  gesellschafter: Gesellschafter[];
  projekte: Projekt[];
  anlagen: Anlage[];
  protokoll: Protokoll[];
  perioden: Perioden;
  kopfHash?: string;
};

export const LEER: Daten = { belege: [], auszuege: [], kredite: [], gesellschafter: [], projekte: [], anlagen: [], protokoll: [], perioden: {} };

const fail = (e: { code?: string; message: string }) => Object.assign(new Error(e.message), { code: e.code });

/** Tabelle/Funktion fehlt (SQL 007 noch nicht ausgeführt) */
export const isMissing = (code?: string) => ["PGRST205", "PGRST202", "42P01", "42883"].includes(code ?? "");

export async function ladeAlles(sb: SupabaseClient): Promise<Daten> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb
      .from(TABLE)
      .select("collection,id,data")
      .neq("collection", "protokoll")
      .order("collection")
      .order("id")
      .range(from, from + PAGE - 1);
    if (error) throw fail(error);
    rows.push(...((data ?? []) as Row[]));
    if (!data || data.length < PAGE) break;
  }
  const prot = await sb
    .from(TABLE)
    .select("id,data")
    .eq("collection", "protokoll")
    .order("data->>zeit", { ascending: false })
    .limit(300);
  if (prot.error) throw fail(prot.error);

  const of = <T,>(c: string) => rows.filter((r) => r.collection === c).map((r) => ({ id: r.id, ...r.data }) as T);
  const sys = (id: string) => (rows.find((r) => r.collection === "system" && r.id === id)?.data ?? {}) as Record<string, unknown>;
  return {
    belege: of<Beleg>("belege"),
    auszuege: of<Auszug>("auszuege"),
    kredite: of<Kredit>("kredite"),
    gesellschafter: of<Gesellschafter>("gesellschafter").sort((a, b) => a.nr - b.nr),
    projekte: of<Projekt>("projekte").sort((a, b) => a.name.localeCompare(b.name)),
    anlagen: of<Anlage>("anlagen"),
    protokoll: ((prot.data ?? []) as { id: string; data: Omit<Protokoll, "id"> }[]).map((r) => ({ id: r.id, ...r.data })),
    perioden: sys("perioden") as Perioden,
    kopfHash: sys("kette").hash as string | undefined,
  };
}

export function abonnieren(sb: SupabaseClient, onChange: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const bounce = () => {
    clearTimeout(timer);
    timer = setTimeout(onChange, 400);
  };
  const ch = sb
    .channel(`bh-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE }, bounce)
    .subscribe();
  const poll = setInterval(onChange, 30000);
  return () => {
    clearTimeout(timer);
    clearInterval(poll);
    void sb.removeChannel(ch);
  };
}

// ---------- Dokumente ----------
export async function neu<T extends object>(sb: SupabaseClient, collection: string, data: T): Promise<string> {
  const id = crypto.randomUUID();
  const { error } = await sb.from(TABLE).insert({ collection, id, data: clean(data) });
  if (error) throw fail(error);
  return id;
}
export async function setzen<T extends object>(sb: SupabaseClient, collection: string, id: string, data: T) {
  const d = { ...clean(data) } as Record<string, unknown>;
  delete d.id;
  const { error } = await sb.from(TABLE).upsert({ collection, id, data: d, updated_at: new Date().toISOString() });
  if (error) throw fail(error);
}
export async function aendern(sb: SupabaseClient, collection: string, id: string, patch: object) {
  const { error } = await sb.rpc("bh_update", { p_collection: collection, p_id: id, p_patch: clean(patch) });
  if (error) throw fail(error);
}
export async function loeschen(sb: SupabaseClient, collection: string, id: string) {
  const { data, error } = await sb.from(TABLE).delete().eq("collection", collection).eq("id", id).select("id");
  if (error) throw fail(error);
  if (!data?.length) throw Object.assign(new Error("Löschen nicht erlaubt (gebuchte Belege bleiben erhalten)."), { code: "denied" });
}
export function protokollieren(sb: SupabaseClient, user: string | null, aktion: string, details = "") {
  void sb.from(TABLE).insert({ collection: "protokoll", id: crypto.randomUUID(), data: { zeit: new Date().toISOString(), user, aktion, details } });
}

export async function profile(sb: SupabaseClient, ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const { data } = await sb.rpc("bh_profiles", { p_ids: ids });
  return Object.fromEntries(((data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name]));
}

// ---------- Originalbelege ----------
export async function hochladen(sb: SupabaseClient, file: Blob): Promise<string> {
  const id = crypto.randomUUID();
  const { error } = await sb.storage.from(BUCKET).upload(`belege/${id}`, file, { contentType: file.type || "application/octet-stream", upsert: false });
  if (error) throw fail(error);
  return id;
}
const blobCache = new Map<string, Promise<Blob>>();
export function belegBlob(sb: SupabaseClient, id: string): Promise<Blob> {
  let p = blobCache.get(id);
  if (!p) {
    p = sb.storage.from(BUCKET).download(`belege/${id}`).then(({ data, error }) => {
      if (error || !data) throw fail(error ?? { message: "nicht gefunden" });
      return data;
    });
    p.catch(() => blobCache.delete(id));
    blobCache.set(id, p);
  }
  return p;
}

// ---------- Buchen (Sperre, Nummernkreis, Hash-Kette) ----------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function buchen(
  sb: SupabaseClient,
  holder: string,
  uid: string | null,
  rec: Partial<Beleg> & { art: Beleg["art"]; belegdatum: string },
  existingId: string | null,
): Promise<{ id: string; nr: string }> {
  let ok = false;
  for (let i = 0; i < 15 && !ok; i++) {
    const { data, error } = await sb.rpc("bh_acquire", { p_path: "system/kette", p_holder: holder, p_ttl_ms: 8000 });
    if (error) throw fail(error);
    ok = data === true;
    if (!ok) await sleep(700);
  }
  if (!ok) throw new Error("Gerade bucht ein anderer Gesellschafter. Bitte in einigen Sekunden erneut versuchen.");

  const sys = await sb.from(TABLE).select("id,data").eq("collection", "system").in("id", ["kette", "perioden"]);
  if (sys.error) throw fail(sys.error);
  const head = (sys.data?.find((r) => r.id === "kette")?.data ?? {}) as { seq?: number; hash?: string; kreise?: Record<string, number> };
  const per = (sys.data?.find((r) => r.id === "perioden")?.data ?? {}) as Perioden;
  if (per.gesperrtBis && rec.belegdatum.slice(0, 7) <= per.gesperrtBis) throw new Error(`Der Zeitraum bis ${mName(per.gesperrtBis)} ist festgeschrieben.`);

  const key = `${rec.art}-${rec.belegdatum.slice(0, 4)}`;
  // höchste vergebene Nummer / Folge direkt aus der Datenbank (nicht aus dem lokalen Stand)
  const nrs = await sb.from(TABLE).select("nr:data->>nr,seq:data->>seq").eq("collection", "belege").not("data->>nr", "is", null);
  if (nrs.error) throw fail(nrs.error);
  let maxKreis = 0, maxSeq = 0;
  (nrs.data as unknown as { nr: string | null; seq: string | null }[]).forEach((r) => {
    if (r.nr?.startsWith(key + "-")) maxKreis = Math.max(maxKreis, parseInt(r.nr.slice(key.length + 1), 10) || 0);
    maxSeq = Math.max(maxSeq, parseInt(r.seq ?? "0", 10) || 0);
  });
  const kreise = { ...(head.kreise ?? {}) };
  kreise[key] = Math.max(kreise[key] ?? 0, maxKreis) + 1;

  const full: Beleg = {
    ...(rec as Beleg),
    nr: `${key}-${String(kreise[key]).padStart(4, "0")}`,
    seq: Math.max(head.seq ?? 0, maxSeq) + 1,
    hv: HASH_VERSION,
    prevHash: head.hash ?? GENESIS,
    status: "Gebucht",
    gebuchtAm: new Date().toISOString(),
    gebuchtVon: uid,
    zeilen: (rec.zeilen ?? []).map((l) => ({ konto: l.konto, soll: l.soll || 0, haben: l.haben || 0, text: l.text || "" })),
  };
  full.hash = await sha256Hex(hashInput(full));
  const data = clean(full) as unknown as Record<string, unknown>;
  delete data.id;
  const id = existingId ?? crypto.randomUUID();
  const w = await sb.from(TABLE).upsert({ collection: "belege", id, data, updated_at: new Date().toISOString() });
  if (w.error) throw fail(w.error);
  const k = await sb.from(TABLE).upsert({
    collection: "system", id: "kette",
    data: { seq: full.seq, hash: full.hash, kreise, letzte: full.nr, zeit: full.gebuchtAm },
    updated_at: new Date().toISOString(),
  });
  if (k.error) throw fail(k.error);
  protokollieren(sb, uid, "Gebucht", `${full.nr} · ${ARTEN[full.art]} · ${fmt(sumL(full.zeilen ?? [], "soll"))} € · Hash ${full.hash.slice(0, 12)}`);
  return { id, nr: full.nr! };
}
