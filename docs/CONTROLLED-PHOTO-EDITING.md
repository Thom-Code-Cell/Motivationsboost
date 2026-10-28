# Kontrollierte Bewerbungsfoto-Bearbeitung (noch nicht live)
- Foto wird im Browser auf maximal 1280px verkleinert und als JPEG neu kodiert; EXIF wird nicht übernommen.
- Nur nach aktiver Sitzung, expliziter Zustimmung pro Versuch, festem Modus und begrenztem Prompt.
- Serverseitige OpenAI-Images-Edits-Anbindung mit `gpt-image-1`, genau einem Bild und ohne automatische Wiederholung.
- **Standardmässig gesperrt:** `PHOTO_STUDIO_ENABLED` ist nicht `true`. Vor Aktivierung OpenAI-Konto, `OPENAI_API_KEY`, Freigaben, Datenschutz und Kosten prüfen.
- Firestore reserviert vor dem API-Aufruf maximal zwei Versuche je Nutzer/Tag und zehn Versuche insgesamt pro Kalendermonat, atomar und ohne Rückbuchung bei unklaren Fehlern.
- Keine automatische Änderung von Lebensläufen oder anderen Bewerbungsdokumenten.
- **Kein Identitäts- oder Qualitätssiegel:** Gesichter, Proportionen und Details können trotz «Identity Lock»-Anweisung abweichen. Foto nur nach visueller Prüfung freigeben.
- Prüfplan: Consent, verweigerte Sitzung, falsche Datei, Quota-Rennen, Bildmodell-Verfügbarkeit und echte Android-/iOS-Anzeige mit freiwilligem Testfoto. Nicht ohne Tests auf Produktion freischalten.
