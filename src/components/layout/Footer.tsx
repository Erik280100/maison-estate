import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { company } from "@/config/company";
import { AppLink } from "@/components/ui/AppLink";

export function Footer({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const dark = tone === "dark";
  return (
    <Box
      component="footer"
      sx={{
        borderTop: 1,
        borderColor: dark ? "rgba(194,164,103,0.2)" : "divider",
        bgcolor: dark ? "transparent" : "background.paper",
        py: 3,
        px: 2,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1.5, sm: 0 }}
        sx={{
          maxWidth: "lg",
          mx: "auto",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="body2" color="text.secondary">
          © 2026 {company.displayName}
        </Typography>
        <Stack
          component="nav"
          aria-label="Rechtliches"
          direction="row"
          spacing={3}
          sx={{ "& a": { color: "text.secondary", "&:hover": { color: "secondary.main" } } }}
        >
          <AppLink href="/impressum" variant="body2">Impressum</AppLink>
          <AppLink href="/datenschutz" variant="body2">Datenschutz</AppLink>
          <AppLink href="/login" variant="body2">Login</AppLink>
        </Stack>
      </Stack>
    </Box>
  );
}
