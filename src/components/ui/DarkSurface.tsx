"use client";

import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import { ThemeProvider } from "@mui/material/styles";
import { brand, darkTheme } from "@/theme/theme";

/** Dunkle Fläche mit Markenverlauf und passendem dunklen Theme für alle Kinder. */
export function DarkSurface({ children, minHeight = "100vh" }: { children: ReactNode; minHeight?: string }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          minHeight,
          display: "flex",
          flexDirection: "column",
          color: "text.primary",
          background: `radial-gradient(ellipse at center, ${brand.navy800} 0%, ${brand.navy900} 55%, ${brand.navy950} 100%)`,
        }}
      >
        {children}
      </Box>
    </ThemeProvider>
  );
}
