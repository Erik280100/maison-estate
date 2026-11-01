import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Bildet die Laufzeit-Funktionen, die das Buchhaltungs-Tool von claude.ai
 * erwartet (claude.use("db" | "assets" | "user" | "downloads" | "sample")),
 * auf Supabase ab. Die Tabellen/Buckets stehen in supabase/007_buchhaltung.sql.
 */

const BUCKET = "buchhaltung";
const TABLE = "buchhaltung_docs";
const POLL_MS = 20000;

type Json = Record<string, unknown>;
type Unsub = () => void;

const fail = (code: string, message?: string) =>
  Object.assign(new Error(message ?? code), { code });

export function createCapabilities(sb: SupabaseClient, userId: string, email: string) {
  const snapshotOf = (rows: { id: string; data: Json }[]) => ({
    docs: rows.map((r) => ({ id: r.id, data: () => r.data })),
  });

  // Live-Abo: initial laden, bei Änderung (Realtime) und regelmäßig neu laden.
  function watch(collection: string, load: () => Promise<void>, onError?: (e: unknown) => void): Unsub {
    let stopped = false;
    const run = () => {
      if (!stopped) load().catch((e) => onError?.(fail(e?.code ?? "unavailable", e?.message)));
    };
    run();
    const channel = sb
      .channel(`bh-${collection}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: TABLE, filter: `collection=eq.${collection}` }, run)
      .subscribe();
    const timer = setInterval(run, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(timer);
      void sb.removeChannel(channel);
    };
  }

  const check = (error: { code?: string; message: string } | null) => {
    if (error) throw fail(error.code ?? "error", error.message);
  };

  function query(collection: string, order?: { field: string; desc: boolean }, max?: number) {
    const fetchRows = async () => {
      let q = sb.from(TABLE).select("id,data").eq("collection", collection);
      if (order) q = q.order(`data->>${order.field}`, { ascending: !order.desc });
      if (max) q = q.limit(max);
      const { data, error } = await q;
      check(error);
      return (data ?? []) as { id: string; data: Json }[];
    };
    return {
      get: async () => snapshotOf(await fetchRows()),
      onSnapshot(next: (s: ReturnType<typeof snapshotOf>) => void, err?: (e: unknown) => void) {
        return watch(collection, async () => next(snapshotOf(await fetchRows())), err);
      },
      orderBy: (field: string, dir?: string) => query(collection, { field, desc: dir === "desc" }, max),
      limit: (n: number) => query(collection, order, n),
    };
  }

  const db = {
    collection(name: string) {
      return {
        ...query(name),
        async add(data: Json) {
          const id = crypto.randomUUID();
          const { error } = await sb.from(TABLE).insert({ collection: name, id, data });
          check(error);
          return { id };
        },
      };
    },
    doc(path: string) {
      const i = path.indexOf("/");
      const collection = path.slice(0, i);
      const id = path.slice(i + 1);
      const read = async () => {
        const { data, error } = await sb
          .from(TABLE).select("data").eq("collection", collection).eq("id", id).maybeSingle();
        check(error);
        return (data?.data as Json | undefined) ?? undefined;
      };
      return {
        id,
        get: async () => {
          const d = await read();
          return { data: () => d };
        },
        async set(data: Json) {
          const { error } = await sb
            .from(TABLE).upsert({ collection, id, data, updated_at: new Date().toISOString() });
          check(error);
        },
        async update(patch: Json) {
          const { error } = await sb.rpc("bh_update", { p_collection: collection, p_id: id, p_patch: patch });
          check(error);
        },
        async delete() {
          const { error } = await sb.from(TABLE).delete().eq("collection", collection).eq("id", id);
          check(error);
        },
        async acquire({ holder, ttlMs }: { holder: string; ttlMs: number }) {
          const { data, error } = await sb.rpc("bh_acquire", { p_path: path, p_holder: holder, p_ttl_ms: ttlMs });
          check(error);
          return { acquired: data === true };
        },
        onSnapshot(next: (s: { data: () => Json | undefined }) => void, err?: (e: unknown) => void) {
          return watch(collection, async () => {
            const d = await read();
            next({ data: () => d });
          }, err);
        },
      };
    },
  };

  const blobCache = new Map<string, Promise<Blob>>();
  /** Originalbeleg aus dem privaten Bucket (nur mit Login). */
  const blob = (id: string) => {
    let p = blobCache.get(id);
    if (!p) {
      p = sb.storage.from(BUCKET).download(`belege/${id}`).then(({ data, error }) => {
        if (error || !data) throw fail("not-found", error?.message);
        return data;
      });
      p.catch(() => blobCache.delete(id));
      blobCache.set(id, p);
    }
    return p;
  };

  const assets = {
    async upload(file: File | Blob) {
      const id = crypto.randomUUID();
      const { error } = await sb.storage
        .from(BUCKET)
        .upload(`belege/${id}`, file, { contentType: file.type || "application/octet-stream", upsert: false });
      check(error);
      return { id };
    },
  };

  const user = {
    id: async () => userId,
    me: async () => ({ name: email }),
    async profiles(ids: string[]) {
      const { data, error } = await sb.rpc("bh_profiles", { p_ids: ids });
      check(error);
      return Object.fromEntries(
        ((data ?? []) as { id: string; name: string }[]).map((p) => [p.id, { name: p.name }]),
      );
    },
  };

  const downloads = {
    async save({ filename, data }: { filename: string; data: Blob }) {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    },
  };

  const caps: Record<string, unknown> = { db, assets, user, downloads };
  return {
    blob,
    /** claude.use(name): "sample" (KI-Auslesen) ist hier bewusst nicht verfügbar. */
    use: async (name: string) => {
      if (!(name in caps)) throw fail("unavailable");
      return caps[name];
    },
  };
}
