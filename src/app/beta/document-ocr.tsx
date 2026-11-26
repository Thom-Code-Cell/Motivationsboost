'use client';

import { useState } from 'react';
import { useProductLanguage } from '@/components/product-language';
import { maximumRecognizedTextLength, ocrLanguages, OcrPageLimit, recognizeDocumentText, type OcrLanguage } from '@/lib/local-ocr';
import type { LocalDocument } from '@/lib/local-vault';

const documentLanguage = { de: 'deu', en: 'eng', fr: 'fra', it: 'ita' } as const;
const copy = {
  de: ['Sprache der Unterlage', 'Text erkennen', 'Texterkennung läuft', 'Erkannter Text', 'Text speichern', 'Als Beleg in den Entwurf übernehmen', 'Der Text wurde gespeichert.', 'Es wurde kein Text erkannt.', 'Die Texterkennung ist fehlgeschlagen. Verwende eine scharfe Aufnahme als JPG oder PNG oder ein lesbares PDF.', 'Prüfe Namen, Daten und Zahlen vor der Übernahme. Die Erkennung läuft auf diesem Gerät.'],
  en: ['Document language', 'Recognise text', 'Recognising text', 'Recognised text', 'Save text', 'Add evidence to the draft', 'Text saved.', 'No text was recognised.', 'Text recognition failed. Use a clear JPG or PNG photograph or a readable PDF.', 'Check names, dates and numbers before using the text. Recognition runs on this device.'],
  fr: ['Langue du document', 'Reconnaître le texte', 'Reconnaissance en cours', 'Texte reconnu', 'Enregistrer le texte', 'Ajouter au brouillon comme preuve', 'Texte enregistré.', 'Aucun texte reconnu.', 'La reconnaissance a échoué. Utilisez une photo JPG ou PNG nette ou un PDF lisible.', 'Vérifiez les noms, les dates et les chiffres. La reconnaissance se fait sur cet appareil.'],
  it: ['Lingua del documento', 'Riconosci il testo', 'Riconoscimento in corso', 'Testo riconosciuto', 'Salva il testo', 'Aggiungi alla bozza come prova', 'Testo salvato.', 'Nessun testo riconosciuto.', 'Riconoscimento non riuscito. Utilizza una foto nitida in formato JPG o PNG o un PDF leggibile.', 'Controlla nomi, date e numeri. Il riconoscimento avviene su questo dispositivo.'],
} as const;

const pageLimitCopy = {
  de: 'Teile PDFs mit mehr als zehn Seiten vor der Texterkennung auf.',
  en: 'Split PDFs with more than ten pages before recognising text.',
  fr: 'Divisez les PDF de plus de dix pages avant la reconnaissance.',
  it: 'Dividi i PDF di oltre dieci pagine prima del riconoscimento.',
};

export function DocumentOcr({ document, onSave, onUse }: {
  document: LocalDocument;
  onSave: (text: string) => Promise<boolean>;
  onUse: (text: string) => void;
}) {
  const locale = useProductLanguage();
  const words = copy[locale];
  const [language, setLanguage] = useState<OcrLanguage>();
  const [text, setText] = useState(document.extractedText ?? '');
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [manualReview, setManualReview] = useState(Boolean(document.extractedText));

  async function run() {
    setBusy(true);
    setMessage('');
    setProgress(0);
    try {
      const result = await recognizeDocumentText(document.file, document.name, language ?? documentLanguage[locale], setProgress);
      if (result) {
        setText(result);
        setManualReview(true);
      } else setMessage(words[7]);
    } catch (error) {
      setMessage(error instanceof OcrPageLimit ? pageLimitCopy[locale] : words[8]);
    } finally {
      setBusy(false);
    }
  }

  return <div className="mt-2 space-y-2" lang={locale}>
    <div className="flex flex-wrap items-center gap-2">
      <label>{words[0]} <select value={language ?? documentLanguage[locale]} disabled={busy} onChange={event => setLanguage(event.target.value as OcrLanguage)} className="rounded border p-1">
        {ocrLanguages.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select></label>
      <button type="button" className="underline" disabled={busy} onClick={() => void run()}>{words[1]}</button>
    </div>
    {busy && <p role="status">{words[2]} · {Math.round(progress * 100)} %</p>}
    {message && <p role="status">{message}</p>}
    {manualReview && <>
      <p className="text-sm">{words[9]}</p>
      <label>{words[3]}<textarea className="block w-full rounded border p-2" rows={7} maxLength={maximumRecognizedTextLength} value={text} onChange={event => setText(event.target.value)} /></label>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="underline" disabled={busy} onClick={async () => {
          if (await onSave(text)) setMessage(words[6]);
        }}>{words[4]}</button>
        <button type="button" className="underline" disabled={!text.trim() || busy} onClick={() => onUse(text)}>{words[5]}</button>
      </div>
    </>}
  </div>;
}
