import Typography from "@mui/material/Typography";
import AccountBalanceRounded from "@mui/icons-material/AccountBalanceRounded";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import ChecklistRounded from "@mui/icons-material/ChecklistRounded";
import CalculateRounded from "@mui/icons-material/CalculateRounded";
import { rechner } from "@/features/rechner/registry";
import { Kacheln } from "./Kacheln";

const tiles = [
  {
    href: "/intern/objekte/",
    kicker: "Verwaltung",
    title: "Objekte",
    text: "Immobilien suchen und filtern nach Ort, PLZ, Preis, Fläche, Zimmer, Typ und Ausstattung.",
    icon: <ApartmentRounded />,
  },
  {
    href: "/intern/todos/",
    kicker: "Team",
    title: "To-dos",
    text: "Offene Aufgaben im Board: in Spalten verschieben, Personen zuweisen, Beginn und Abschluss terminieren.",
    icon: <ChecklistRounded />,
  },
  {
    href: "/intern/buchhaltung/",
    kicker: "Finanzen",
    title: "Buchhaltung",
    text: "Belege erfassen und buchen, Kontoauszüge, Kredite, Journal, Saldenliste und Umsatzsteuer.",
    icon: <AccountBalanceRounded />,
  },
  ...rechner.map((r) => ({
    href: `/intern/rechner/${r.slug}/`,
    kicker: "Rechner",
    title: r.title,
    text: r.description,
    icon: <CalculateRounded />,
  })),
];

export default function InternHome() {
  return (
    <>
      <Typography variant="h3" component="h1">
        Interner Bereich
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 5 }}>
        Werkzeuge für das Team. Neue Bereiche lassen sich hier ergänzen.
      </Typography>
      <Kacheln tiles={tiles} />
    </>
  );
}
