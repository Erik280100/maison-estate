import Box from "@mui/material/Box";

export function GoldDivider() {
  return (
    <Box
      aria-hidden
      sx={{
        height: 2,
        width: 72,
        borderRadius: 1,
        background: "linear-gradient(90deg, transparent, #c2a467, transparent)",
      }}
    />
  );
}
