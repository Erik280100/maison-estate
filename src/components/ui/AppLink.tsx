"use client";

import type { ComponentProps, ElementType } from "react";
import Link from "next/link";
import Button from "@mui/material/Button";
import CardActionArea from "@mui/material/CardActionArea";
import MuiLink from "@mui/material/Link";

// Client-Wrapper, damit MUI-Komponenten auch aus Server-Komponenten als Next-Link genutzt werden können.
const NextLink = Link as ElementType;

export function AppLink(props: Omit<ComponentProps<typeof MuiLink>, "component"> & { href: string }) {
  return <MuiLink component={NextLink} underline="hover" {...props} />;
}

export function LinkButton(props: Omit<ComponentProps<typeof Button>, "component"> & { href: string }) {
  return <Button component={NextLink} {...props} />;
}

export function LinkCardActionArea(
  props: Omit<ComponentProps<typeof CardActionArea>, "component"> & { href: string },
) {
  return <CardActionArea component={NextLink} {...props} />;
}
