import Typography from "@mui/material/Typography";
import CalculateRounded from "@mui/icons-material/CalculateRounded";
import { bereiche, rechner, type Bereich } from "@/features/rechner/registry";
import { Kacheln } from "../Kacheln";

const reihenfolge: Bereich[] = ["einkauf", "verkauf"];

export default function RechnerIndex() {
  return (
    <>
      <Typography variant="h3" component="h1">
        Rechner
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 5 }}>
        Rechner und Kalkulationen für das Team – gegliedert nach Einkauf (intern) und Verkauf.
      </Typography>
      {reihenfolge.map((b) => {
        const liste = rechner.filter((r) => r.bereich === b);
        if (liste.length === 0) return null;
        return (
          <section key={b} style={{ marginBottom: 48 }}>
            <Typography variant="h5" component="h2">
              {bereiche[b].label}
            </Typography>
            <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5, mb: 3 }}>
              {bereiche[b].beschreibung}
            </Typography>
            <Kacheln
              tiles={liste.map((r) => ({
                href: `/intern/rechner/${r.slug}/`,
                kicker: bereiche[b].kicker,
                title: r.title,
                text: r.description,
                icon: <CalculateRounded />,
              }))}
            />
          </section>
        );
      })}
    </>
  );
}
