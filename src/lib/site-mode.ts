/**
 * Build-Zeit-Schalter (GitHub Pages = statischer Export, kein Proxy zur Laufzeit).
 * SITE_MODE=live  -> alle Seiten werden mitgebaut
 * sonst           -> /immobilien leitet auf die Startseite um
 */
export const isLive = process.env.SITE_MODE === "live";
