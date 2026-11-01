import AppBar from "@mui/material/AppBar";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import { Logo } from "@/components/brand/Logo";
import { AppLink } from "@/components/ui/AppLink";
import { Container } from "./Container";

const nav = [
  { href: "/immobilien", label: "Immobilien" },
  { href: "/verkaufen", label: "Verkaufen" },
  { href: "/ueber-uns", label: "Über uns" },
];

export function Header() {
  return (
    <AppBar position="static" color="primary">
      <Container>
        <Toolbar disableGutters sx={{ justifyContent: "space-between", py: 1 }}>
          <AppLink href="/" aria-label="Maison Estate – Startseite" sx={{ display: "flex" }}>
            <Logo variant="emblem" className="h-12 w-auto" />
          </AppLink>
          <Stack component="nav" aria-label="Hauptnavigation" direction="row" spacing={3}>
            {nav.map((item) => (
              <AppLink
                key={item.href}
                href={item.href}
                variant="body2"
                sx={{ color: "secondary.light", fontWeight: 600, "&:hover": { color: "secondary.main" } }}
              >
                {item.label}
              </AppLink>
            ))}
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
