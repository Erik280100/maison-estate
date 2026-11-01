# Maison Estate GmbH – Website

Next.js (App Router) + Tailwind CSS v4.

## Start

```bash
npm install
npm run dev      # http://localhost:3000
```

## Coming-Soon-Schalter

`.env.local` → `SITE_MODE=coming-soon` (Standard) oder `SITE_MODE=live`.
Der Schalter wirkt beim Bauen (statischer Export, `src/lib/site-mode.ts`): Im Coming-Soon-Modus leiten `/immobilien` und Detailseiten auf `/` um.

## Farben (`src/app/globals.css`)

| Token | Hex | Verwendung |
|---|---|---|
| navy-900 / 950 | #0f1f3d / #0a1530 | Marke, Header, Hero |
| gold-500 | #c2a467 | Akzent, Linien, Buttons |
| gold-300 | #e3cf9f | Headlines auf Navy |
| ivory-50 | #faf7f0 | Content-Flächen, Immobilienliste |

Schriften: Cormorant Garamond (Headlines), Inter (Text).

## Immobilien

Datenzugriff nur über `src/lib/properties.ts` (aktuell Mock-Daten in `src/data/`).
Später durch CMS/Datenbank ersetzen.

## Offen

- Logo: `src/components/brand/Logo.tsx` ist ein nachgezeichneter SVG-Platzhalter → offizielles Vektor-Logo einsetzen.
- Impressum/Datenschutz: `[TODO]`-Felder ausfüllen.
- Seiten `/verkaufen`, `/ueber-uns` (im Header verlinkt) fehlen noch.

## Deployment: GitHub Pages (GitHub Actions)

Workflow: `.github/workflows/deploy.yml` (Push auf `main` baut `out/` und veröffentlicht).

Einmalig einrichten:
1. Repository auf GitHub anlegen und pushen. Hinweis: Pages aus **privaten** Repos braucht einen bezahlten GitHub-Plan.
2. Settings → Pages → **Source: GitHub Actions**.
3. Settings → Secrets and variables → Actions → **Variables** (alle optional):
   | Variable | Standard | Zweck |
   |---|---|---|
   | `SITE_MODE` | `coming-soon` | `live` schaltet Immobilien-Seiten frei |
   | `ALLOW_INDEXING` | `false` | `true` erlaubt Google |
   | `BASE_PATH` | leer | `/<repo-name>`, wenn keine eigene Domain genutzt wird (`https://<user>.github.io/<repo>`) |
4. Eigene Domain: Settings → Pages → Custom domain, DNS-CNAME auf `<user>.github.io`, "Enforce HTTPS" aktivieren. Dann `BASE_PATH` leer lassen.

Lokal testen: `npm run build`, dann `npx serve out`.
Grenzen: kein Server (kein Proxy, keine API-Routes). Formulare später über externen Dienst, Objektdaten per Build oder Client-Fetch.

## Login und interner Bereich (Supabase Auth)

- `/login` meldet per E-Mail/Passwort an, `/intern/` ist nur eingeloggt sichtbar (noindex).
- Rechner: Komponente in `src/features/rechner/` anlegen und in `registry.ts` eintragen.
- Sicherheit: Die Sperre wirkt im Browser. Der Code der Rechner ist im öffentlichen Build enthalten. **Vertrauliche Daten gehören in Supabase mit Row Level Security**, nicht in den Code.

Einrichtung:
1. Projekt auf supabase.com anlegen (Region EU/Frankfurt).
2. Authentication → Providers → Email: **"Allow new users to sign up" ausschalten** (Selbstregistrierung aus), Passwortlänge mind. 12.
3. Team per Authentication → Users → Invite/Add user anlegen.
4. Project Settings → API: `URL` und `anon public key` als Repository-Variablen `NEXT_PUBLIC_SUPABASE_URL` und `NEXT_PUBLIC_SUPABASE_ANON_KEY` setzen (lokal in `.env.local`).
5. Authentication → URL Configuration: Site URL `https://maison-estate.at`.
