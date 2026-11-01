import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Solange die Firma nicht im Firmenbuch steht und die Rechtstexte fehlen:
// nicht indexieren. Erst mit ALLOW_INDEXING=true (Produktion) freigeben.
const allowIndexing = process.env.ALLOW_INDEXING === "true";

export const metadata: Metadata = {
  robots: allowIndexing
    ? { index: true, follow: true }
    : { index: false, follow: false },
  title: {
    default: "Maison Estate – Bald für Sie da",
    template: "%s | Maison Estate",
  },
  description:
    "Maison Estate – Ankauf und Verkauf von Wohnungen. Persönlich, transparent, unkompliziert.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="de"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
