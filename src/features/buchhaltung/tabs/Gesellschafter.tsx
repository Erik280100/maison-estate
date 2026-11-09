"use client";

import { useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import { useBh } from "../BhProvider";
import { aendern, loeschen, neu, protokollieren } from "../api";
import { manuellerEntwurf } from "../entwurf";
import { gsKonto } from "../konten";
import { gsSalden } from "../logik/auswertung";
import { dAT, fmt, sumL } from "../logik/util";
import { useNav } from "../nav";
import { EuroField, Hinweis, Kpi, KpiGrid, Leer, Num, Pill, Txt } from "../ui";
import type { Gesellschafter as G } from "../types";

export function Gesellschafter() {
  const { sb, uid, d, reload, toast } = useBh();
  const { openBeleg, setTab } = useNav();
  const salden = useMemo(() => gsSalden(d.belege, d.gesellschafter), [d.belege, d.gesellschafter]);
  const [form, setForm] = useState<Partial<G> | null>(null);

  const speichern = async () => {
    if (!form?.name?.trim()) return toast("Name fehlt.");
    try {
      if (form.id) {
        const { id, ...rest } = form as G;
        await aendern(sb, "gesellschafter", id, rest);
      } else {
        const frei = [1, 2, 3, 4, 5, 6, 7, 8, 9].find((n) => !d.gesellschafter.some((g) => g.nr === n));
        if (!frei) return toast("Maximal 9 Gesellschafter.");
        await neu(sb, "gesellschafter", { name: form.name.trim(), nr: frei, iban: form.iban?.replace(/\s/g, "") ?? "", userEmail: form.userEmail ?? "", stammeinlage: form.stammeinlage ?? 0 });
        protokollieren(sb, uid, "Gesellschafter angelegt", form.name);
      }
      setForm(null);
      await reload();
    } catch (e) {
      toast("Speichern fehlgeschlagen: " + (e as Error).message);
    }
  };

  const entwurf = async (g: G, saldo: number, ziel: "bank" | "zuschuss") => {
    try {
      const betrag = saldo;
      const b = await manuellerEntwurf(sb, uid, {
        partner: g.name, gs: g.id,
        beschreibung: ziel === "bank" ? `Erstattung Auslagen ${g.name}` : `Auslagen ${g.name} als Gesellschafterzuschuss`,
        zeilen: [{ konto: gsKonto(g), soll: betrag, haben: 0, text: ziel === "bank" ? "Erstattung" : "Umbuchung" }, { konto: ziel === "bank" ? "2800" : "9100", soll: 0, haben: betrag, text: ziel === "bank" ? "Überweisung" : "Zuschuss" }],
        hinweise: [ziel === "bank" ? "Besser über den Kontoauszug buchen, sobald die Überweisung auf dem Konto liegt." : "Gesellschafterzuschuss (Kapitalrücklage): mit Mag. Hauser abstimmen."],
      });
      await reload();
      openBeleg(b);
      setTab("belege");
    } catch (e) {
      toast("Fehler: " + (e as Error).message);
    }
  };

  const loesche = async (g: G) => {
    try {
      await loeschen(sb, "gesellschafter", g.id);
      await reload();
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const gesamt = salden.reduce((a, s) => a + Math.max(0, s.saldo), 0);

  return (
    <Stack spacing={2.5}>
      <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h6">Gesellschafter &amp; Auslagen</Typography>
        <Button variant="contained" onClick={() => setForm({ name: "", iban: "", stammeinlage: 0 })}>Gesellschafter anlegen</Button>
      </Stack>
      <Alert severity="info">
        Privat bezahlte Ausgaben werden im Beleg unter „Bezahlt über“ dem jeweiligen Gesellschafter zugeordnet. Sie landen im Hauptbuch (Aufwand und Vorsteuer stimmen) und auf dem
        Verrechnungskonto der Person. Hier siehst du je Person, was noch erstattet werden muss – bis zum gemeinsamen Geschäftskonto.
      </Alert>
      {form && (
        <Card variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
            <Txt label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Txt label="IBAN (für die Zuordnung von Erstattungen)" value={form.iban} onChange={(v) => setForm({ ...form, iban: v })} />
            <Txt label="Login-E-Mail (optional)" value={form.userEmail} onChange={(v) => setForm({ ...form, userEmail: v })} />
            <EuroField label="Stammeinlage €" value={form.stammeinlage ?? 0} onChange={(v) => setForm({ ...form, stammeinlage: v })} />
          </Box>
          <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
            <Button variant="contained" onClick={speichern}>Speichern</Button>
            <Button onClick={() => setForm(null)}>Abbrechen</Button>
          </Stack>
        </Card>
      )}
      {!d.gesellschafter.length ? (
        <Leer titel="Noch keine Gesellschafter" text="Lege die Gesellschafter an, damit privat bezahlte Rechnungen einer Person zugeordnet werden können." />
      ) : (
        <>
          <KpiGrid>
            <Kpi label="Insgesamt noch zu erstatten" value={`${fmt(gesamt)} €`} negative={gesamt > 0} />
            <Kpi label="Stammkapital laut Stammdaten" value={`${fmt(salden.reduce((a, s) => a + Math.round(s.g.stammeinlage * 100), 0))} €`} />
          </KpiGrid>
          <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" } }}>
            {salden.map((s) => {
              const auslagen = d.belege.filter((b) => b.gs === s.g.id && ["ER", "KA"].includes(b.art)).sort((a, b) => (b.belegdatum || "").localeCompare(a.belegdatum || ""));
              return (
                <Card key={s.g.id} variant="outlined" sx={{ p: 2 }}>
                  <Stack spacing={1.5}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{s.g.name}</Typography>
                        <Typography variant="caption" color="text.secondary">Verrechnungskonto {gsKonto(s.g)}{s.g.iban ? ` · ${s.g.iban}` : ""}</Typography>
                      </Box>
                      {s.saldo > 0 ? <Pill tone="warn">{`bekommt noch ${fmt(s.saldo)} €`}</Pill> : s.saldo < 0 ? <Pill tone="err">{`schuldet ${fmt(-s.saldo)} €`}</Pill> : <Pill tone="ok">ausgeglichen</Pill>}
                    </Stack>
                    <KpiGrid>
                      <Kpi label="Ausgelegt" value={`${fmt(s.auslagen)} €`} />
                      <Kpi label="Erstattet / umgebucht" value={`${fmt(s.erstattet)} €`} />
                      <Kpi label="Zuschüsse" value={`${fmt(s.zuschuss)} €`} />
                      <Kpi label="Darlehen" value={`${fmt(s.darlehen)} €`} />
                    </KpiGrid>
                    <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                      <Button size="small" variant="outlined" disabled={s.saldo <= 0} onClick={() => entwurf(s.g, s.saldo, "bank")}>Erstattung vorbereiten</Button>
                      <Button size="small" variant="outlined" disabled={s.saldo <= 0} onClick={() => entwurf(s.g, s.saldo, "zuschuss")}>Als Zuschuss umbuchen</Button>
                      <Button size="small" onClick={() => setForm(s.g)}>Bearbeiten</Button>
                      <Button size="small" color="error" disabled={!!(s.auslagen || s.erstattet)} onClick={() => loesche(s.g)}>Löschen</Button>
                    </Stack>
                    {auslagen.length > 0 && (
                      <Table size="small">
                        <TableHead><TableRow><TableCell>Datum</TableCell><TableCell>Beleg</TableCell><TableCell align="right">Betrag €</TableCell><TableCell>Status</TableCell></TableRow></TableHead>
                        <TableBody>
                          {auslagen.map((b) => (
                            <TableRow key={b.id} hover sx={{ cursor: "pointer" }} onClick={() => { openBeleg(b); setTab("belege"); }}>
                              <TableCell>{dAT(b.belegdatum)}</TableCell>
                              <TableCell>{b.partner}<Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>{b.nr ?? b.rechnungsnr}</Typography></TableCell>
                              <TableCell align="right"><Num>{b.status === "Gebucht" ? fmt(sumL((b.zeilen || []).filter((l) => l.konto === gsKonto(s.g)), "haben")) : fmt(Math.round((b.brutto ?? 0) * 100))}</Num></TableCell>
                              <TableCell>{b.storniert ? <Pill tone="err">storniert</Pill> : b.status === "Gebucht" ? <Pill tone="ok">gebucht</Pill> : <Pill tone="warn">Entwurf</Pill>}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </Stack>
                </Card>
              );
            })}
          </Box>
        </>
      )}
      <Hinweis>Ein Verrechnungskonto mit Habensaldo ist eine Verbindlichkeit der GmbH gegenüber der Person. Wird eine Auslage nicht zurückgezahlt, sondern als Zuschuss behandelt, bucht man sie in die Kapitalrücklage (9100) um – steuerlich mit Mag. Hauser abstimmen. Stammeinlage und Zuschüsse werden über Bankbuchungen mit Gesellschafter-Bezug erfasst.</Hinweis>
    </Stack>
  );
}
