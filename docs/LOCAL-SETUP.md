# Motivationsboost vollständig lokal

## Start auf Windows

Voraussetzungen: Node.js 22.22 oder neuer (Node 22 nutzt SQLite noch als experimentelles eingebautes Modul), npm, Ollama. Es sind keine API-Schlüssel und keine Google-Anmeldung nötig.

Einmalig im Repository installieren (Internet nur für die Einrichtung):

```powershell
npm ci
npm run setup:local
ollama pull qwen3:4b-instruct
npm run build:local
```

Danach starten:

```powershell
powershell -ExecutionPolicy Bypass -File .\Start-Local.ps1
```

Im Browser `http://127.0.0.1:3210` öffnen. Mit Strg+C die App beenden. Die Daten bleiben erhalten. Die Policy-Option gilt nur für diesen Prozess; sie verändert keine globale Ausführungsrichtlinie.

Das Startskript setzt Ollama für neu gestartete Prozesse auf `127.0.0.1:11434` und `OLLAMA_NO_CLOUD=1`. Ist Ollama bereits auf allen Schnittstellen aktiv, wird der App-Start abgebrochen: Ollama im Tray beenden und das Skript erneut starten. Für einen bereits laufenden Loopback-Server muss der Betreiber ebenfalls sicherstellen, dass er mit `OLLAMA_NO_CLOUD=1` gestartet wurde. Die App akzeptiert ausschließlich lokale Textmodelle; Remote-Modelle und Cloud-Tags werden zusätzlich abgewiesen. Keine Router-Ports, Tunnel oder externen Dienste einrichten.

Linux/macOS: Ollama mit `OLLAMA_HOST=127.0.0.1:11434 OLLAMA_NO_CLOUD=1 ollama serve` starten und anschließend `npm run start:local`. Der tatsächliche Hardwaretest dieses Branches erfolgte auf Windows, nicht auf Linux/macOS.

## Bedienung

1. Neue Bewerbung, Unternehmen und Position eintragen.
2. Arbeitszeugnisse, Diplome und vorhandene Lebensläufe hinzufügen oder Quelltext einfügen. Erkannte Texte mit den Originalen vergleichen. Gewünschte Dokumente anhaken.
3. Stellenanzeige als Text einfügen oder lokale Datei einlesen. URLs werden im lokalen Modus nicht abgerufen.
4. „Lebenslauf erstellen“ und „Mit Ollama erstellen“ wählen. Entwurf bearbeiten und geprüft übernehmen.
5. Motivationsschreiben, ATS-Analyse, Interviewfragen und weitere Textfunktionen auswählen. Entwürfe und Eingaben werden lokal gespeichert; erst die ausdrückliche Übernahme ersetzt Bewerbungstexte.
6. Geprüfte Texte unten bearbeiten und speichern. Weitere KI-Funktionen verwenden diese aktuelle Fassung. PDF/Word exportieren oder die vollständige Mappe mit den ausgewählten Originalanlagen herunterladen.

ATS-Scores, Interview-Scores und Gehaltswerte sind unverbindliche Modellschätzungen. Es werden keine aktuellen Gehaltsdaten recherchiert. Suchstrategien sind Vorschläge, keine verifizierten offenen Stellen. Fehlende Bewerberangaben sollen leer/offen bleiben; jedes Ergebnis benötigt menschliche Faktenprüfung.

## Lokale Daten und Sicherungen

Windows-Standard: `%LOCALAPPDATA%\Motivationsboost\data`. Die Oberfläche zeigt den absoluten Pfad an.

- `motivationsboost.sqlite`: Einstellungen, Bewerbungen, Status, Notizen, Quelltexte, KI-Eingaben/Entwürfe und Dokumentenverweise.
- `documents/<UUID>`: unveränderte Originaldateien; Name, Typ, SHA-256 und extrahierter Text stehen in der Datenbank.
- `exports/`: erzeugte PDF-, Word- und ZIP-Dateien.
- OCR-Sprachdaten: `local-resources/ocr` im Repository; unabhängig von Bewerbungsdaten.
- Ollama-Modelle: das von Ollama konfigurierte Modellverzeichnis. `ollama list` muss das gewählte Modell im tatsächlich laufenden Server anzeigen.

„Sicherung herunterladen“ enthält einen konsistenten SQLite-Snapshot, validierbare Daten, Originaldokumente und Exporte. „Sicherung wiederherstellen“ importiert nur nach aktiver Dateiauswahl. Vorhandene Einträge/Einstellungen werden nicht überschrieben; bei gleichen IDs entstehen Kopien. Eine hochgeladene SQLite-Datei wird nicht als ausführbare Datenbank geöffnet; die Wiederherstellung baut die Tabellen aus den geprüften Sicherungsdaten neu auf.

Sicherungsgröße maximal 100 MB. Für größere Bestände die App stoppen und das gesamte Datenverzeichnis einschließlich etwaiger `-wal`/`-shm`-Dateien kopieren. Sicherungen enthalten persönliche Daten im Klartext: unter demselben Schutz wie die Originaldateien aufbewahren. Einzelbenutzermodus bedeutet Zugriff durch den angemeldeten Betriebssystemnutzer; es ist keine Mehrbenutzer- oder Festplattenverschlüsselung.

