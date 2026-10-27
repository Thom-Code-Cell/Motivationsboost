# Historical product overview

Operational setup and release status are documented in README.md and docs/RELEASE-CHECKLIST.md. This older product overview is not proof that a feature has been verified live.


# App-Zusammenfassung & Technische Dokumentation

Dieses Dokument bietet einen umfassenden Überblick über die Architektur, Funktionen und technischen Details der "Bewerbung leicht gemacht mit AI"-App. Es richtet sich an externe Entwickler, die das Projekt verstehen und weiterentwickeln sollen.

## 1. App-Konzept & Wertversprechen

Die Anwendung ist ein **intelligenter Bewerbungs-Copilot**, der Nutzer durch den gesamten Bewerbungsprozess begleitet. Sie automatisiert und optimiert die Erstellung von Bewerbungsunterlagen, bereitet auf Interviews vor und hilft Nutzern, sich auf dem Arbeitsmarkt von der Konkurrenz abzuheben.

**Kernwert:** Zeitersparnis, strategische Optimierung für Bewerber-Tracking-Systeme (ATS), authentische Personalisierung und Stärkung des Selbstvertrauens.

## 2. Technologie-Stack

*   **Framework:** Next.js (App Router)
*   **Sprache:** TypeScript
*   **Styling:** Tailwind CSS
*   **UI-Komponenten:** shadcn/ui
*   **KI-Integration:** OpenAI Responses API (GPT), OpenAI Speech API und optionale OpenAI Image Edits mit bestehender Flow-Schnittstelle
*   **Backend & Authentifizierung:** Firebase (Auth, Firestore)
*   **Zahlungen:** Stripe
*   **Dokumenten-Upload:** Google Drive API

## 3. Authentifizierung & Nutzerdaten

*   **Anbieter:** Firebase Authentication mit **Google Provider**.
*   **Scopes:** Bei der Anmeldung werden zusätzlich die Scopes `https://www.googleapis.com/auth/drive.file`  angefragt, um Dokumenten-Uploads und -Import zu ermöglichen.
*   **Nutzerdaten:** Nach erfolgreicher Authentifizierung werden nutzerspezifische Daten in der Firestore-Datenbank gespeichert.
*   **Admin-Zugriff:** Die Umgebungsvariable `ALLOWED_ADMIN_UIDS` wird verwendet, um bestimmten Nutzern Admin-Rechte zu gewähren (z.B. für den Zugriff auf das Owner-Dashboard). Diese Variable beschränkt nicht den allgemeinen Login.

## 4. Firestore-Datenstruktur

### Collection: `users`
Enthält nutzerspezifische Einstellungen, Abonnement-Daten und von der KI generierte Inhalte.
*   **Dokument-ID:** `{userId}` (die UID des Firebase-Nutzers)

**Felder pro Nutzerdokument:**

| Feldname | Typ | Beschreibung |
| :--- | :--- | :--- |
| `plan` | `string` | Der aktuelle Plan ('free', 'pro_month'). |
| `price` | `number` | Der Preis des aktuellen Plans (z.B. 0, 39). |
| `stripe...` | `string` | Diverse IDs für die Stripe-Integration. |
| `subscriptionStatus` | `string` | Status des Abos (z.B. 'active', 'canceled'). |
| `userStyleSample` | `string` | Ein vom Nutzer bereitgestellter Text zur Analyse seines Schreibstils. |
| `useStyleSample` | `boolean` | Schalter, ob die Stilprobe für die Generierung verwendet werden soll. |
| `useAutoLinkedInBooster`| `boolean` | Schalter, ob nach der CV-Generierung der LinkedIn-Booster automatisch laufen soll. |
| `language` | `string` | Die bevorzugte Sprache des Nutzers ('de', 'en', 'fr', 'it'). |
| `features` | `map` | Ein Objekt, das die Verfügbarkeit von Features steuert (Feature-Flags). |
| `admin` | `boolean` | True, wenn der Nutzer Admin-Rechte hat. |
| `...` | `any` | Weitere Felder für Gamification, Upselling und AGB-Tracking. |


### Collection: `applications`
Enthält die von Nutzern getrackten Bewerbungen.
*   **Dokument-ID:** (auto-generiert)

**Felder pro Bewerbungsdokument:**

| Feldname | Typ | Beschreibung |
| :--- | :--- | :--- |
| `userId` | `string` | Referenz zum `users` Dokument. |
| `jobTitle` | `string` | Die Berufsbezeichnung. |
| `company` | `string` | Der Firmenname. |
| `jobUrl` | `string` | Link zur Stellenanzeige. |
| `status` | `string` | Einer von: 'Entwurf', 'Gesendet', 'Antwort erhalten', 'Interview', 'Absage', 'Zusage'. |
| `applicationDate` | `Timestamp`| Das Datum, an dem der Eintrag erstellt wurde. |
| `notes` | `string` | Optionale Notizen des Nutzers (z.B. für Drive-Links). |

