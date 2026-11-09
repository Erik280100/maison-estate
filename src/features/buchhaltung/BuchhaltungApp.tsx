"use client";

import { useEffect, useMemo, useState } from "react";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { BhProvider, useBh } from "./BhProvider";
import { NavContext, type EditBeleg } from "./nav";
import { offenePosten } from "./logik/op";
import { addMonths, today } from "./logik/util";
import { Anlagen } from "./tabs/Anlagen";
import { Archiv } from "./tabs/Archiv";
import { Bank } from "./tabs/Bank";
import { Belege } from "./tabs/Belege";
import { Journal, Saldenliste, Umsatzsteuer } from "./tabs/Berichte";
import { Gesellschafter } from "./tabs/Gesellschafter";
import { Kredite } from "./tabs/Kredite";
import { Objekte } from "./tabs/Objekte";
import { OffenePosten } from "./tabs/OffenePosten";
import { Pruefung } from "./tabs/Pruefung";
import { Uebersicht } from "./tabs/Uebersicht";

const TABS: { id: string; label: string }[] = [
  { id: "uebersicht", label: "Übersicht" },
  { id: "belege", label: "Belege" },
  { id: "archiv", label: "Archiv" },
  { id: "bank", label: "Bank" },
  { id: "objekte", label: "Objekte" },
  { id: "anlagen", label: "Anlagen" },
  { id: "gesellschafter", label: "Gesellschafter" },
  { id: "kredite", label: "Kredite" },
  { id: "op", label: "Offene Posten" },
  { id: "journal", label: "Journal" },
  { id: "konten", label: "Saldenliste" },
  { id: "ust", label: "Umsatzsteuer" },
  { id: "pruefung", label: "Prüfung" },
];

function Inhalt() {
  const { d } = useBh();
  const [tab, setTabState] = useState("uebersicht");
  const [edit, setEdit] = useState<EditBeleg | null>(null);

  const setTab = (t: string) => {
    setTabState(t);
    try { history.replaceState(null, "", "#" + t); } catch { /* ignorieren */ }
  };
  useEffect(() => {
    const h = location.hash.slice(1);
    // Reiter aus der Adresse übernehmen (im statischen Export erst im Browser bekannt)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (TABS.some((t) => t.id === h)) setTabState(h);
    const on = () => { const x = location.hash.slice(1); if (TABS.some((t) => t.id === x)) setTabState(x); };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);

  const nav = useMemo(() => ({
    tab, setTab, edit,
    openBeleg: (b: EditBeleg) => { setEdit(b); setTab("belege"); },
    closeEdit: () => setEdit(null),
  }), [tab, edit]);

  const td = today();
  const badges: Record<string, number> = {
    belege: d.belege.filter((b) => b.status === "Entwurf").length,
    bank: d.auszuege.reduce((n, a) => n + a.posten.filter((p) => !p.belegId).length, 0),
    op: offenePosten(d.belege).filter((o) => o.b.faellig && o.b.faellig < td).length,
    pruefung: d.belege.filter((b) => b.status === "Entwurf" && b.belegdatum && td > addMonths(b.belegdatum.slice(0, 7) + "-15", 2)).length,
    gesellschafter: 0,
  };

  const view: Record<string, React.ReactNode> = {
    uebersicht: <Uebersicht />, belege: <Belege />, archiv: <Archiv />, bank: <Bank />, objekte: <Objekte />, anlagen: <Anlagen />,
    gesellschafter: <Gesellschafter />, kredite: <Kredite />, op: <OffenePosten />, journal: <Journal />, konten: <Saldenliste />, ust: <Umsatzsteuer />, pruefung: <Pruefung />,
  };

  return (
    <NavContext.Provider value={nav}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}>
        {TABS.map((t) => (
          <Tab key={t.id} value={t.id} label={badges[t.id] ? <Badge color="secondary" badgeContent={badges[t.id]} sx={{ "& .MuiBadge-badge": { right: -14 } }}>{t.label}</Badge> : t.label} />
        ))}
      </Tabs>
      <Box>{view[tab]}</Box>
    </NavContext.Provider>
  );
}

/** Buchhaltung: Belege ablegen, Einnahmen/Ausgaben/Investitionen tracken, doppelte Buchführung nach UGB/BAO. */
export function BuchhaltungApp() {
  return (
    <BhProvider>
      <Inhalt />
    </BhProvider>
  );
}
