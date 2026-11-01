import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { Container } from "@/components/layout/Container";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { AppLink } from "@/components/ui/AppLink";
import { formatArea, formatPrice, formatRooms } from "@/lib/format";
import { getProperties, getPropertyBySlug } from "@/lib/properties";
import { isLive } from "@/lib/site-mode";

export async function generateStaticParams() {
  const properties = await getProperties();
  return properties.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const property = await getPropertyBySlug(slug);
  if (!property) return {};
  return {
    title: property.title,
    description: `${formatRooms(property.rooms)}, ${formatArea(property.livingArea)} in ${property.postalCode} ${property.city} – ${formatPrice(property.price)}`,
  };
}

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isLive) redirect("/");
  const { slug } = await params;
  const p = await getPropertyBySlug(slug);
  if (!p) notFound();

  const facts: [string, string][] = [
    ["Kaufpreis", formatPrice(p.price)],
    ["Wohnfläche", formatArea(p.livingArea)],
    ["Zimmer", String(p.rooms)],
    ["Stockwerk", p.floor],
    ["Lage", `${p.postalCode} ${p.city}, ${p.district}`],
    ["Energieklasse (HWB)", p.energyClass],
    ["Status", p.status],
  ];

  return (
    <>
      <Header />
      <Box component="main" sx={{ flex: 1, py: { xs: 5, md: 8 } }}>
        <Container>
          <AppLink
            href="/immobilien"
            variant="body2"
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "secondary.dark" }}
          >
            <ArrowBackRounded fontSize="small" /> Alle Immobilien
          </AppLink>
          <Typography variant="h2" component="h1" sx={{ mt: 2, fontSize: { xs: "2.25rem", md: "3rem" } }}>
            {p.title}
          </Typography>

          <Grid container spacing={5} sx={{ mt: 1 }}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <Box
                sx={{
                  aspectRatio: "16 / 10",
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 3,
                  color: "secondary.main",
                  background: "linear-gradient(135deg, #172a52, #0f1f3d)",
                }}
              >
                Galerie folgt
              </Box>
              <Typography sx={{ mt: 4, lineHeight: 1.8 }}>{p.description}</Typography>
              <Stack direction="row" useFlexGap spacing={1} sx={{ mt: 3, flexWrap: "wrap" }}>
                {p.features.map((f) => (
                  <Chip key={f} label={f} variant="outlined" />
                ))}
              </Stack>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Card>
                <Table>
                  <TableBody>
                    {facts.map(([k, v]) => (
                      <TableRow key={k} sx={{ "&:last-child td": { border: 0 } }}>
                        <TableCell sx={{ color: "text.secondary" }}>{k}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, textTransform: k === "Status" ? "capitalize" : undefined }}>
                          {v}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
      <Footer tone="light" />
    </>
  );
}
