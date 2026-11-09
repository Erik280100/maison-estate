"use client";

import { useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CloudUploadOutlined from "@mui/icons-material/CloudUploadOutlined";
import { useBh } from "../BhProvider";
import { BelegEditor } from "../BelegEditor";
import { ARTEN } from "../konten";
import { validate } from "../logik/buchung";
import { dAT, fmt, today } from "../logik/util";
import { useNav } from "../nav";
import { leerBeleg, rechnungAnlegen } from "../upload";
import type { Art, Beleg } from "../types";
import { Pill, Sel } from "../ui";

type Q = { id: string; name: string; status: "läuft" | "fehler"; fehler?: string };

export function Belege() {
  const { sb, uid, d, ctx, who, reload, toast } = useBh();
  const { edit, openBeleg, closeEdit } = useNav();
  const [art, setArt] = useState<Art>("ER");
  const [queue, setQueue] = useState<Q[]>([]);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const run = async (files: FileList | File[]) => {
    for (const f of [...files]) {
      const q: Q = { id: Math.random().toString(36).slice(2), name: f.name, status: "läuft" };
      setQueue((x) => [...x, q]);
      try {
        const r = await rechnungAnlegen(sb, uid, f, art);
        setQueue((x) => x.filter((y) => y.id !== q.id));
        await reload();
        if (!edit) openBeleg(r.beleg);
        toast(`„${f.name}“ abgelegt – bitte prüfen`);
      } catch (e) {
        setQueue((x) => x.map((y) => (y.id === q.id ? { ...y, status: "fehler", fehler: (e as Error).message } : y)));
      }
    }
  };

  const drafts = d.belege.filter((b) => b.status === "Entwurf").sort((a, b) => (b.erfasstAm || "").localeCompare(a.erfasstAm || ""));

  return (
    <Box sx={{ display: "grid", gap: 2.5, gridTemplateColumns: { xs: "1fr", lg: "minmax(0,340px) minmax(0,1fr)" }, alignItems: "start" }}>
      <Stack spacing={1.5}>
        <Sel label="Art der Belege" value={art} onChange={(a) => setArt(a as Art)} options={[["ER", "Eingangsrechnung (Ausgabe)"], ["AR", "Ausgangsrechnung (Einnahme)"], ["KA", "Kassabeleg / Quittung"]]} />
        <Card
          variant="outlined"
          onDragOver={(e) => { e.preventDefault(); setOver(true); }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => { e.preventDefault(); setOver(false); void run(e.dataTransfer.files); }}
          sx={{ borderStyle: "dashed", borderColor: "secondary.main", bgcolor: over ? "action.hover" : undefined }}
        >
          <CardActionArea onClick={() => input.current?.click()} sx={{ p: 3, textAlign: "center" }}>
            <CloudUploadOutlined color="secondary" />
            <Typography sx={{ fontWeight: 700 }}>Rechnungen hier ablegen</Typography>
            <Typography variant="body2" color="text.secondary">
              PDF, JPG oder PNG – auch mehrere. Das Original wird revisionssicher gespeichert, Datum, Partner und Beträge werden aus dem PDF-Text vorbefüllt.
            </Typography>
          </CardActionArea>
          <input ref={input} type="file" hidden multiple accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => { if (e.target.files) void run(e.target.files); e.target.value = ""; }} />
        </Card>
        <Button variant="outlined" onClick={() => openBeleg({ id: "", ...leerBeleg("MB"), art: "MB", manuell: true, belegdatum: today(), vorsteuer: false,
          zeilen: [{ konto: "2800", soll: 0, haben: 0, text: "" }, { konto: "9000", soll: 0, haben: 0, text: "" }], positionen: [], _lokal: true } as Beleg & { _lokal: boolean })}>
          Manuelle Buchung
        </Button>
        {queue.map((q) => (
          <Alert key={q.id} severity={q.status === "fehler" ? "error" : "info"} icon={q.status === "läuft" ? <CircularProgress size={16} /> : undefined}
            action={q.status === "fehler" ? <Button size="small" onClick={() => setQueue((x) => x.filter((y) => y.id !== q.id))}>Ausblenden</Button> : undefined}>
            {q.name}{q.fehler ? `: ${q.fehler}` : " wird abgelegt …"}
          </Alert>
        ))}
        <Stack direction="row" sx={{ justifyContent: "space-between" }}><Typography variant="overline" color="text.secondary">Zu prüfen</Typography><Typography variant="caption" color="text.secondary">{drafts.length ? `${drafts.length} Entwürfe` : ""}</Typography></Stack>
        {!drafts.length && <Typography variant="body2" color="text.secondary">Keine offenen Entwürfe. Neue Rechnungen erscheinen hier, sobald sie abgelegt sind.</Typography>}
        {drafts.map((b) => {
          const v = validate(b, ctx);
          return (
            <Card key={b.id} variant="outlined" sx={{ borderColor: edit?.id === b.id ? "secondary.main" : undefined }}>
              <CardActionArea onClick={() => openBeleg(b)} sx={{ p: 1.5 }}>
                <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1 }}>
                  <Typography noWrap sx={{ fontWeight: 600 }}>{b.partner || b.fileName || "Ohne Partner"}</Typography>
                  <Typography sx={{ fontVariantNumeric: "tabular-nums" }}>{fmt(v.so)} €</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{ARTEN[b.art]} · {dAT(b.belegdatum)}{b.erfasstVon ? ` · von ${who(b.erfasstVon)}` : ""}</Typography>
                <Box sx={{ mt: 0.5 }}>{v.err.length ? <Pill tone="err">{`${v.err.length} Fehler`}</Pill> : v.warn.length ? <Pill tone="warn">prüfen</Pill> : <Pill tone="ok">bereit</Pill>}</Box>
              </CardActionArea>
            </Card>
          );
        })}
      </Stack>

      <Box sx={{ minWidth: 0 }}>
        {edit ? (
          <BelegEditor key={edit.id || "neu"} start={edit} onClose={closeEdit} />
        ) : (
          <Card variant="outlined" sx={{ p: 4, textAlign: "center" }}>
            <Typography sx={{ fontWeight: 700 }}>Kein Beleg ausgewählt</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: "62ch", mx: "auto" }}>
              Rechnung links ablegen oder einen Entwurf öffnen. Das Tool rechnet den Buchungssatz selbst und prüft Soll/Haben, USt, Rechnungsmerkmale nach § 11 UStG und die Kassa.
              Gebucht wird erst nach deiner Prüfung. Jede Buchung erhält eine lückenlose Belegnummer und wird über eine SHA-256-Kette versiegelt.
            </Typography>
          </Card>
        )}
      </Box>
    </Box>
  );
}
