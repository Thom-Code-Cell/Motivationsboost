# Google Workspace · Transaktionsmail für Motivationsboost

Der Google-Versand ist eine deterministische Workspace-Automatisierung. Die Anwendung löst Kontonachrichten und bereits angebundene Payrexx-Testnachrichten aus. Die Google-Ausführung nutzt die Gmail API mit `gmail.send` und dem bereits eingerichteten Absender `motivationsboost@th-analytica.com`.

## Geschützte Vorschau

- Das Apps-Script-Projekt enthält `Code.gs` und das beigefügte Manifest. Das bestehende geschäftliche Google-Konto bleibt Inhaber der Bereitstellung.
- In privaten Skripteigenschaften `MAIL_RELAY_MODE=preview` und einen eigenen 32-Byte-Schlüssel als 64 Hex-Zeichen in `MAIL_RELAY_SECRET` hinterlegen. Den Schlüssel ausschliesslich in Google-Skripteigenschaften und als sensibles Vercel-Umgebungsmerkmal ablegen.
- Google-Web-App als das bestehende Geschäftskonto ausführen. Der externe Vercel-Server benötigt den Apps-Script-Zugriff «Jeder». Die Web-App akzeptiert nur gültig signierte POST-Anfragen mit kurzem Zeitfenster. Der Vorschau-Modus beschränkt Empfänger auf das Testpostfach und seine dedizierten Plus-Adressen sowie auf höchstens 30 Versandversuche pro Schweizer Kalendertag.
- Nur in der geschützten Motivationsboost-Vorschau `EMAIL_TRANSPORT=google-workspace`, `GOOGLE_APPS_SCRIPT_MAIL_URL` mit der von Google zugeteilten HTTPS-`/exec`-Adresse und `GOOGLE_APPS_SCRIPT_MAIL_SECRET` setzen. Mit `NEXT_PUBLIC_TRANSACTIONAL_EMAIL_ENABLED=true` und `NEXT_PUBLIC_EMAIL_VERIFICATION_REQUIRED=true` zeigt die Vorschau die zugehörigen Kontofunktionen und Hinweise an. Die entsprechende Vorschau neu bereitstellen. Der App-Versand übernimmt den festen Absender und Rückkanal aus dem Script.
- Test zuerst ohne gültige Signatur und mit einem synthetischen Empfänger ausserhalb der Freigabe. Anschliessend über das zulässige Testpostfach Registrierung mit Bestätigung, Passwort-Wiederherstellung und ein angebundenes Payrexx-Testereignis auslösen. Empfang, Rückkanal und Authentifizierungsheader im Zielpostfach prüfen.

Die Anwendung signiert nur serverseitig. Der Relay speichert zur Deduplizierung gehashte Anfrage-IDs, Zeitpunkte und Versandstatus. E-Mail-Inhalte werden dabei nicht in den Skripteigenschaften gespeichert. Ein unklarer Anbieterfehler wird vor einem Wiederholungsversuch abgeglichen. Für einen pausierten Versand den Relay-Schlüssel entfernen oder die Bereitstellung deaktivieren.

Die Vorschau-Autorisierung gibt weder die Verkaufsseite noch einen Produktionsempfänger frei. Für einen späteren Produktionsstart die Versandbereitstellung und ihren Schlüssel separat einrichten und Google-Quoten, Rechte, Datenverarbeitung und Versandnachweis nach der Schlussfreigabe prüfen.

[Apps-Script-Web-Apps](https://developers.google.com/apps-script/guides/web) · [Gmail-Sende-API](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send)
