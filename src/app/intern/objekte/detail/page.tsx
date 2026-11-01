import type { Metadata } from "next";
import { Suspense } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import { ObjektDetail } from "@/features/objekte/ObjektDetail";

export const metadata: Metadata = { title: "Objekt" };

export default function ObjektDetailPage() {
  // useSearchParams braucht beim statischen Export eine Suspense-Grenze
  return (
    <Suspense
      fallback={
        <Box sx={{ display: "grid", placeItems: "center", minHeight: "40vh" }}>
          <CircularProgress color="secondary" />
        </Box>
      }
    >
      <ObjektDetail />
    </Suspense>
  );
}