### Collection: `progress`
Speichert den Fortschritt der Nutzer-Meilensteine.
*   **Dokument-ID:** `{userId}`

**Felder pro Fortschrittsdokument:**

| Feldname | Typ | Beschreibung |
| :--- | :--- | :--- |
| `userId` | `string` | Referenz zum `users` Dokument. |
| `progress` | `map` | Ein Objekt, das den Status der Meilensteine enthält. |
| `progress.letterGenerationCount`| `number`| Zählt, wie oft ein Motivationsschreiben generiert wurde. |
| `progress.earnedBadges`| `array`| Eine Liste mit den IDs der verdienten Abzeichen. |
| `progress.progressScore`| `number`| Der Gesamtfortschritt in Prozent (0-100). |
| `lastUpdated` | `Timestamp`| Zeitstempel der letzten Aktualisierung. |


## 5. KI-Flows (OpenAI)

Die KI-Funktionen nutzen weiterhin die Flow-Schnittstelle in `src/ai/flows/`, mit OpenAI als Modellanbieter. Jeder Flow ist ein Server-Side-Modul, das eine klar definierte Aufgabe erfüllt.

*   **`autofill-cv-gaps.ts`**: Identifiziert Lücken im Lebenslauf und schlägt diplomatische Formulierungen vor, um diese zu füllen.
*   **`extract-job-keywords.ts`**: Extrahiert Schlüsselkompetenzen, Soft Skills und eine Zusammenfassung aus einer Stellenanzeigen-URL.
*   **`generate-application-feedback.ts`**: Analysiert Lebenslauf und Anschreiben im Vergleich zu einer Job-URL, vergibt einen ATS-Score und gibt Verbesserungsvorschläge.
*   **`generate-cv-from-documents.ts`**: Erstellt einen strukturierten, chronologisch sortierten Lebenslauf im JSON-Format aus dem Text mehrerer Dokumente (z.B. Arbeitszeugnisse).
*   **`generate-interview-questions.ts`**: Generiert basierend auf einer Job-URL wahrscheinliche technische, verhaltensbasierte und Rückfragen für ein Bewerbungsgespräch.
*   **`generateLinkedInSummary.ts`**: Erstellt basierend auf dem strukturierten CV-JSON eine professionelle und authentische Zusammenfassung für die "Info"-Sektion des LinkedIn-Profils.
*   **`generate-motivation-letter.ts`**: Erstellt ein personalisiertes Motivationsschreiben. Nutzt Job-URL, Keywords, CV-Daten und optional die persönliche Stilprobe des Nutzers.
*   **`refine-documents-for-ats.ts`**: Optimiert bestehende Dokumente (CV, Anschreiben), indem es fehlende Keywords aus der ATS-Analyse natürlich integriert.
*   **`predict-salary-range.ts`**: Analysiert CV, Job-URL und Standort, um eine realistische Gehaltsspanne vorzuschlagen.
*   **`generate-email-response.ts`**: Erstellt professionelle E-Mail-Vorlagen für verschiedene Szenarien (z.B. Nachfassen, Dankes-Mail).
*   **`suggest-job-opportunities.ts`**: Analysiert CV und Standort, um passende Jobtitel, Firmen und Such-Links vorzuschlagen.
*   **`analyze-writing-style.ts`**: Analysiert eine Textprobe, um ein detailliertes Feedback zum Schreibstil des Nutzers zu geben.
*   **`generate-audio-from-text.ts`**: Wandelt Text in gesprochene Sprache um (TTS), wird im Interview-Coach verwendet.
*   **`analyze-interview-answer.ts`**: Analysiert die aufgenommene oder geschriebene Antwort des Nutzers auf eine Interviewfrage.
*   **`generate-marketing-content.ts`**: Erstellt Marketing-Texte für den Admin (Owner-Dashboard).


## 6. Zahlungen & Abonnements (Stripe)

Die Stripe-Integration erfolgt über zwei API-Endpunkte und einen Webhook.

*   **`src/app/api/stripe/checkout-session/route.ts`**: Erstellt eine neue Stripe Checkout Session, wenn ein Nutzer ein Abonnement abschliessen möchte.
*   **`src/app/api/stripe/webhook/route.ts`**: Empfängt Webhook-Events von Stripe (z.B. `checkout.session.completed`, `customer.subscription.updated`), um den Abonnementstatus in der Firestore-Datenbank zu aktualisieren.
*   **`src/lib/stripe.ts`**: Initialisiert das Stripe-SDK mit dem Secret Key.

## 7. UI-Komponenten & Frontend-Struktur

Die Haupt-UI ist in `src/components/dashboard.tsx` organisiert und nutzt ein Sidebar-Navigationssystem.

