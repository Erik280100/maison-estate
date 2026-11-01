import { Logo } from "@/components/brand/Logo";
import { Footer } from "@/components/layout/Footer";
import { GoldDivider } from "@/components/ui/GoldDivider";
import { phase } from "@/config/company";

export default function ComingSoonPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(ellipse_at_center,var(--color-navy-800)_0%,var(--color-navy-900)_55%,var(--color-navy-950)_100%)] text-gold-500">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="animate-fade-up">
          <Logo
            className="mx-auto h-auto w-64 sm:w-72"
            priority
            showLegalForm={phase === "eingetragen"}
          />
        </div>

        <div className="animate-fade-up mt-12 flex flex-col items-center gap-6 [animation-delay:400ms]">
          <GoldDivider />
          <h1 className="font-serif text-4xl text-gold-300 sm:text-5xl">
            Bald für Sie da.
          </h1>
          <p className="max-w-md text-balance text-base text-stone-500 sm:text-lg">
            Ankauf und Verkauf von Wohnungen – persönlich, transparent,
            unkompliziert.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
