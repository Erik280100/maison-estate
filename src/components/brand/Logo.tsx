type LogoProps = {
  className?: string;
  /** "full" = Emblem + Schriftzug, "emblem" = nur Emblem */
  variant?: "full" | "emblem";
  /** "GmbH" nur anzeigen, wenn die Firma im Firmenbuch eingetragen ist */
  showLegalForm?: boolean;
};

/**
 * Platzhalter-Logo als SVG (nachgezeichnet nach dem Logo-Entwurf).
 * TODO: durch das offizielle Vektor-Logo (SVG, transparent) ersetzen.
 */
export function Logo({
  className,
  variant = "full",
  showLegalForm = true,
}: LogoProps) {
  const full = variant === "full";
  return (
    <svg
      viewBox={full ? "0 0 600 560" : "0 0 600 300"}
      className={className}
      role="img"
      aria-label="Maison Estate GmbH"
      fill="none"
      stroke="currentColor"
      strokeWidth="5"
      strokeLinejoin="miter"
    >
      {/* drei ineinandergreifende Dächer */}
      <path d="M130 150 V80 L205 20 L250 55" />
      <path d="M170 150 L250 55 L300 20 L350 55" />
      <path d="M350 55 L395 20 L470 80 V150" />
      <path d="M215 110 L300 40 L385 110" />
      {/* Grundlinie */}
      <path d="M10 195 H190 M410 195 H590" />
      {/* Raute */}
      <path d="M300 115 L385 195 L300 275 L215 195 Z" />
      <g
        fill="currentColor"
        stroke="none"
        fontFamily="var(--font-cormorant), Georgia, serif"
        fontWeight="600"
        fontSize="40"
        textAnchor="middle"
      >
        <text x="300" y="168">M</text>
        <text x="256" y="208">E</text>
        <text x="344" y="208">G</text>
        <text x="300" y="248">A</text>
      </g>

      {full && (
        <g
          fill="currentColor"
          stroke="none"
          fontFamily="var(--font-cormorant), Georgia, serif"
          textAnchor="middle"
        >
          <text x="300" y="385" fontSize="92" fontWeight="500" letterSpacing="4">
            MAISON
          </text>
          <text x="300" y="480" fontSize="92" fontWeight="500" letterSpacing="4">
            ESTATE
          </text>
          {showLegalForm && (
            <text x="300" y="540" fontSize="46" fontWeight="500">
              GmbH
            </text>
          )}
        </g>
      )}
    </svg>
  );
}
