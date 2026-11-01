export function GoldDivider({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`h-px w-24 bg-gradient-to-r from-transparent via-gold-500 to-transparent ${className}`}
    />
  );
}
