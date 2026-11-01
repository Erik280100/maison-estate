// Bricht ab, solange in Rechtstexten/Firmendaten noch [TODO]-Platzhalter stehen.
import { readFileSync } from "node:fs";

const files = [
  "src/config/company.ts",
  "src/app/impressum/page.tsx",
  "src/app/datenschutz/page.tsx",
];

let open = 0;
for (const f of files) {
  readFileSync(f, "utf8")
    .split("\n")
    .forEach((line, i) => {
      if (/\[TODO|TODO\(/.test(line) && !line.includes("export const TODO")) {
        console.log(`${f}:${i + 1}  ${line.trim()}`);
        open++;
      }
    });
}

if (open) {
  console.error(`\n${open} offene Platzhalter – vor Livegang ausfüllen.`);
  process.exit(1);
}
console.log("Rechtstexte vollständig.");
