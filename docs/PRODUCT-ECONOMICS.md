# Produktwirtschaftlichkeit · Variante C

Die Abfragen verwenden ausschliesslich freigegebene CHF-Verkäufe und tatsächlich gebuchte Kosten. Testzahlungen und das unveränderte CHF-10-Konto bleiben getrennt. Das Portfolioziel beträgt 80 % operative Produktmarge. Meldungen einzelner Tarife unterstützen die Analyse.

## Buchung und Frühwarnungen

1. Übertrage die effektiven Payrexx-Nettoerlöse ohne MWST, Erstattungen, Rückbuchungen, Anbieter- und Auszahlungsgebühren je Tarif. Nutze Abrechnungsbelege und erkenne Jahreserlöse über die bezahlte Leistungsperiode. Erfasse keine Testtransaktion.
2. Ergänze die tatsächlichen Akquisitions-, Support- und direkt zurechenbaren Betriebskosten, einschliesslich C zurechenbarer Betreiberzeit. Zähle jede erstmals zahlende Person genau einmal dem Einstiegsangebot zu. Weise FREE-Kosten separat und gemeinsam getragene Fixkosten über belegbare Projektanteile zu. Nutze den Tarif `portfolio` für eindeutig produktbezogene Kosten ohne Tarifzuordnung. Die Portfoliozeile summiert diese Buchungen und die Tarifzeilen einmalig.
3. Importiere eine JSON-Liste mit `node scripts/import-product-economics.mjs <datei>` über `MOTIVATIONS_ECONOMICS_DATABASE_URL`. Ein Eintrag enthält `sourceKey`, `month` im Format YYYY-MM-01, `plan`, `category` und `amountMicros`. CHF 1 entspricht einer Million Micros. `new_paying_customers` verwendet `amountMicros: 0` und ganzzahlige `units`. Verwende neutrale, unveränderliche Belegschlüssel. Identische Importe ändern die Summe nicht. Geänderte Inhalte mit derselben Referenz werden abgewiesen.
4. Gleiche OpenAI-Verbrauch mit der Anbieterabrechnung sowie die übrigen Kategorien mit Zahlungs- und Betriebsbelegen ab. Erst nach vollständiger Prüfung trägt der Betreiber den Monat in `product_economic_closes` ein. Die laufende Auswertung zeigt fehlende Daten und offene KI-Reservierungen ausdrücklich.
5. `scripts/product-economics.sql` liefert die aggregierten Ergebnisse des laufenden und des vorherigen Monats. Prüfe Portfolioabweichungen unter 80 %, CHF 1 Akquisitionskosten je neu zahlender Person als Annahme des schlanken Starts, offene KI-Reservierungen sowie fehlende Belege nach Verkaufsbeginn. Die Marge vor gemeinsamem Fixkostenanteil und das Ergebnis nach Umlage werden separat ausgewiesen.

## Kostenkontrolle der Anwendung

Eine ausdrücklich bestätigte Belegauswahl kostet drei Credits. Das System reserviert Guthaben und Kosten in derselben Transaktion. Jahreskontingente werden vom Beginn der bezahlten Laufzeit aus in höchstens zwölf Monatsperioden eingeteilt. Credits einer aktiven Laufzeit werden vor Zusatzcredits abgebucht. Ein endgültig unberechneter Versuch stellt die Credits wieder her. Bei unklarem Provider-Ergebnis bleibt die Reserve bis zur Zuordnung bestehen.

Der kommerzielle Verbrauch wird vom CHF-10-Testkonto getrennt geführt. Eine zusätzliche monatliche Betriebsgrenze kann mit `MOTIVATIONS_PRODUCT_AI_MONTHLY_LIMIT_MICROS` gesetzt werden. Auch ohne diese Einstellung bleiben die bezahlten Credits und der Preis je Aktion verbindliche Grenzen. Produktion benötigt die separate Produkt- und KI-Freigabe. FREE führt weiterhin lokale Funktionen aus. Bild, Audio und eine kostenlose Anbieter-Kennenlernfunktion setzen ihre jeweilige separate Abnahme voraus.

Abos, Zusatzpakete und Rückbuchungen benötigen vor dem Start einen bestätigten Providerpfad. Die App prüft die bestätigten Zahlungsnachweise für Credits. Das Anlegen solcher Nachweise bleibt dem Anbieterabgleich vorbehalten.

## Optionale Kennenlernfunktion

Eine unveränderliche Demo mit synthetischem Beispiel und vorbereitetem Ergebnis kann die Belegauswahl ohne Provideraufruf zeigen. Eine personalisierte Demo käme erst mit einer getrennten, vor jedem Anbieteraufruf atomar reservierten Testgrenze und einer nachweisbaren Begrenzung pro bestätigtem Konto infrage. Mehrfachregistrierung erfordert zusätzlich eine Anfragedrosselung und ein Gesamtlimit. Bei der heutigen Obergrenze von CHF 0.03 kostet beispielsweise jeder Pool von 100 Einzelversuchen höchstens CHF 3 in Anbieterreservierungen. Support, Missbrauchsbearbeitung und kostenlose Nutzerinfrastruktur kommen hinzu. Anbieter und Budgettopf bleiben bis zur Zustimmung gesperrt.
