import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import AccountBalanceRounded from "@mui/icons-material/AccountBalanceRounded";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import CalculateRounded from "@mui/icons-material/CalculateRounded";
import { LinkCardActionArea } from "@/components/ui/AppLink";
import { rechner } from "@/features/rechner/registry";

const tiles = [
  {
    href: "/intern/objekte/",
    kicker: "Verwaltung",
    title: "Objekte",
    text: "Immobilien suchen und filtern nach Ort, PLZ, Preis, Fläche, Zimmer, Typ und Ausstattung.",
    icon: <ApartmentRounded />,
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
      <Grid container spacing={3}>
        {tiles.map((t) => (
          <Grid key={t.href} size={{ xs: 12, sm: 6, lg: 4 }}>
            <Card sx={{ height: "100%", "&:hover": { boxShadow: 6, borderColor: "secondary.main" } }}>
              <LinkCardActionArea href={t.href} sx={{ height: "100%", alignItems: "flex-start" }}>
                <CardContent sx={{ p: 3 }}>
                  <Typography
                    variant="overline"
                    sx={{ display: "flex", alignItems: "center", gap: 1, color: "secondary.dark" }}
                  >
                    {t.icon} {t.kicker}
                  </Typography>
                  <Typography variant="h5" component="h2" sx={{ mt: 1 }}>
                    {t.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {t.text}
                  </Typography>
                </CardContent>
              </LinkCardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
