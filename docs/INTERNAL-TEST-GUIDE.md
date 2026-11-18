# Lokaler interner Test

Stand: 18. November 2026. Branch: `codex/internal-test-readiness-20261118`.

## Starten

1. Installiere die Abhängigkeiten: `npm ci`.
2. Starte den lokalen Testmodus: `npm run dev:internal`.
3. Öffne `http://127.0.0.1:3000/beta`.
4. Wähle **Interne Testanmeldung starten**.

## Geschützte Vercel-Vorschau

Der Simulator darf zusätzlich in einer Vercel-Vorschau laufen, wenn das Projekt SSO-Schutz erzwingt. Aktiviere dafür `INTERNAL_TEST_MODE=true` und `NEXT_PUBLIC_INTERNAL_TEST_MODE=true` ausschliesslich für den Branch `codex/internal-test-readiness-20261118`. Die Serverseite akzeptiert nur Vercel Preview, exakt diesen Branch und den eindeutigen `VERCEL_URL`-Host. Produktionsbereitstellungen und andere Vorschau-Branches bleiben ausgeschlossen. Eine Bereitstellung darf erst erfolgen, wenn die Projekt-SSO-Sperre verifiziert ist.

Der lokale Server bindet ausschliesslich an `127.0.0.1`. Lokal verweigert der Testmodus andere Hostnamen; auf Vercel ist er auf den oben genannten Preview-Branch samt dessen exaktem Host beschränkt. `npm run dev` aktiviert ihn nicht.

## Was der Test abdeckt

- Lokale Testanmeldung, ohne Google OAuth.
- Bewerbungen im Browser speichern, Status ändern und löschen.
- Formular für Lebenslauf, Stellenanzeige und belegte persönliche Angaben.
- Validierung, serverseitige Same-Origin-Prüfung, simulierte Briefantwort, Textbearbeitung und Download.
- Zehn simulierte Textaktionen pro Tag; Zähler werden beim Serverneustart zurückgesetzt.

## Grenzen und Testdaten

- Verwende nur erfundene Testdaten. Der Brief wird lokal erzeugt und nicht an OpenAI gesendet.
- Die Bewerbungsübersicht liegt ausschliesslich im `localStorage` des aktuellen Browsers. Sie wird nicht zwischen Geräten synchronisiert und kann mit Browserdaten gelöscht werden.
- Es werden keine Google-, Payrexx-, OpenAI- oder PostgreSQL-Dienste aufgerufen. Der lokale Test ist kein Nachweis für produktive Anmeldung, KI-Qualität, Zahlungsabwicklung, Datenschutz, Übersetzungen oder Vercel-Bereitstellung.
- `npm run dev` bleibt der normale Entwicklungsstart und aktiviert den Testmodus nicht.

