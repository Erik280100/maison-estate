import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { LinkCardActionArea } from "@/components/ui/AppLink";
import { formatArea, formatPrice, formatRooms } from "@/lib/format";
import type { Property } from "@/types/property";

export function PropertyCard({ property: p }: { property: Property }) {
  return (
    <Card sx={{ height: "100%", "&:hover": { boxShadow: 6, borderColor: "secondary.main" } }}>
      <LinkCardActionArea href={`/immobilien/${p.slug}`} sx={{ height: "100%", alignItems: "flex-start" }}>
        <Box
          sx={{
            position: "relative",
            aspectRatio: "4 / 3",
            display: "grid",
            placeItems: "center",
            color: "secondary.main",
            fontSize: 13,
            background: "linear-gradient(135deg, #172a52, #0f1f3d)",
          }}
        >
          Bild folgt
          <Chip
            label={p.status}
            size="small"
            color="secondary"
            sx={{ position: "absolute", top: 12, left: 12, textTransform: "capitalize" }}
          />
        </Box>
        <CardContent sx={{ p: 2.5 }}>
          <Typography variant="overline" color="text.secondary">
            {p.postalCode} {p.city}, {p.district}
          </Typography>
          <Typography variant="h6" component="h3" sx={{ mt: 0.5 }}>
            {p.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {formatArea(p.livingArea)} · {formatRooms(p.rooms)}
          </Typography>
          <Typography variant="h5" sx={{ mt: 2, color: "secondary.dark" }}>
            {formatPrice(p.price)}
          </Typography>
        </CardContent>
      </LinkCardActionArea>
    </Card>
  );
}
