"use client";

import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import TextField from "@mui/material/TextField";
import ClearRounded from "@mui/icons-material/ClearRounded";
import SearchRounded from "@mui/icons-material/SearchRounded";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import FilterListRounded from "@mui/icons-material/FilterListRounded";
import MeetingRoomRounded from "@mui/icons-material/MeetingRoomRounded";
import SquareFootRounded from "@mui/icons-material/SquareFootRounded";
import { LinkCardActionArea } from "@/components/ui/AppLink";
import { formatArea, formatPrice } from "@/lib/format";
import { loadObjekte, type LoadResult } from "./api";
import { activeFilterCount, applyFilter, emptyFilter, type Filter, type SortKey } from "./filter";
import { FilterPanel } from "./FilterPanel";
import { LABELS, type Objekt, type ObjektStatus } from "./types";

const statusColor: Record<ObjektStatus, "success" | "warning" | "default"> = {
  verfuegbar: "success",
  reserviert: "warning",
  verkauft: "default",
};

function ObjektZeile({ o }: { o: Objekt }) {
  const alle = [
    LABELS[o.objekttyp],
    ...(o.zustand ? [LABELS[o.zustand]] : []),
    ...o.freiflaechen.map((x) => LABELS[x]),
    ...o.parken.map((x) => LABELS[x]),
    ...o.ausstattung.map((x) => LABELS[x]),
  ];
  const MAX = 7;
  const tags = alle.length > MAX ? [...alle.slice(0, MAX), `+${alle.length - MAX}`] : alle;
  return (
    <Card sx={{ "&:hover": { boxShadow: 6, borderColor: "secondary.main" } }}>
      <LinkCardActionArea href={`/intern/objekte/detail/?id=${o.id}`}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "200px 1fr", md: "220px 1fr auto" },
            alignItems: "stretch",
          }}
        >
          <Box
            sx={{
              minHeight: { xs: 160, sm: 140 },
              display: "grid",
              placeItems: "center",
              color: "secondary.main",
              background: "linear-gradient(135deg, #172a52, #0f1f3d)",
              fontSize: 13,
            }}
          >
            Foto folgt
          </Box>
          <CardContent sx={{ p: 2.5, minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary">
              {o.plz} {o.ort}
              {o.bezirk ? `, ${o.bezirk}` : ""}
            </Typography>
            <Typography variant="h6" component="h3" sx={{ mt: 0.25 }}>
              {o.titel}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 1, color: "text.secondary" }}>
              <Typography variant="body2" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                <SquareFootRounded fontSize="small" /> {formatArea(o.wohnflaeche)}
              </Typography>
              <Typography variant="body2" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                <MeetingRoomRounded fontSize="small" /> {o.zimmer} Zimmer
              </Typography>
            </Stack>
            <Stack direction="row" useFlexGap spacing={0.75} sx={{ mt: 1.5, flexWrap: "wrap" }}>
              {tags.map((t) => (
                <Chip key={t} label={t} size="small" variant="outlined" />
              ))}
            </Stack>
          </CardContent>
          <Box
            sx={{
              p: 2.5,
              display: "flex",
              flexDirection: { xs: "row", md: "column" },
              alignItems: { xs: "center", md: "flex-end" },
              justifyContent: "space-between",
              gap: 1,
              gridColumn: { sm: "1 / -1", md: "auto" },
            }}
          >
            <Chip label={LABELS[o.status]} size="small" color={statusColor[o.status]} />
            <Box sx={{ textAlign: { md: "right" } }}>
              <Typography variant="h5" sx={{ color: "secondary.dark" }}>
                {formatPrice(o.preis)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatPrice(Math.round(o.preis / o.wohnflaeche))} / m²
              </Typography>
            </Box>
          </Box>
        </Box>
      </LinkCardActionArea>
    </Card>
  );
}

