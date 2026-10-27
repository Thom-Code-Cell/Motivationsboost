"use client";

import { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import type { GenerateCvFromDocumentsOutput, Language } from '@/ai/schemas';
import type { TargetCountry } from '@/lib/country-application-guides';
import { countryApplicationGuides, isTargetCountry, supportedTargetCountries } from '@/lib/country-application-guides';
import { extractCandidateClaims, getReviewStatistics, makeCandidatePortfolio } from '@/lib/candidate-evidence';
import { saveFileToDrive } from '@/services/drive';
import { updateUser } from '@/services/user';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

interface Props {
  user: User;
  cvData: GenerateCvFromDocumentsOutput | null;
  language: Language;
  targetCountry?: string;
  accessToken: string | null;
  onNavigate: (view: 'cv-generator' | 'uploads') => void;
}

/**
 * Candidate-controlled review. This is not independent document verification.
 * Only explicitly approved claims are exported to the applicant's private Drive.
 */
export function CareerPortfolio({ user, cvData, language, targetCountry, accessToken, onNavigate }: Props) {
  const { toast } = useToast();
  const [country, setCountry] = useState<TargetCountry>(
    targetCountry && isTargetCountry(targetCountry) ? targetCountry : 'CH'
  );
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [savingCountry, setSavingCountry] = useState(false);
  const derived = useMemo(() => cvData ? extractCandidateClaims(cvData) : [], [cvData]);
  const claims = useMemo(() => derived.map(item => ({
    ...item, checkedByApplicant: reviewedIds.has(item.id)
  })), [derived, reviewedIds]);
  const stats = getReviewStatistics(claims);
  const guide = countryApplicationGuides[country];

  useEffect(() => { setReviewedIds(new Set()); }, [cvData]);
  useEffect(() => {
    if (targetCountry && isTargetCountry(targetCountry)) setCountry(targetCountry);
  }, [targetCountry]);

  async function changeCountry(value: string) {
    if (!isTargetCountry(value)) return;
    setSavingCountry(true);
    try {
      await updateUser(user.uid, { targetCountry: value });
      setCountry(value);
    } catch {
      toast({ title: 'Zielland konnte nicht gespeichert werden.', variant: 'destructive' });
    } finally {
      setSavingCountry(false);
    }
  }

  async function saveApproved() {
    if (!accessToken || saving || stats.reviewed === 0) return;
    setSaving(true);
    try {
      const payload = makeCandidatePortfolio(claims, country, language);
      await saveFileToDrive(accessToken, 'reviewed_career_portfolio.json', JSON.stringify(payload, null, 2), 'application/json');
      toast({ title: 'Bestätigte Angaben gespeichert', description: 'Ausschliesslich die von dir geprüften Einträge wurden im privaten App-Ordner abgelegt.' });
    } catch {
      toast({ title: 'Speichern fehlgeschlagen', description: 'Bitte Google Drive erneut verbinden.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  }

  return <div className="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Mein Kompetenzpass</CardTitle>
        <CardDescription>
          Prüfe deine Berufserfahrung, Ausbildung und Fähigkeiten einzeln. Diese Liste stammt aus dem generierten
          Lebenslauf, nicht aus einer unabhängigen Belegprüfung. Nur du bestätigst, was stimmt.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!cvData ? (
          <div className="space-y-3">
            <p>Erstelle zuerst einen Lebenslauf aus deinen Unterlagen. Danach kannst du die einzelnen Aussagen kontrollieren.</p>
            <Button onClick={() => onNavigate('uploads')} variant="outline">Dokumente hochladen</Button>{' '}
            <Button onClick={() => onNavigate('cv-generator')}>Zum CV-Generator</Button>
          </div>
        ) : <>
          <p aria-live="polite" className="text-sm font-medium">{stats.reviewed} von {stats.total} Aussagen von dir bestätigt</p>
          <div className="max-h-[32rem] space-y-3 overflow-y-auto pr-2">
            {claims.map(item => <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-lg border p-3">
              <input
                type="checkbox" className="mt-1 size-5"
                checked={item.checkedByApplicant}
                onChange={event => setReviewedIds(previous => {
                  const next = new Set(previous);
                  if (event.target.checked) next.add(item.id);
                  else next.delete(item.id);
                  return next;
                })}
              />
              <span className="min-w-0">
                <strong className="block break-words">{item.title}</strong>
                {item.detail && <span className="mt-1 block whitespace-pre-wrap break-words text-sm">{item.detail}</span>}
                <small className="mt-1 block text-muted-foreground">{item.origin} · Noch nicht unabhängig verifiziert</small>
              </span>
            </label>)}
          </div>
          <Button disabled={!accessToken || saving || stats.reviewed === 0} onClick={saveApproved}>
            {saving ? 'Speichert...' : 'Nur meine bestätigten Angaben speichern'}
          </Button>
          {!accessToken && <p className="text-sm text-muted-foreground">Zum Speichern bitte Google Drive verbinden. Ohne deine Bestätigung wird nichts übertragen.</p>}
        </>}
      </CardContent>
    </Card>
    <Card>
      <CardHeader><CardTitle>Mein Bewerbungsland</CardTitle>
        <CardDescription>Unabhängig von deiner bevorzugten Sprache. Die Empfehlungen sind allgemeine Orientierung und werden für jede konkrete Stelle überprüft.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block space-y-2">
          <span className="text-sm font-medium">Zielland auswählen</span>
          <select
            className="w-full rounded-md border bg-background p-3"
            value={country}
            disabled={savingCountry}
            onChange={e => void changeCountry(e.target.value)}
          >
            {supportedTargetCountries.map(code => <option key={code} value={code}>{countryApplicationGuides[code].name}</option>)}
          </select>
        </label>
        <p><strong>Lebenslauf:</strong> {guide.cv}</p>
        <p><strong>Foto:</strong> {guide.photo}</p>
        <p><strong>Datenschutz:</strong> {guide.avoid}</p>
        <p className="text-sm font-medium">Checkliste für die nächste Bewerbung</p>
        <ul className="list-disc space-y-1 pl-6">
          {guide.checklist.map(item => <li key={item}>{item}</li>)}
        </ul>
      </CardContent>
    </Card>
  </div>;
}
