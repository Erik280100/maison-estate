import Image from "next/image";

type LogoProps = {
  className?: string;
  /** "full" = Emblem + Schriftzug, "emblem" = nur Emblem */
  variant?: "full" | "emblem";
  /** "GmbH" nur anzeigen, wenn die Firma im Firmenbuch eingetragen ist */
  showLegalForm?: boolean;
  priority?: boolean;
};

// Dateien in public/brand/ (Original: 262 px breit, transparenter Hintergrund).
// TODO: durch hochauflösende Fassung oder Vektor (SVG) ersetzen.
const files = {
  emblem: { src: "/brand/logo-emblem.png", width: 262, height: 104 },
  gruendung: { src: "/brand/logo-gruendung.png", width: 262, height: 196 },
  gmbh: { src: "/brand/logo-gmbh.png", width: 262, height: 232 },
} as const;

export function Logo({
  className,
  variant = "full",
  showLegalForm = true,
  priority = false,
}: LogoProps) {
  const file =
    variant === "emblem"
      ? files.emblem
      : showLegalForm
        ? files.gmbh
        : files.gruendung;

  return (
    <Image
      src={file.src}
      width={file.width}
      height={file.height}
      alt="Maison Estate"
      priority={priority}
      className={className}
    />
  );
}
