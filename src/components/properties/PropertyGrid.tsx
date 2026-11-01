import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import type { Property } from "@/types/property";
import { PropertyCard } from "./PropertyCard";

export function PropertyGrid({ properties }: { properties: Property[] }) {
  if (properties.length === 0) {
    return <Typography color="text.secondary">Aktuell keine Objekte verfügbar.</Typography>;
  }
  return (
    <Grid container spacing={3}>
      {properties.map((p) => (
        <Grid key={p.id} size={{ xs: 12, sm: 6, lg: 4 }}>
          <PropertyCard property={p} />
        </Grid>
      ))}
    </Grid>
  );
}
