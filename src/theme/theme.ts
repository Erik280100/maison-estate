import { createTheme, type ThemeOptions } from "@mui/material/styles";

// Markenfarben (aus dem Logo)
export const brand = {
  navy950: "#0a1530",
  navy900: "#0f1f3d",
  navy800: "#172a52",
  navy700: "#22396b",
  gold300: "#e3cf9f",
  gold400: "#d4b97f",
  gold500: "#c2a467",
  gold600: "#a3884f",
  gold700: "#85703f",
  ivory50: "#faf7f0",
  ivory100: "#f2ece0",
  line: "#e6dfcf",
};

const fontFamily = [
  "var(--font-jakarta)",
  "system-ui",
  "-apple-system",
  "Segoe UI",
  "sans-serif",
].join(",");

const base: ThemeOptions = {
  shape: { borderRadius: 12 },
  typography: {
    fontFamily,
    h1: { fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.1 },
    h2: { fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1.15 },
    h3: { fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 },
    h4: { fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.2 },
    h5: { fontWeight: 650, letterSpacing: "-0.01em" },
    h6: { fontWeight: 650, letterSpacing: "-0.01em" },
    subtitle1: { fontWeight: 500 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
    overline: { fontWeight: 600, letterSpacing: "0.12em" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, paddingInline: 20, paddingBlock: 9 },
        sizeLarge: { paddingBlock: 12, paddingInline: 28 },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${brand.line}`,
          transition: "box-shadow .2s ease, transform .2s ease, border-color .2s ease",
        },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
    MuiPaper: { defaultProps: { elevation: 0 } },
    MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiAppBar: { defaultProps: { elevation: 0, color: "primary" } },
  },
};

/** Helles Theme (Inhalte, Listen, Formulare) */
export const lightTheme = createTheme({
  ...base,
  palette: {
    mode: "light",
    primary: { main: brand.navy900, light: brand.navy700, dark: brand.navy950, contrastText: "#fff" },
    secondary: { main: brand.gold500, light: brand.gold300, dark: brand.gold700, contrastText: brand.navy950 },
    background: { default: brand.ivory50, paper: "#ffffff" },
    text: { primary: brand.navy900, secondary: "#586074" },
    divider: brand.line,
  },
});

/** Dunkles Theme (Startseite, Login, Kopfzeilen) */
export const darkTheme = createTheme({
  ...base,
  palette: {
    mode: "dark",
    primary: { main: brand.gold500, light: brand.gold300, dark: brand.gold600, contrastText: brand.navy950 },
    secondary: { main: brand.gold300 },
    background: { default: brand.navy900, paper: brand.navy800 },
    text: { primary: brand.ivory100, secondary: "#a9b0c0" },
    divider: "rgba(194,164,103,0.25)",
  },
});
