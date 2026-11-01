import type { Metadata } from "next";
import { InternShell } from "./InternShell";

// Interner Bereich wird nie indexiert.
export const metadata: Metadata = {
  title: { default: "Intern", template: "%s | Intern" },
  robots: { index: false, follow: false },
};

export default function InternLayout({ children }: { children: React.ReactNode }) {
  return <InternShell>{children}</InternShell>;
}
