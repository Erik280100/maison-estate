import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Logo } from "@/components/brand/Logo";
import { Footer } from "@/components/layout/Footer";
import { DarkSurface } from "@/components/ui/DarkSurface";
import { GoldDivider } from "@/components/ui/GoldDivider";
import { phase } from "@/config/company";

const fadeUp = {
  "@keyframes fadeUp": {
    from: { opacity: 0, transform: "translateY(14px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
  animation: "fadeUp 1.1s ease-out both",
};

export default function ComingSoonPage() {
  return (
    <DarkSurface>
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          px: 2,
          py: 8,
        }}
      >
        <Box sx={fadeUp}>
          <Logo
            className="mx-auto h-auto w-64 sm:w-72"
            showLegalForm={phase === "eingetragen"}
            priority
          />
        </Box>
        <Box
          sx={{
            ...fadeUp,
            animationDelay: "350ms",
            mt: 7,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
          }}
        >
          <GoldDivider />
          <Typography variant="h2" component="h1" sx={{ color: "secondary.light", fontSize: { xs: "2.5rem", sm: "3.5rem" } }}>
            Bald für Sie da.
          </Typography>
          <Typography variant="h6" component="p" color="text.secondary" sx={{ maxWidth: 520, fontWeight: 400, textWrap: "balance" }}>
            Ankauf und Verkauf von Wohnungen – persönlich, transparent, unkompliziert.
          </Typography>
        </Box>
      </Box>
      <Footer />
    </DarkSurface>
  );
}
