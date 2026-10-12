# Lokale Verifikation – 12. Oktober 2026

Ausgangspunkt: PR #2, `fix/platform-reliability`, Commit `a54b9c64826c3c8e703b4987c95a4c93afeb1422`. Eigener Branch: `feat/local-ollama`. Keine Produktionsveröffentlichung, kein Merge, keine Änderung an Cloud-Zugriffsrechten oder Cloud-Daten. Stripe wurde nicht erweitert; Payrexx bleibt außerhalb des Auftrags.

## Tatsächlicher Rechner

Windows 11 Home 10.0.26300, AMD Ryzen AI 9 HX 370 (12 Kerne/24 Threads), Radeon 890M, 31,1 GiB nutzbarer RAM, anfangs etwa 6,1 GiB frei, etwa 629 GiB freier SSD-Speicher. Node 22.22.1, npm 10.9.4, Ollama 0.40.3.

Ollama meldete einen zu alten AMD-Treiber und verwendete CPU-Inferenz. Kein GPU-Treiber wurde verändert. Der ursprünglich laufende Ollama-Prozess lauschte auf allen Schnittstellen; er wurde im Rahmen des lokalen Auftrags durch einen Loopback-Prozess mit `OLLAMA_NO_CLOUD=1` ersetzt. Das Listening auf `127.0.0.1:11434` wurde mit Windows-TCP-Informationen bestätigt.

Zwei Modellverzeichnisse waren vorhanden: Der ursprüngliche Server zeigte keine Modelle an, während das in der Umgebung konfigurierte Verzeichnis bereits Qwen 2.5 7B, Qwen 2.5 Coder 7B, Llama 3 8B, DeepSeek Coder 6.7B und eigene TH-Analytica-Varianten enthielt. Diese wurden nicht gelöscht oder ersetzt. Das neu heruntergeladene Qwen-3-Modell wurde auch im konfigurierten Verzeichnis bereitgestellt.

## Modellauswahl

Ein kleiner Test verwendete ausschließlich erfundene Daten: Lea Muster, Beispiel AG, Kundenkontakt und Excel; Ausbildung und Kontaktangaben ausdrücklich unbekannt.

| Modell | Reales Ergebnis | Zeit einschließlich Laden |
| --- | --- | --- |
| `qwen3:4b-instruct`, Q4_K_M, 2,5 GB, Digest-Präfix `0edcdef34593` | Valides JSON; belegte Fähigkeiten und fehlende Angaben korrekt | 6,10 s |
| vorhandenes `qwen2.5:7b`, 4,7 GB | Valides JSON; dieselben Fakten korrekt | 13,40 s |

Das ist ein kleiner Funktionstest, kein allgemeiner Modellbenchmark. Qwen 3 4B ist wegen des begrenzten freien RAM und der gemessenen Laufzeit der Standard. Beide Modelle benötigen weiterhin Fakten- und Sprachprüfung durch den Anwender.

