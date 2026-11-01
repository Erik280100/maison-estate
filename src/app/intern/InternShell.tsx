"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import { ThemeProvider } from "@mui/material/styles";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import { AuthProvider, useAuth } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { Container } from "@/components/layout/Container";
import { AppLink, LinkButton } from "@/components/ui/AppLink";
import { brand, darkTheme } from "@/theme/theme";

const links = [
  { href: "/intern/objekte/", label: "Objekte" },
  { href: "/intern/rechner/", label: "Rechner" },
];

function Bar() {
  const { session, signOut } = useAuth();
  const path = usePathname() ?? "";
  return (
    <ThemeProvider theme={darkTheme}>
      <AppBar position="sticky" sx={{ bgcolor: brand.navy950, backgroundImage: "none" }}>
        <Container>
          <Toolbar disableGutters sx={{ gap: 2, flexWrap: "wrap" }}>
            <AppLink
              href="/intern/"
              underline="none"
              sx={{ color: "secondary.main", fontWeight: 700, fontSize: "1.15rem", mr: 2 }}
            >
              Maison Estate{" "}
              <Box component="span" sx={{ color: "text.secondary", fontWeight: 500 }}>
                intern
              </Box>
            </AppLink>
            <Stack direction="row" spacing={0.5} sx={{ flex: 1 }}>
              {links.map((l) => (
                <LinkButton
                  key={l.href}
                  href={l.href}
                  color="inherit"
                  sx={{
                    color: path.startsWith(l.href.slice(0, -1)) ? "secondary.main" : "text.primary",
                  }}
                >
                  {l.label}
                </LinkButton>
              ))}
            </Stack>
            <Box component="span" sx={{ display: { xs: "none", md: "block" }, color: "text.secondary", fontSize: 14 }}>
              {session?.user.email}
            </Box>
            <Button variant="outlined" size="small" startIcon={<LogoutRounded />} onClick={() => signOut()}>
              Abmelden
            </Button>
          </Toolbar>
        </Container>
      </AppBar>
    </ThemeProvider>
  );
}

export function InternShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <RequireAuth>
        <Bar />
        <Box component="main" sx={{ flex: 1, py: { xs: 4, md: 6 } }}>
          <Container>{children}</Container>
        </Box>
      </RequireAuth>
    </AuthProvider>
  );
}