Das Löschen einer Bewerbung lässt die Originaldateien in der Bibliothek bestehen. Es erfolgt kein automatischer Cloud-Import und keine Cloud-Synchronisation.

## Konfiguration

Umgebungsvariablen vor dem Start setzen (PowerShell: `$env:NAME='Wert'`):

| Variable | Standard / Bedeutung |
| --- | --- |
| `APP_MODE` | `local` wird von den lokalen Start-/Buildskripten gesetzt. Ohne lokalen Modus bleibt die bestehende Cloud-Variante aktiv. |
| `LOCAL_DATA_DIR` | Absolutes eigenes Datenverzeichnis; nicht in einen automatisch synchronisierten Cloud-Ordner legen. |
| `LOCAL_PORT` | `3210`, App immer an `127.0.0.1`. |
| `OLLAMA_BASE_URL` | `http://127.0.0.1:11434`; nur numerische Loopback-Adressen, kein DNS, kein Proxy/Redirect. Das Windows-Startskript verwendet den Standard. Für eigenen Loopback-Port Ollama selbst starten und `npm run start:local` verwenden. |
| `OLLAMA_MODEL` | `qwen3:4b-instruct`; muss vorher lokal installiert sein. |
| `OLLAMA_TIMEOUT_MS` | `300000`, zulässig 1000–900000 ms. |
| `OLLAMA_NUM_CTX` | `8192`, zulässig 4096–32768; größere Werte benötigen mehr RAM. Zu große Eingaben werden abgewiesen, nicht still gekürzt. |
| `LOCAL_OCR_DIR` | `local-resources/ocr`; deutsche und englische Tesseract-Sprachdateien. |
| `LOCAL_NETWORK_LOG` | Optionaler Dateipfad für Verbindungsmetadaten des App-Servers (nur Host, Zeitpunkt, erlaubt/gesperrt; keine Inhalte). |

Die Standardwahl wurde mit Qwen 2.5 7B auf dem tatsächlichen Rechner verglichen. Qwen 3 4B benötigt weniger Speicher. `gpt-oss:20b` ist grundsätzlich lokal möglich, benötigt aber laut Ollama ungefähr 16 GB Modellspeicher; bei nur rund 6 GB freiem RAM wurde es nicht geladen. Cloud-Varianten von gpt-oss sind ausdrücklich gesperrt.

## Dokumente und Zusatzfunktionen

- PDF, DOCX, UTF-8-TXT, PNG, JPEG und WebP: maximal 8 MB pro Datei, PDFs maximal 30 Seiten.
- Gescannte und gemischte PDFs: jede textarme Seite wird lokal mit Tesseract erkannt. Deutsch/Englisch werden beim Setup heruntergeladen; zur Laufzeit kein Sprachdownload. OCR kann Lesefehler machen.
- Lokale Textmodelle generieren keine Bewerbungsfotos. Ein geprüftes lokales Bildmodell ist nicht eingerichtet.
- Spracherkennung: Whisper-Laufzeit und Modell fehlen; deaktiviert.
- Sprachausgabe: lokale TTS-Laufzeit/Stimme fehlen; deaktiviert. Keine automatische Nutzung externer Browser-Sprachdienste.
- Kein Handyzugriff. Ein abgesicherter LAN-Modus ist nicht Bestandteil dieser Implementierung.
- Der PDF-Export verwendet die vorhandene Helvetica-Schrift und ist für west-/mitteleuropäische Bewerbungstexte gedacht. Für Schriften außerhalb ihres Zeichenvorrats Word verwenden und die Darstellung prüfen.

## Offline, Aktualisieren und Entfernen

Nach Installation sind App, Modelle, OCR, Daten und Exporte lokal vorhanden. `npm run start:local` lädt keine Pakete nach. Der Produktionsstart blockiert ausgehende Nicht-Loopback-Verbindungen des Node-Servers; die Browserseite hat eine lokale Content Security Policy. Modellverfügbarkeit wird bei jedem Funktionsstart geprüft; kein Cloud-Fallback.

Vor einem Update sichern, App stoppen, gewünschten geprüften Commit auschecken, `npm ci` und `npm run build:local` ausführen. Updates benötigen Internet. Das Datenverzeichnis liegt außerhalb des Codes und wird dabei nicht gelöscht.

Deinstallation: App stoppen, Repository entfernen. Bewerbungsdaten/Sicherungen nur bewusst separat löschen. Das Löschen des Repositorys löscht das Standard-Datenverzeichnis nicht. Nur ausschließlich für diese App installierte Modelle bei Bedarf mit `ollama rm qwen3:4b-instruct` entfernen; andere Modelle und Cloud-Daten bleiben unberührt.

## Entwicklerprüfungen

```powershell
npm run typecheck
npm test
npm run build
npm run build:local
# Separat einen lokalen Server mit einem isolierten LOCAL_DATA_DIR starten.
$env:LOCAL_REAL_AI='1'
npx playwright test --config playwright.local.config.ts
```

Ohne `LOCAL_REAL_AI=1` laufen nur die modellunabhängigen Browserprüfungen. CI führt bestehende Cloud-Emulatortests und lokale Tests aus. Ein grünes CI ist kein Ersatz für echte Ollama- oder OCR-Tests. Details und Grenzen stehen in `LOCAL-VERIFICATION.md`.
