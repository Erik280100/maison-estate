import type { Metadata } from "next";
import Typography from "@mui/material/Typography";
import { BuchhaltungFrame } from "@/features/buchhaltung/BuchhaltungFrame";

export const metadata: Metadata = { title: "Buchhaltung" };

export default function BuchhaltungPage() {
  return (
    <>
      <Typography variant="h3" component="h1" sx={{ mb: 4 }}>
        Buchhaltung
      </Typography>
      <BuchhaltungFrame />
    </>
  );
}
