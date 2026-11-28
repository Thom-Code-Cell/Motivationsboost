# Motivationsboost für Android

Die Trusted Web Activity startet auf `https://motivationsboost.th-analytica.com/android`. Anmeldung, Bewerbungsentwürfe und vorhandene Credits nutzen das bestehende Konto. Die Android-Oberfläche enthält keine Kauf- oder Checkout-Links. Die Play-Fassung benötigt eine Internetverbindung.

## Build

Voraussetzungen sind Gradle 8.13, JDK 17 oder neuer sowie Android SDK 36 und Build Tools 36.0.0. Aus diesem Verzeichnis:

```sh
gradle :app:assembleDebug :app:bundleRelease
```

Die Debug-APK hat die Paket-ID `com.thanalytica.motivationsboost.debug`. Das Release-Bundle hat die Paket-ID `com.thanalytica.motivationsboost`. Das Release-Bundle wird ohne Signatur gebaut. Den Upload-Schlüssel über Android Studio unter dem Betreiberkonto erstellen und sicher verwahren. Danach das Release-Bundle mit diesem Schlüssel signieren und in die interne Testspur hochladen.

## Play Console

- App-Name: Motivationsboost
- Kurzbeschreibung: Erstelle ein persönliches Motivationsschreiben aus deinen Erfahrungen.
- Beschreibung: Motivationsboost hilft dir, deine eigenen Erfahrungen in ein Motivationsschreiben für eine konkrete Stelle zu verwandeln. Ergänze ein Beispiel aus deinem Berufsalltag, erstelle einen Entwurf und passe den Text selbst an. Exportiere dein Schreiben als PDF oder Word-Datei.
- Datenschutzerklärung: `https://motivationsboost.th-analytica.com/android/datenschutz`
- Kontolöschung: `https://motivationsboost.th-analytica.com/android/konto-loeschen`
- Für die App-Prüfung ein separates Konto ohne persönliche Daten bereitstellen. Die bestehenden Entwürfe und der Export lassen sich ohne Kauf prüfen. Zugangsdaten nur in der Play Console hinterlegen.
- Aus **App-Integrität** den SHA-256-Fingerabdruck des **App-Signaturschlüssels** kopieren. In Vercel als `ANDROID_PLAY_SIGNING_SHA256` für Production setzen und neu bereitstellen. Danach `/.well-known/assetlinks.json` und die Vollbilddarstellung mit dem von Play installierten Build prüfen.
- Vor dem Produktionstrack Anmeldung, Passwort-Reset, Kontolöschungsseite, Entwurf und Downloads auf einem Android-Gerät prüfen. Die Datenschutzerklärung und das Datenschutzformular müssen die tatsächlich aktiven Dienste und Datenflüsse abbilden.