`gpt-oss:20b` wurde anhand der tatsächlichen Speichersituation geprüft, aber nicht geladen: Laut [Ollamas Modellbeschreibung](https://ollama.com/library/gpt-oss) benötigt es ungefähr 16 GB Speicher; verfügbar waren nur rund 6 GB. Es gibt keinen Ersatz durch die Cloud-Variante. [Ollamas Dokumentation](https://docs.ollama.com/faq) beschreibt die CPU/GPU-Anzeige und die lokale Serverkonfiguration.

## Implementiert und automatisiert geprüft

- Klare lokale/Cloud-Trennung, lokale Einzelbenutzeroberfläche, bestehende Cloud-Oberfläche separat erhalten.
- Serverseitige Ollama-Anbindung mit Loopback-Adresse, Modell-/Fähigkeitsprüfung, strukturiertem Schema, Ausgabevalidierung, Kontextgrenze, Zeitlimit und Abbruchweitergabe.
- SQLite für Einstellungen, Bewerbungen, Status, Notizen, Quelltexte, Eingaben/Entwürfe und Dokumentenverweise; lokale Originale und Exporte.
- Sicherung mit Datenbank-Snapshot, Dokumenten und Exporten; validierte additive Wiederherstellung ohne Überschreiben vorhandener Datensätze.
- PDF/DOCX/TXT und unterstützte Bilder; lokale Tesseract-OCR auch je textarmer Seite gemischter PDFs.
- Mehrseitiges PDF, echtes DOCX und ZIP-Bewerbungsmappe mit gewählten Originalanlagen.
- Ursprungskontrolle für Schreibaktionen, Hostprüfung, gesperrte Cloud-Routen im lokalen Modus, Dateityp-/Größen-/Archivprüfungen, lokale Fonts und CSP.
- 108 Unit-Tests einschließlich vorhandener Cloud-Regressionen sowie lokaler Anfrage-, Schema-, Speicher-, Datei-, Export- und Sicherheitsfälle.
- TypeScript-Prüfung, lokaler Produktionsbuild und Cloud-Produktionsbuild erfolgreich. Produktionsabhängigkeiten: `npm audit --omit=dev` ohne gemeldete Schwachstellen. Die bereits dokumentierten Entwicklungsabhängigkeiten der Firebase-CLI sind davon getrennt.

## Auf dem Rechner nachgewiesen

- Browserablauf mit echtem Ollama für alle 15 Textfunktionen: Lebenslauf, Motivationsschreiben, ATS-Analyse und Überarbeitung, Interviewfragen und schriftliche Antwortanalyse, LinkedIn, E-Mail, Lückenprüfung, Schlüsselwörter, erforderliche Dokumente, Stil, Gehalt, Suchstrategie und weiterer Text.
- OCR-Test mit einem lokal erzeugten Zeugnisbild und einem daraus erzeugten gescannten PDF: „Lea Muster“ korrekt erkannt. Kein OCR-Mock und kein Sprachdownload zur Laufzeit.
- Erstellen, Ändern, Statuswechsel, Löschen, Neuladen, Sicherung und Wiederherstellung im Browser; mobile Ansicht bei 390 px ohne horizontalen Überlauf.
- Neustartnachweis mit vollständig beendetem Node-Prozess und neuem Prozess; erhaltene Bewerbung samt Status und Notiz.
- Wiederherstellung in ein vorher leeres Datenverzeichnis.
- Nicht erreichbares Ollama, real nicht vorhandenes Modell, reales 1-Sekunden-Zeitlimit sowie abgebrochene echte Generierung mit anschließender erfolgreicher Generierung.
- Anwendungsofflinetest: externe Browseranfragen blockiert, Nicht-Loopback-Verbindungen des Node-Servers gesperrt. Keine externen Browseranfragen beobachtet. 25 zusätzliche TCP-Stichproben der App-/Ollama-Prozesse zeigten keine externen Verbindungen. Der gesamte Rechner wurde nicht vom Internet getrennt; dies ist kein umfassender Paketmitschnitt sämtlicher Betriebssystemprozesse.

Die lokalen Rohprotokolle liegen im ignorierten `local-evidence/`: `real-ollama.json`, `playwright.json`, `runtime/results.json`, `network.jsonl`, `process-network.json` und Screenshots. Darin sind ausschließlich synthetische Testdaten. CI installiert sauber und prüft die Cloud-Emulatoren sowie den lokalen Browserkern, führt aber keine vorgetäuschten Ollama-Tests aus.

## Während der Prüfung behoben

- Eindeutige Formularbeschriftungen auch nach Neuladen.
- OCR-Worker wird aus dem lokalen Node-Paket geladen, ohne durch den Produktionsbundler verfälschte Pfade.
- Aktuelle geprüfte CV-Texte statt veralteter strukturierter Daten für nachgelagerte KI-Funktionen.
- Keine ATS-Umschreibung bei leerer oder ausschließlich unbelegter Schlüsselwortliste; Originaltexte bleiben erhalten. Belegte Schlüsselwörter wurden zusätzlich mit echtem Modell geprüft.
- Explizites Referenzdatum und Vorgaben gegen die Darstellung abgeschlossener Anstellungen als aktuelle Beschäftigung; Regressionen für LinkedIn/Lückenprüfung im echten Modelltest.

## Grenzen

Generative Texte sind prüfbare Entwürfe, keine garantierten Tatsachenbehauptungen. Die Stichproben führten zu den oben genannten Korrekturen; sie beweisen keine allgemeine Halluzinationsfreiheit. Stil und Grammatik können Nachbearbeitung benötigen. OCR kann Lesefehler erzeugen. Umfangreiche Eingaben müssen bei Überschreitung des konfigurierten Kontextbudgets gekürzt oder aufgeteilt werden; es erfolgt keine stille Kürzung.

Fotoerstellung, Spracheingabe und Sprachausgabe sind ausdrücklich deaktiviert. FFmpeg ist vorhanden; Whisper/faster-whisper, Piper, PyTorch und Diffusers wurden in der aktiven Python-Installation nicht gefunden. Ein zuverlässiger lokaler Medienablauf wurde daher nicht behauptet. Kein LAN-/Handymodus, keine GPU-Verifikation, keine Verschlüsselung durch die App, keine Prüfung von nichtlateinischen PDF-Schriften. Cloud-Provider-E2E und produktive Deployments gehören nicht zu diesem lokalen Nachweis.
