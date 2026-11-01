import type { Metadata } from "next";
import { ObjekteSuche } from "@/features/objekte/ObjekteSuche";

export const metadata: Metadata = { title: "Objekte" };

export default function ObjektePage() {
  return <ObjekteSuche />;
}
