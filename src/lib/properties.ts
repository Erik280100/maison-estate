import { mockProperties } from "@/data/properties.mock";
import type { Property } from "@/types/property";

// Einziger Datenzugriffspunkt: später durch CMS/API ersetzen, UI bleibt gleich.
export async function getProperties(): Promise<Property[]> {
  return mockProperties;
}

export async function getPropertyBySlug(
  slug: string,
): Promise<Property | undefined> {
  return mockProperties.find((p) => p.slug === slug);
}
