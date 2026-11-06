import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Typography from "@mui/material/Typography";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { AppLink } from "@/components/ui/AppLink";
import Chip from "@mui/material/Chip";
import { bereiche, rechner } from "@/features/rechner/registry";

export function generateStaticParams() {
  return rechner.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: rechner.find((r) => r.slug === slug)?.title };
}

export default async function RechnerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const r = rechner.find((x) => x.slug === slug);
  if (!r) notFound();

  return (
    <>
      <AppLink
        href="/intern/rechner/"
        variant="body2"
        sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "secondary.dark" }}
      >
        <ArrowBackRounded fontSize="small" /> Rechner
      </AppLink>
      <Chip
        label={bereiche[r.bereich].label}
        size="small"
        color={r.bereich === "einkauf" ? "secondary" : "primary"}
        variant="outlined"
        sx={{ display: "flex", width: "fit-content", mt: 2 }}
      />
      <Typography variant="h3" component="h1" sx={{ mt: 1, mb: 4 }}>
        {r.title}
      </Typography>
      <r.Component />
    </>
  );
}
