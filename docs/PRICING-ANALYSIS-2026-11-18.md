# Preisprüfung Motivationsboost

Stand: 18. November 2026. Preisvorschläge sind Hypothesen für einen Test, keine freigegebenen Payrexx-Tarife.

## Vergleichspunkte

| Anbieter | Öffentlich ausgewiesener Preis | Umfang im Vergleich |
| --- | --- | --- |
| Teal+ | USD 13 wöchentlich, USD 29 monatlich, USD 79 pro Quartal, USD 179 jährlich | Lebenslauf, Bewerbungs-Tracking, Keyword-Abgleich, ATS-Feedback und mehrere KI-Funktionen. [Teal-Preise](https://help.tealhq.com/en/articles/9530153-teal-vs-teal) |
| Kickresume Premium | USD 24 monatlich, USD 54 pro Quartal, USD 96 jährlich | Lebenslauf- und Anschreiben-Editoren, Vorlagen, KI-Schreiben, ATS-Prüfung, Career Map und mobile Apps. [Kickresume-Preise](https://www.kickresume.com/en/pricing/) |

Die Anbieterpreise sind USD-Listenpreise und hier nicht in CHF umgerechnet. Beide Angebote umfassen mehr fertige Produktfunktionen als der aktuelle Motivationsboost-Beta-Ablauf.

## Produkt- und Kostenannahmen

- Der neueste testbare Ablauf erstellt einen belegorientierten Motivationsbrief aus Nutzereingaben. Das ist noch kein voll abgenommener Karriere-Copilot mit funktionierender Google-Anmeldung, produktiver Datenbank, ATS-/CV-Workflow oder Zahlung.
- Die App begrenzt den Briefaufruf auf 40'000 Bytes Eingabe und 2'048 Ausgabetoken. Beim vorgeschlagenen Modell GPT-6.1 Terra listet OpenAI USD 1 pro Million Eingabetoken und USD 5 pro Million Ausgabetoken. Eine volle Anfrage von rund 9'000 Eingabe- und 2'048 Ausgabetoken läge grob bei USD 0.019 für den Modellaufruf; 100 solche Maximalanfragen wären etwa USD 1.92 vor Infrastruktur, Zahlungsgebühren, Steuern, Support, Rückerstattungen und fehlgeschlagenen Versuchen. [GPT-6.1 Terra Preise](https://developers.openai.com/api/docs/models/gpt-6.1-terra)
- Dies ist eine Obergrenzen-Näherung für den Textbrief, keine Messung realer Anfragen oder der Kosten aller App-Funktionen. Bild- und Audiofunktionen sind nicht in dieser Rechnung enthalten und bleiben separat zu begrenzen.
- Die bisherige App-Voreinstellung `gpt-5-mini` ist in der aktuellen OpenAI-Modellübersicht als deprecated markiert. Der Code verwendet daher nun die konfigurierbare Umgebungsvariable `OPENAI_MODEL` mit `gpt-6.1-terra` als Standard. Vor echten API-Aufrufen muss der konkrete Modellzugang im Zielkonto verifiziert werden. [Modellstatus GPT-5 mini](https://developers.openai.com/api/docs/models/gpt-5-mini)

## Preisvorschlag nach Reifegrad

**Interner Test:** kostenlos, keine Transaktionen.

**Früher externer Pilot, sobald echter KI-Aufruf, Datenlöschung und Nutzungsbedingungen verifiziert sind:**

- Gratis: ein vollständiger Brief samt zwei Überarbeitungen, damit die Qualität für eine Bewerbung geprüft werden kann.
- Einzelbewerbung: CHF 4.90 einmalig für bis zu fünf Textaktionen rund um eine Stelle. Das passt besser zu einer episodischen Jobsuche als ein sofortiges Jahresabo.
- Monatsabo erst nach vollständigem Mehr-Funktionen-Test: CHF 12.90 für bis zu 50 Textaktionen.
- Jahresabo nach nachgewiesener Nutzung: CHF 99.00 jährlich, mit denselben monatlichen Aktionsgrenzen; vorher monatlich testen.

**Spätere Vollversion:** CHF 14.90–19.90 pro Monat wäre plausibler, wenn CV-Anpassung, ATS-Feedback, Bewerbungsverwaltung, Interviewtraining, mehrsprachige Oberfläche und Datenexport zuverlässig zusammenarbeiten. CHF 119–149 jährlich könnte dann als rabattierte Jahresoption getestet werden.

## Bewertung der bisher geplanten Tarifwerte

Der offene Vorschlag CHF 8.90 pro Woche, CHF 17.90 monatlich und CHF 119 jährlich liegt unter den beiden USD-Monatsankern. Für eine ausgereifte Plattform kann das wettbewerbsfähig sein. Für den aktuellen Brief-Beta-Ablauf wirken 100 Monatsaktionen beziehungsweise 75 Jahresaktionen pro Monat zu gross und die CHF 17.90 monatlich zu früh positioniert. Die Limits sollten an tatsächlich gemessene Nutzung und Supportaufwand angepasst werden; der Aktionsbegriff muss im Produkt klar erklärt sein.

## Entscheidung für einen kontrollierten Markttest

### Nachprüfung der 80-Prozent-Zielmarge vom 25. November 2026

Die aktuellen Vorschläge im Code sind CHF 8.90 für 40 Wochenaktionen, CHF 17.90 für 100 Monatsaktionen und CHF 119.00 für 75 Aktionen pro Monat im Jahresabo. Die Rechnung nimmt volle Ausschöpfung, 1 CHF je USD sowie GPT-6.1 Terra Standard zu USD 1.00 für Eingabe und USD 5.00 für Ausgabe pro Million Token an. Modellkosten sind jeweils gerundet. [Aktuelle Modellpreise](https://developers.openai.com/api/docs/models/gpt-6.1-terra)

| Tarif | 9’000 Eingabe- und 2’048 Ausgabetokens je Aktion | Rest bis zur 80-Prozent-Marge | Stressfall mit 40’000 Eingabe- und 2’048 Ausgabetokens |
| --- | ---: | ---: | ---: |
| Wochenpass | CHF 0.77 | CHF 1.01 | CHF 2.01 Modellkosten, 77.4 % Marge |
| Monat | CHF 1.92 | CHF 1.66 | CHF 5.02 Modellkosten, 71.9 % Marge |
| Jahr | CHF 17.32 | CHF 6.48 | CHF 45.22 Modellkosten, 62.0 % Marge |

Der Stressfall rechnet bewusst mit vielen Tokens. Die Eingabegrenze des Servers ist in Bytes und begründet keine identische Tokenobergrenze. In den Restbetrag fallen Payrexx-Gebühren, Steuern, Infrastruktur, Support und Rückerstattungen. Für reale Poweruser fehlt die gemessene Tokenverteilung. Vor Verkaufsfreigabe braucht es belastbare Verbrauchs- und Gebührenwerte. Die Tarifwerte bleiben Vorschläge.

Zuerst sollte ein kostenloser Test mit synthetischen und danach ausdrücklich freigegebenen Pilotdaten messen: abgeschlossene Briefe, manuelle Überarbeitungen, Wiederholungsnutzung, Zeitersparnis, Ausfälle, Supportfälle und Zahlungsbereitschaft. Anschliessend CHF 4.90 pro Bewerbungs-Paket und CHF 12.90 monatlich gegeneinander testen. Keine Payrexx-Live-Preise veröffentlichen oder Zahlungen einschalten, bevor Tarif, Verlängerung, Kündigung, Rückerstattung und Gebühren bestätigt und Ende zu Ende geprüft sind.
