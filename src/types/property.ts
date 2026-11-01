export type PropertyStatus = "verfügbar" | "reserviert" | "verkauft";

export type Property = {
  id: string;
  slug: string;
  title: string;
  status: PropertyStatus;
  /** Kaufpreis in EUR */
  price: number;
  /** Wohnfläche in m² */
  livingArea: number;
  rooms: number;
  floor: string;
  city: string;
  district: string;
  postalCode: string;
  features: string[];
  images: string[];
  description: string;
  /** HWB-Klasse (Österreich) */
  energyClass: string;
  createdAt: string;
};
