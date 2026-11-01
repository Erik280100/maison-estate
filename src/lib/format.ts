const eur = new Intl.NumberFormat("de-AT", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export const formatPrice = (value: number) => eur.format(value);
export const formatArea = (value: number) => `${value} m²`;
export const formatRooms = (value: number) => `${value} Zimmer`;
