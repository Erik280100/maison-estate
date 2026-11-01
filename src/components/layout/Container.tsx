import type { ReactNode } from "react";
import MuiContainer from "@mui/material/Container";

export function Container({
  children,
  maxWidth = "lg",
}: {
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}) {
  return <MuiContainer maxWidth={maxWidth}>{children}</MuiContainer>;
}
