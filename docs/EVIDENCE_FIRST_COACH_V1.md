# Motivationsboost: Bewerbungscoach statt Textgenerator

Version: Evidence-first V1, 26. Oktober 2026.
Status: Entwicklungsbranch, keine Produktionsfreigabe.

## Ziel und Nutzerreise

Motivationsboost hilft Menschen, ihre eigenen Fähigkeiten, Erfahrungen und Motivationen glaubwürdig zu zeigen. Die KI formuliert, aber erfindet keine Lebensläufe.

1. Stellenlink und, wenn tatsächlich abgerufen, die konkreten Stellenanforderungen analysieren. Ein Link alleine belegt keine Stellenbeschreibung.
2. Vor jedem Schreiben ein persönliches, wahrheitsgemässes Interview: Warum genau dieses Unternehmen? Welches eigene Praxisbeispiel beweist die Eignung? Welchen realistischen Beitrag kann die Person leisten? Was ist offen?
3. Die Person bestätigt ihre Angaben. Die KI erzeugt einen Entwurf ohne erfundene Titel, Zeugnisse, Zeiträume oder Kennzahlen.
4. Der Entwurf bleibt von Google Drive und Export getrennt, bis der Mensch ihn vollständig geprüft und freigegeben hat.
5. Vor dem ZIP-Export müssen auch Lebenslauf, LinkedIn-Text und andere ausgewählte Unterlagen explizit bestätigt werden.

## Verbindliche inhaltliche Qualitätsregeln

- Keine erfundenen Arbeitgeber, Titel, Zeugnisse, Ausbildungen, Ergebnisse, Leistungszahlen oder Kontakte.
- Unklare Berufszeiten werden als offene Rückfragen markiert statt mit vermeintlich plausiblen Biografien gefüllt.
- ATS-Relevanz bedeutet nicht, fehlende Kompetenzen durch Schlagwörter zu erfinden.
- Keine KI-Detektor-Pseudowahrscheinlichkeiten, keine garantierte Interviewquote oder ATS-Punktzahl als objektive Prognose.
- Echte Stilproben beeinflussen Ton und Wortwahl, nicht behauptete Qualifikationen.
- Menschen können einen Karrierewechsel realistisch anhand übertragbarer Fähigkeiten erklären.
- Ohne bewusste Bestätigung werden keine Bewerbungen an Arbeitgeber versandt.
- Keine Diskriminierung aufgrund geschützter Merkmale; private Angaben nur, wo für die Stelle notwendig.

## In diesem Branch umgesetzt

- Pflichtfelder für Arbeitgebermotivation, konkretes eigenes Erlebnis, Beitrag für die Rolle und Wahrheitserklärung.
- Belegorientierter Prompt für Motivationsschreiben.
- Entwurfs- und Freigabeschritt vor Drive-Speicherung.
- Manuelle Freigabe im Export samt transparenten Heuristik-Hinweisen.
- Vorsichtigere KI-Prompts für CV, CV-Lücken, LinkedIn, ATS und Feedback.
- Festen Testnutzer in der Startseite durch echten Google-Firebase-Login ersetzt; Drive-Token muss nach Seitenneuladen erneut bestätigt werden.
- Erste Unit-Tests über den Befehl: npm run test:quality.

## Nicht umgesetzt oder nicht verifiziert

Der Server validiert Authentifizierung für alle AI Server Actions noch nicht zuverlässig. Kein belegter lokaler vollständiger Build oder E2E-Test mit echten Google-Anmeldungen. Keine Firebase-Rules-Prüfung, keine bestätigte sichere Zahlungsintegration, keine Nutzerstudie oder Payrexx-Migration. Keine Produktionsfreigabe.

## Zwingende Freigabebedingungen

1. **Serverseitige Auth- und Berechtigungsprüfung** für jede KI-Aktion, Nutzersitzungen, Zahlungsstatus, Rate Limits und Kostenschutz; niemals nur auf clientseitige Häkchen vertrauen.
2. **Zahlungen:** Stripe-Checkout darf keine fremden Nutzer-IDs oder nicht erlaubte Preise aus ungeprüften Requests akzeptieren. Webhook-Signaturen und idempotente Zustandsänderungen prüfen. Payrexx-Umstellung nur getrennt und nach validierten Tests.
3. **Firebase:** Zugriffsregeln auf eigene Datensätze, Admin-Flags nicht allein aus öffentlich lesbaren Variablen, Tests gegen fremde UID.
4. **Stellenanzeigen-Abruf:** SSRF-Schutz gegen interne URLs/IP-Adressen, abgesicherte Redirects, Timeout, Grössenlimits, Prompt-Injection-Abwehr.
5. **Datenschutz:** Offenlegen, welche Daten in KI-Dienste und Google Drive gelangen; Schweizer DSG, sofern erforderlich DSGVO, Einwilligung und Löschvorgang prüfen.
6. **QA:** Lint, Typecheck, Build, Unit- und Integrationstests, echte Login-/Drive-/Export-Tests, mobiles Layout und negative Testfälle.

Ohne diese Nachweise: kein Merge in Produktion und keine öffentliche Vermarktung als sicher.

## Akzeptanztests

| Fall | Erwartung |
| --- | --- |
| Kein konkretes eigenes Praxisbeispiel | Generierung verweigert |
| Falsche oder fehlende Wahrheitserklärung | Generierung verweigert |
| Unbelegte Prozentangabe im Text | Menschliche Faktenprüfung anregen |
| Überarbeiteter Text nach Freigabe | Freigabestatus zurücksetzen |
| Export ohne Bestätigung | Export gesperrt |
| Nur Stellenlink ohne Stelleninhalt | Keine Behauptung, die Stellenanforderungen seien geprüft |
| Unbekannte Kontaktinformation | Leeres Feld, niemals fiktive Adresse |
| CV-Zeitraum ohne Beleg | Offene Rückfrage statt erfundener Station |
| Nicht angemeldeter Nutzer | Keine Demo-Identität |
| Unauthentifizierter API-/Server-Action-Zugriff | Vor Launch serverseitig nachweisbar gesperrt |

## Pilot-Messung

Mit freiwilligen Testpersonen beobachten: Zeit bis zur freigegebenen Bewerbung, tatsächlich gefundene Falschbehauptungen, persönliche Glaubwürdigkeit des Schreibstils und konkret überprüfbare Arbeitgeberargumente. Blinde Recruiter-Evaluation nur mit Einwilligung. Niemals eine unbelegte Einstellungs- oder Interviewquote als Erfolg versprechen.
