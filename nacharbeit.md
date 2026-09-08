# Nacharbeit — Review-Protokoll

> **Für den Coding-Agent (Antigravity):** Diese Datei ist das Rückmelde-Protokoll von
> Hermes (Management/Qualitätskontrolle). Wenn hier **offene Punkte** stehen:
> zuerst abarbeiten, dann `docs/aufbauplan.md` weiter. Einträge älter als die aktuelle
> Runde gelten als erledigt (Historie).

---

## 02.09.2026 — Runden 5–7 — ✅ OK
## 03.09.2026 — Runden 8, 8.5 (Hausputz), Dokument-Vorlagen — ✅ OK

## 03.09.2026 — Runde 8.6 (Theme-System, 6 Vorlagen) — ✅ OK

**Verifiziert (tsc grün, E2E 22/22 + Workflow-Baseline grün):**

- **Migration** `20260903125529_add_user_theme` (`User.theme String @default("hell")`);
  auth.ts-JWT/Session-Callbacks liefern `theme`.
- **globals.css (269 Z.):** 6 vollständige `data-theme`-Blöcke (hell, dunkel, kontrast, sap90,
  kompakt, gruen) mit allen shadcn-Variablen; `@custom-variant dark` auf `data-theme="dunkel"`;
  kompakt skaliert auf 14px Schriftbasis; kontrast mit 3px-Fokus-Ring (WCAG-AA-Werte);
  sap90 eckig (Radius 0), gruppierte Karten mit graublauem Titelbalken (E2E-CSS-Checks).
- **Rendering:** Root-Layout setzt `data-theme` (Cookie `documentum_theme` gewinnt vor
  User-Profil, Fallback hell) + Inline-Skript gegen Flackern (E2E).
- **Umschaltung:** Konto-Bereich „Darstellung" mit 6 Theme-Karten (Namen im SSR sichtbar,
  E2E); Header-Hell/Dunkel-Toggle; `setThemeAction` persistiert am User + setzt Cookie.
- **E2E-Pfade:** Cookie → data-theme am html; ohne Cookie → Theme aus DB (frische Session);
  Cookie überschreibt DB; zurück auf hell. DB am Ende sauber (hell).
- Client-Interaktion (Karte klicken → setTheme) ist Browser-JS — per Code geprüft
  (theme-provider + theme-actions); visueller Eindruck der 6 Farbwelten im Browser zu prüfen
  (User).

**Keine offenen Punkte — Runde 8.6 freigegeben. Nächste Runde: 9 (Bereichs-Rollen & Quorum —
Design-Vorabstimmung läuft bei Mone/User).**
