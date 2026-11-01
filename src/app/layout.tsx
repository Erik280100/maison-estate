import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { Providers } from "@/components/providers/Providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
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
    <html lang="de" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
