import type { Metadata } from "next";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";
import { Logo } from "@/components/brand/Logo";
import { AppLink } from "@/components/ui/AppLink";
import { DarkSurface } from "@/components/ui/DarkSurface";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Login",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <DarkSurface>
      <Box
        component="main"
        sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", px: 2, py: 6 }}
      >
        <Box sx={{ width: "100%", maxWidth: 420 }}>
          <Logo variant="emblem" showLegalForm={false} className="mx-auto mb-6 h-auto w-28" />
          <Typography variant="h4" component="h1" align="center" sx={{ color: "secondary.light" }}>
            Interner Bereich
          </Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1, mb: 4 }}>
            Nur für das Maison-Estate-Team.
          </Typography>
          <LoginForm />
          <Box sx={{ mt: 4, textAlign: "center" }}>
            <AppLink
              href="/"
              variant="body2"
              sx={{ color: "text.secondary", display: "inline-flex", alignItems: "center", gap: 0.5 }}
            >
              <ArrowBackRounded fontSize="small" /> Zur Startseite
            </AppLink>
          </Box>
        </Box>
      </Box>
    </DarkSurface>
  );
}