*   **`dashboard.tsx`**: Das zentrale Layout nach dem Login. Verwaltet den globalen Zustand (Nutzer, Abo-Status, Stilprobe, Fortschritt) und rendert die aktive Ansicht.
*   **`start-dashboard.tsx`**: Die personalisierte Startseite, die den Nutzer durch den Prozess führt.
*   **`progress-tracker.tsx`**: Visualisiert die erreichten Meilensteine des Nutzers.
*   **`job-tracker.tsx`**: UI zur Verwaltung von Bewerbungen (Status, Datum, etc.).
*   **`job-finder.tsx`**: UI zur KI-gestützten Generierung von Job-Suchstrategien.
*   **`motivations-generator.tsx`**: UI für den Generator von Motivationsschreiben. Beinhaltet die Keyword-Analyse und den Editor.
*   **`style-profile.tsx`**: UI zur Eingabe und Speicherung der persönlichen Stilprobe und der Automatisierungs-Einstellungen.
*   **`linkedin-booster.tsx`**: UI zur Optimierung des LinkedIn-Profils.
*   **`cv-generator.tsx`**: UI zur Auswahl von Dokumenten aus Google Drive und zur Generierung eines visuellen Lebenslaufs.
*   **`cv-preview.tsx`**: Rendert die verschiedenen CV-Templates (Modern, Klassisch, Minimalistisch, Kreativ, Kompakt) basierend auf den generierten JSON-Daten und einem wählbaren Farb-Thema.
*   **`cv-gaps-filler.tsx`**: UI zur Analyse und Füllung von Lebenslauf-Lücken.
*   **`application-feedback.tsx`**: UI für den ATS-Check und die automatische Optimierung.
*   **`interview-coach.tsx`**: UI zur Generierung von Interviewfragen, inkl. Sprachausgabe (TTS) und -eingabe (STT) mit KI-Feedback.
*   **`salary-checker.tsx`**: UI zur Prognose einer Gehaltsspanne für eine bestimmte Stelle.
*   **`email-generator.tsx`**: UI zum Erstellen von E-Mail-Vorlagen für verschiedene Bewerbungssituationen.
*   **`document-scanner.tsx` (`DocumentUploads`)**: Ermöglicht das Scannen via Kamera oder den Import von Dateien aus Google Drive in einen spezifischen App-Ordner.
*   **`export-center.tsx`**: Ermöglicht das Zusammenstellen einer Bewerbungsmappe und den Export als ZIP-Archiv (PDF oder DOCX).
*   **`abo.tsx`**: Zeigt die verschiedenen Abonnements (Starter vs. Pro) an und initiiert den Checkout-Prozess.
*   **`trust-center.tsx`**: Zeigt ein FAQ zu den Themen Datenschutz, Datensicherheit und KI-Nutzung an, um das Vertrauen der Nutzer zu stärken.
*   **`owner-dashboard.tsx`**: Ein nur für Admins zugängliches Dashboard zur Anzeige von Nutzerstatistiken und zur Generierung von Marketing-Inhalten.

## 8. Umgebungsvariablen (`.env`)

Die folgenden Umgebungsvariablen sind für den vollen Funktionsumfang erforderlich:

```
# Firebase Konfiguration (wird bei der Ersteinrichtung generiert)
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# Admin-Zugriff (kommagetrennte Liste von Firebase User IDs)
# Wenn gesetzt, erhalten NUR diese Nutzer Admin-Rechte. Beschränkt den Login NICHT.
ALLOWED_ADMIN_UIDS=...

# Stripe Konfiguration
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_...
NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID=price_...
```
## 9. Geplante Features & Roadmap

Die folgenden Features wurden als wertvolle Erweiterungen identifiziert und könnten in zukünftigen Versionen implementiert werden:

*   **Tiefere Workflow-Integration & Automatisierung:**
    *   **Browser-Erweiterung:** Eine Chrome-Erweiterung, die es Nutzern erlaubt, eine Stellenanzeige auf einer beliebigen Job-Seite zu speichern. Die Erweiterung könnte automatisch die URL und Jobdetails extrahieren und direkt an den Job-Tracker in der App senden, um den Bewerbungsprozess nahtlos zu starten.
    *   **Automatischer Dokumenten-Abgleich:** Nach dem Generieren eines CVs und Anschreibens könnte die KI eine "Checkliste" für die spezifische Bewerbung erstellen und prüfen, ob alle geforderten Dokumente (z.B. "Führerschein", "Arbeitszeugnis Firma X") im Drive-Ordner vorhanden sind.

*   **Erweiterte KI-Funktionen:**
    *   **Mehrsprachigkeit:** Generierung von Dokumenten auf Englisch und Französisch. (ERLEDIGT)

*   **Emotionale UX & Gamification:**
    *   **Community-Features:** Anonymisierte Erfolgsgeschichten, bei denen Nutzer (nach expliziter Zustimmung) ihre erfolgreiche Bewerbungsreise teilen können, um andere zu inspirieren (z.B. "Nutzer aus dem Bereich Marketing hat nach 12 Bewerbungen einen Job gefunden").

*   **Visuelle Aufwertung:**
    *   **Visuelle CV-Vorlagen:** Mehr Design-Templates für den `cv-generator`. (ERLEDIGT)


