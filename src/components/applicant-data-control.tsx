"use client";

import type { ApplicantDataExportInput } from '@/lib/applicant-data-export';
import { makeApplicantDataExport } from '@/lib/applicant-data-export';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function ApplicantDataControl({ data }: { data: ApplicantDataExportInput }) {
  function handleExport() {
    const contents = JSON.stringify(makeApplicantDataExport(data), null, 2);
    const url = URL.createObjectURL(new Blob([contents], { type: 'application/json;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'my-career-data.json';
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
  return <Card className="max-w-3xl">
    <CardHeader>
      <CardTitle>Meine Daten und Bewerbungen</CardTitle>
      <CardDescription>Du entscheidest, welche Informationen du mitnimmst. Der Export geschieht direkt in deinem Browser und löst keine KI-Anfrage aus.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-5">
      <p>Die Exportdatei enthält die in der Anwendung aktuell geladenen Profildaten, Einstellungen, Bewerbungen, deinen Lebenslauf und bereits freigegebene Texte. Sie enthält keine privaten Google-Drive-Dateien, die du nicht ausdrücklich in die App geladen hast.</p>
      <p className="rounded-md border p-3 text-sm">Datenschutzhinweis: Die heruntergeladene JSON-Datei kann persönliche Informationen enthalten. Teile sie nicht öffentlich und bewahre sie sicher auf.</p>
      <Button onClick={handleExport}>Meine App-Daten als JSON herunterladen</Button>
      <div className="border-t pt-4">
        <h3 className="font-semibold">Löschung und Berichtigung</h3>
        <p className="mt-2 text-sm">Die automatische vollständige Kontolöschung ist noch nicht freigegeben. Eine Löschungs- oder Auskunftsanfrage kannst du an die im Datenschutztext angegebene Kontaktadresse richten. Dokumente in deinem eigenen Google Drive verwaltest du zusätzlich dort.</p>
        <a className="mt-2 inline-block text-sm underline" href="/datenschutz">Datenschutzhinweise ansehen</a>
      </div>
    </CardContent>
  </Card>;
}
