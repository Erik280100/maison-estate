import type { ReactNode } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import { LinkCardActionArea } from "@/components/ui/AppLink";

export type Kachel = {
  href: string;
  kicker: string;
  title: string;
  text: string;
  icon: ReactNode;
};

export function Kacheln({ tiles }: { tiles: Kachel[] }) {
  return (
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
  );
}
