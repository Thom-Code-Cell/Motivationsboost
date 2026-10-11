'use client';
import { useState } from 'react';
import Script from 'next/script';
import type { User } from 'firebase/auth';
import { uploadDocument, importDriveFile } from '@/services/drive';
import { Button } from './ui/button';
import { Input } from './ui/core-input';
import { Label } from './ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { useToast } from '@/hooks/use-toast';

interface Props { user: User | null; accessToken: string | null; handleSignIn: () => void; }
export function DocumentUploads({ user, accessToken, handleSignIn }: Props) {
  const [busy, setBusy] = useState(false);
  const [pickerReady, setPickerReady] = useState(false);
  const [files, setFiles] = useState<{ id: string; name: string }[]>([]);
  const { toast } = useToast();
  const report = (error: unknown) => toast({ title: 'Import fehlgeschlagen', description: error instanceof Error ? error.message : 'Bitte erneut versuchen.', variant: 'destructive' });
  async function upload(selected: FileList | null) {
    if (!selected || !accessToken) return;
    setBusy(true);
    try {
      for (const file of Array.from(selected)) {
        const data = new FormData(); data.set('file', file);
        const result = await uploadDocument(accessToken, data);
        setFiles(prev => [...prev, result]);
      }
      toast({ title: 'Dokumente in Drive gespeichert', description: 'Sie können sie jetzt im CV-Generator auswählen.' });
    } catch (error) { report(error); } finally { setBusy(false); }
  }
  function openPicker() {
    const google = (window as any).google;
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    if (!google?.picker || !apiKey || !accessToken) return;
    const view = new google.picker.DocsView().setIncludeFolders(true).setMimeTypes('application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.google-apps.document,image/jpeg,image/png,text/plain');
    let builder = new google.picker.PickerBuilder().addView(view).setOAuthToken(accessToken).setDeveloperKey(apiKey).enableFeature(google.picker.Feature.MULTISELECT_ENABLED).setCallback(async (data: any) => {
      if (data.action !== google.picker.Action.PICKED) return;
      setBusy(true);
      try {
        for (const doc of data.docs) {
          const result = await importDriveFile(accessToken, doc.id);
          setFiles(prev => [...prev, result]);
        }
        toast({ title: 'Drive-Dateien importiert', description: 'Im CV-Generator sind die Kopien verfügbar.' });
      } catch (error) { report(error); } finally { setBusy(false); }
    });
    if (process.env.NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER) builder = builder.setAppId(process.env.NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER);
    builder.build().setVisible(true);
  }
  return <Card className="w-full min-w-0">
    <Script src="https://apis.google.com/js/api.js" onLoad={() => (window as any).gapi.load('picker', () => setPickerReady(true))} />
    <CardHeader><CardTitle>Dokumente und Arbeitszeugnisse</CardTitle><CardDescription>PDF, Word (DOCX), TXT und Fotos, maximal 8 MB pro Datei. Speicherung in Ihrem Google Drive.</CardDescription></CardHeader>
    <CardContent className="space-y-6">
      {!user || !accessToken ? <Button onClick={handleSignIn}>Google Drive verbinden</Button> : <>
        <div className="space-y-2"><Label htmlFor="documents">Dateien auswählen</Label><Input id="documents" type="file" multiple accept=".pdf,.docx,.txt,.jpg,.jpeg,.png" disabled={busy} onChange={e => { void upload(e.target.files); e.target.value = ''; }} /></div>
        <div className="space-y-2"><Label htmlFor="camera-document">Zeugnis fotografieren</Label><Input id="camera-document" type="file" accept="image/jpeg,image/png" capture="environment" disabled={busy} onChange={e => { void upload(e.target.files); e.target.value = ''; }} /></div>
        <Button variant="outline" disabled={busy || !pickerReady} onClick={openPicker}>Aus Google Drive importieren</Button>
        {busy && <p role="status">Dokumente werden gespeichert…</p>}
      </>}
      <p className="text-sm text-muted-foreground">Die KI liest Ihre Dokumente für die Lebenslauferstellung. Prüfen Sie das Ergebnis vor jeder Bewerbung. Originale bleiben erhalten.</p>
      {files.length > 0 && <ul className="space-y-2">{files.map(file => <li key={file.id} className="break-all">{file.name}</li>)}</ul>}
    </CardContent>
  </Card>;
}
