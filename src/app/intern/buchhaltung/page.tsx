import type { Metadata } from "next";
import Typography from "@mui/material/Typography";
import { BuchhaltungApp } from "@/features/buchhaltung/BuchhaltungApp";

export const metadata: Metadata = { title: "Buchhaltung" };

export default function BuchhaltungPage() {
  return (
    <>
      <Typography variant="h3" component="h1" sx={{ mb: 3 }}>
        Buchhaltung
      </Typography>
      <BuchhaltungApp />
    </>
  );
}
