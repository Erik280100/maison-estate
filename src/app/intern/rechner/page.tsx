import Typography from "@mui/material/Typography";
import CalculateRounded from "@mui/icons-material/CalculateRounded";
import { rechner } from "@/features/rechner/registry";
import { Kacheln } from "../Kacheln";

export default function RechnerIndex() {
  return (
    <>
      <Typography variant="h3" component="h1">
        Rechner
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 5 }}>
        Rechner und Kalkulationen für das Team.
      </Typography>
      <Kacheln
        tiles={rechner.map((r) => ({
          href: `/intern/rechner/${r.slug}/`,
          kicker: "Rechner",
          title: r.title,
          text: r.description,
          icon: <CalculateRounded />,
        }))}
      />
    </>
  );
}
