# Interner Test von Motivationsboost

Stand: 18. November 2026. Verwende ausschliesslich erfundene Testdaten.

## Lokaler Simulator ohne externe Dienste

```sh
npm ci
npm run dev:internal
```

Öffne `http://127.0.0.1:3000/` und wähle **Interne Testanmeldung starten**. Der Simulator speichert Bewerbungen lokal im Browser und erstellt einen simulierten Vorlagenbrief. Er ruft keine Datenbank, Firebase-, Google-, Zahlungs- oder KI-Dienste auf.

## Geschützte Preview-App

Die Preview-App ist unter [Motivationsboost Preview](https://motivationsboost-preview-lvo1nzor4-thomas-hullins-projects.vercel.app/) erreichbar und durch Vercel Authentication geschützt.

1. Registriere ein Testkonto mit einer Adresse, auf die du Zugriff hast. E-Mail-Verifizierung ist derzeit noch nicht eingerichtet.
2. Trage einen Test-Lebenslauf, eine Stellenanzeige und belegte Motivation, Beispiel und Beitrag ein.
3. Erstelle eine Bewerbung, ändere den Status, lade die Seite neu und kontrolliere, dass sie gespeichert bleibt.
4. Erstelle einen Briefentwurf, bearbeite ihn und lade ihn als Textdatei herunter.
5. Melde dich ab und wieder an. Kontrolliere, dass nur dein Testkonto seine Bewerbungen sieht.

Die Preview verwendet Neon/PostgreSQL und Better Auth. Sie benötigt weder Firebase noch einen Google-Login oder Google Drive. Der OpenAI-Anbieter ist derzeit nicht verbunden; stattdessen wird ein Vorlagenentwurf erzeugt. Payrexx-Zahlungen bleiben deaktiviert.

## Grenzen

- Nutze keine echten CVs, Arbeitgeberdetails oder Kontaktdaten, bis Datenschutz, Aufbewahrung und Löschung geklärt sind.
- Der Vorlagenbrief ist kein KI-generierter oder geprüfter Text. Ergänze konkrete Bezüge selbst und prüfe jede Aussage.
- E-Mail-Verifizierung und Passwort-Wiederherstellung fehlen noch.
- Die Preview ist keine Produktionsfreigabe.
