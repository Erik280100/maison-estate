import type { Metadata } from "next";
import { Suspense } from "react";
import { ObjektDetail } from "@/features/objekte/ObjektDetail";

export const metadata: Metadata = { title: "Objekt" };

export default function ObjektDetailPage() {
  // useSearchParams braucht beim statischen Export eine Suspense-Grenze
  return (
    <Suspense fallback={<p className="text-stone-500">Wird geladen …</p>}>
      <ObjektDetail />
    </Suspense>
  );
}
