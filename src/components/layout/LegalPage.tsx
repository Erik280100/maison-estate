import type { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { AppLink } from "@/components/ui/AppLink";
import { Container } from "./Container";

export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box component="main" sx={{ flex: 1, py: { xs: 6, md: 10 } }}>
      <Container maxWidth="md">
        <AppLink
          href="/"
          variant="body2"
          sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, color: "secondary.dark" }}
        >
          <ArrowBackRounded fontSize="small" /> Zurück zur Startseite
        </AppLink>
        <Typography variant="h2" component="h1" sx={{ mt: 3, mb: 5, fontSize: { xs: "2.25rem", md: "3rem" } }}>
          {title}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 4,
            lineHeight: 1.75,
            color: "text.primary",
            "& h2": { fontSize: "1.375rem", fontWeight: 700, mb: 1.25, letterSpacing: "-0.01em" },
            "& p + p": { mt: 1.5 },
            "& ul": { pl: 3, mt: 1.5, display: "grid", gap: 0.75 },
            "& a": { color: "secondary.dark", textDecoration: "underline" },
            "& section": { pb: 3, borderBottom: 1, borderColor: "divider" },
            "& section:last-of-type": { borderBottom: 0 },
          }}
        >
          {children}
        </Box>
      </Container>
    </Box>
  );
}

/** Hebt unausgefüllte [TODO]-Felder gelb hervor. */
export function V({ children }: { children: string }) {
  return children.includes("[TODO") ? (
    <Box component="mark" sx={{ bgcolor: "#fff3a3", color: "#000", px: 0.5, borderRadius: 0.5 }}>
      {children}
    </Box>
  ) : (
    <>{children}</>
  );
}
