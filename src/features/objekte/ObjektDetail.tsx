"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { AppLink } from "@/components/ui/AppLink";
import { formatArea, formatPrice } from "@/lib/format";
import { loadObjekt } from "./api";
import { LABELS, type Objekt } from "./types";

const back = (
  <AppLink
    href="/intern/objekte/"
    variant="body2"
    sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "secondary.dark" }}
  >
    <ArrowBackRounded fontSize="small" /> Alle Objekte
  </AppLink>
);

export function ObjektDetail() {
  const id = useSearchParams().get("id");
  const [loaded, setLoaded] = useState<{ id: string; objekt: Objekt | null } | null>(null);

  useEffect(() => {
    if (!id) return;
    let alive = true;
    loadObjekt(id).then((o) => alive && setLoaded({ id, objekt: o }));
    return () => {
      alive = false;
    };
  }, [id]);

  // undefined = lädt noch, null = nicht gefunden
  const objekt: Objekt | null | undefined = !id ? null : loaded?.id === id ? loaded.objekt : undefined;

  if (objekt === undefined)
    return (
      <Box sx={{ display: "grid", placeItems: "center", minHeight: "40vh" }}>
        <CircularProgress color="secondary" />
      </Box>
    );
  if (objekt === null)
    return (
      <>
        {back}
        <Typography sx={{ mt: 3 }}>Objekt nicht gefunden.</Typography>
      </>
    );

  const o = objekt;
  const facts: [string, string][] = [
    ["Objekttyp", LABELS[o.objekttyp]],
    ["Kaufpreis", formatPrice(o.preis)],
    ["Preis pro m²", formatPrice(Math.round(o.preis / o.wohnflaeche))],
    ["Wohnfläche", formatArea(o.wohnflaeche)],
    ["Zimmer", String(o.zimmer)],
    ["Lage", `${o.plz} ${o.ort}${o.bezirk ? `, ${o.bezirk}` : ""}`],
    ["Adresse", o.strasse ?? "–"],
    ["Freifläche", o.freiflaechen.map((x) => LABELS[x]).join(", ") || "–"],
    ["Parken", o.parken.map((x) => LABELS[x]).join(", ") || "–"],
  ];

  return (
    <>
      {back}
      <Stack direction="row" sx={{ mt: 2, alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Typography variant="h3" component="h1">
          {o.titel}
        </Typography>
        <Chip
          label={LABELS[o.status]}
          color={o.status === "verfuegbar" ? "success" : o.status === "reserviert" ? "warning" : "default"}
        />
      </Stack>
      <Grid container spacing={4} sx={{ mt: 1 }}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Box
            sx={{
              aspectRatio: "16 / 10",
              display: "grid",
              placeItems: "center",
              borderRadius: 3,
              color: "secondary.main",
              background: "linear-gradient(135deg, #172a52, #0f1f3d)",
            }}
          >
            Fotos folgen
          </Box>
          {o.beschreibung && (
            <Typography sx={{ mt: 4, lineHeight: 1.8 }}>{o.beschreibung}</Typography>
          )}
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card>
            <Table size="medium">
              <TableBody>
                {facts.map(([k, v]) => (
                  <TableRow key={k} sx={{ "&:last-child td": { border: 0 } }}>
                    <TableCell sx={{ color: "text.secondary", width: "45%" }}>{k}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      {v}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
