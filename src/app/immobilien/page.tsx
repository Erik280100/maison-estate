import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Container } from "@/components/layout/Container";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { PropertyGrid } from "@/components/properties/PropertyGrid";
import { getProperties } from "@/lib/properties";
import { isLive } from "@/lib/site-mode";

export const metadata: Metadata = {
  title: "Immobilien",
  description: "Aktuelle Wohnungen zum Kauf von Maison Estate.",
};

export default async function ImmobilienPage() {
  if (!isLive) redirect("/");
  const properties = await getProperties();
  return (
    <>
      <Header />
      <Box component="main" sx={{ flex: 1, py: { xs: 5, md: 8 } }}>
        <Container>
          <Typography variant="h2" component="h1" sx={{ fontSize: { xs: "2.25rem", md: "3rem" } }}>
            Unsere Immobilien
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5, mb: 6 }}>
            Aktuell verfügbare Wohnungen im Überblick.
          </Typography>
          <PropertyGrid properties={properties} />
        </Container>
      </Box>
      <Footer tone="light" />
    </>
  );
}
