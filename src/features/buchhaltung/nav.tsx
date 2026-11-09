"use client";

import { createContext, useContext } from "react";
import type { Beleg } from "./types";

export type EditBeleg = Beleg & { _lokal?: boolean };

export type Nav = {
  tab: string;
  setTab: (t: string) => void;
  /** Beleg im Editor (Reiter „Belege“) öffnen */
  openBeleg: (b: EditBeleg) => void;
  edit: EditBeleg | null;
  closeEdit: () => void;
};

export const NavContext = createContext<Nav | null>(null);
export const useNav = () => {
  const n = useContext(NavContext);
  if (!n) throw new Error("useNav außerhalb von NavContext");
  return n;
};