export function ObjekteSuche() {
  const [data, setData] = useState<LoadResult | null>(null);
  const [filter, setFilter] = useState<Filter>(emptyFilter);
  const [showFilter, setShowFilter] = useState(true);

  useEffect(() => {
    let alive = true;
    loadObjekte().then((r) => alive && setData(r));
    return () => {
      alive = false;
    };
  }, []);

  const treffer = useMemo(() => (data ? applyFilter(data.objekte, filter) : []), [data, filter]);
  const count = activeFilterCount(filter);

  return (
    <>
      <Typography variant="h3" component="h1">
        Objekte
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1 }}>
        Suchen und filtern.
      </Typography>

      {data?.demo && (
        <Alert severity="info" sx={{ mt: 3 }}>
          <strong>Beispieldaten.</strong> Die Tabelle „objekte“ gibt es in Supabase noch nicht. Führe{" "}
          <code>supabase/001_objekte.sql</code> im SQL Editor aus, dann erscheinen hier eure echten Objekte.
        </Alert>
      )}
      {data?.error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {data.error}
        </Alert>
      )}

      <TextField
        fullWidth
        type="search"
        size="medium"
        label="Stichwortsuche"
        placeholder="Alles durchsuchen: Titel, Ort, PLZ, Preis, Fläche, Ausstattung … (z. B. 23 oder Wien Terrasse)"
        value={filter.suche}
        onChange={(e) => setFilter({ ...filter, suche: e.target.value })}
        sx={{ mt: 4, "& .MuiOutlinedInput-root": { bgcolor: "background.paper" } }}
        slotProps={{
          inputLabel: { shrink: true },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded />
              </InputAdornment>
            ),
            endAdornment: filter.suche ? (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  aria-label="Suche leeren"
                  onClick={() => setFilter({ ...filter, suche: "" })}
                >
                  <ClearRounded fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />

      <Card component="section" aria-label="Filter" sx={{ mt: 2, p: { xs: 2, sm: 3 } }}>
        <Stack
          direction="row"
          sx={{ alignItems: "center", justifyContent: "space-between", mb: showFilter ? 3 : 0 }}
        >
          <Badge badgeContent={count} color="secondary" invisible={count === 0}>
            <Button
              startIcon={<FilterListRounded />}
              onClick={() => setShowFilter((v) => !v)}
              aria-expanded={showFilter}
              sx={{ pr: count ? 2 : undefined }}
            >
              Filter {showFilter ? "ausblenden" : "anzeigen"}
            </Button>
          </Badge>
          {count > 0 && (
            <Button color="secondary" onClick={() => setFilter({ ...emptyFilter, sort: filter.sort })}>
              Zurücksetzen
            </Button>
          )}
        </Stack>
        <Collapse in={showFilter}>
          <FilterPanel filter={filter} onChange={setFilter} />
        </Collapse>
      </Card>

      <Stack
        direction="row"
        sx={{ mt: 5, mb: 2, gap: 2, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}
      >
        <Typography aria-live="polite" color="text.secondary">
          {data ? `${treffer.length} von ${data.objekte.length} Objekten` : "Wird geladen …"}
        </Typography>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="sort-label">Sortierung</InputLabel>
          <Select
            labelId="sort-label"
            label="Sortierung"
            value={filter.sort}
            onChange={(e) => setFilter({ ...filter, sort: e.target.value as SortKey })}
          >
            <MenuItem value="neueste">Neueste zuerst</MenuItem>
            <MenuItem value="preis-auf">Preis aufsteigend</MenuItem>
            <MenuItem value="preis-ab">Preis absteigend</MenuItem>
            <MenuItem value="flaeche-ab">Wohnfläche absteigend</MenuItem>
          </Select>
        </FormControl>
      </Stack>

      <Stack spacing={2}>
        {!data &&
          [0, 1, 2].map((i) => <Skeleton key={i} variant="rounded" height={150} />)}
        {treffer.map((o) => (
          <ObjektZeile key={o.id} o={o} />
        ))}
        {data && !data.error && treffer.length === 0 && (
          <Card sx={{ p: 6, textAlign: "center" }}>
            <Typography color="text.secondary">
              {data.objekte.length === 0
                ? "Noch keine Objekte angelegt."
                : "Keine Objekte für diese Filter. Versuche, einzelne Filter zu lockern."}
            </Typography>
          </Card>
        )}
      </Stack>
    </>
  );
}
