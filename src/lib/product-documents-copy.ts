import type { ProductLocale } from './product-locale';

const de = {
  title: 'Unterlagen auf diesem Gerät',
  storage: 'Die Dateien werden hier abgelegt. Motivationsboost lädt sie nicht hoch. Sichere wichtige Unterlagen zusätzlich an einem privaten Ort.',
  category: 'Kategorie', add: 'Datei lokal hinzufügen', camera: 'Unterlage fotografieren',
  capture: 'Fotografiere die Seiten einzeln oder füge mehrere Dateien zur gewählten Kategorie hinzu. Fotos bleiben als Originaldateien gespeichert.',
  readError: 'Die lokalen Unterlagen konnten nicht gelesen werden.',
  saveError: 'Die lokale Ablage konnte nicht gespeichert werden.',
  full: 'Die lokale Ablage ist voll. Sichere und entferne zuerst ältere Dateien.',
  invalid: 'Wähle PDF-, DOCX-, TXT-, JPG-, PNG-, WebP- oder HEIC/HEIF-Dateien bis 20 MB pro Datei.',
  close: 'Texterkennung schliessen', open: 'Texterkennung öffnen', download: 'Datei sichern', remove: 'Datei entfernen',
  clear: 'Lokale Unterlagen löschen', confirmRemove: 'Diese Datei aus der lokalen Ablage entfernen?',
  confirmClear: 'Alle Unterlagen aus der lokalen Ablage entfernen?',
  categories: ['Lebenslauf', 'Arbeitszeugnis', 'Diplom oder Zertifikat', 'Bewerbungsfoto', 'Sonstige Bewerbungsunterlage'],
};

type Copy = { [Key in keyof typeof de]: typeof de[Key] };
export const documentsCopy: Record<ProductLocale, Copy> = {
  de,
  en: {
    title: 'Documents on this device',
    storage: 'Files are saved here on your device. Motivationsboost does not upload them. Keep a separate private backup of important files.',
    category: 'Category', add: 'Add local files', camera: 'Photograph a document',
    capture: 'Photograph each page separately or add several files to the selected category. Your original photos are kept.',
    readError: 'Local documents could not be read.', saveError: 'Local documents could not be saved.',
    full: 'Local storage is full. Back up and remove older files first.',
    invalid: 'Choose PDF, DOCX, TXT, JPG, PNG, WebP or HEIC/HEIF files up to 20 MB each.',
    close: 'Close text recognition', open: 'Open text recognition', download: 'Save file', remove: 'Remove file',
    clear: 'Delete local documents', confirmRemove: 'Remove this file from local storage?', confirmClear: 'Remove all documents from local storage?',
    categories: ['CV', 'Employment reference', 'Diploma or certificate', 'Application photo', 'Other application document'],
  },
  fr: {
    title: 'Documents sur cet appareil',
    storage: 'Les fichiers sont enregistrés sur cet appareil. Motivationsboost ne les téléverse pas. Conservez une copie de vos fichiers importants dans un espace privé.',
    category: 'Catégorie', add: 'Ajouter des fichiers locaux', camera: 'Photographier un document',
    capture: 'Photographiez chaque page séparément ou ajoutez plusieurs fichiers à la catégorie choisie. Les photos originales sont conservées.',
    readError: 'Impossible de lire les documents locaux.', saveError: 'Impossible d’enregistrer les documents locaux.',
    full: 'Le stockage local est plein. Sauvegardez puis retirez d’anciens fichiers.',
    invalid: 'Choisissez des fichiers PDF, DOCX, TXT, JPG, PNG, WebP ou HEIC/HEIF de 20 Mo au maximum chacun.',
    close: 'Fermer la reconnaissance de texte', open: 'Ouvrir la reconnaissance de texte', download: 'Enregistrer le fichier', remove: 'Retirer le fichier',
    clear: 'Supprimer les documents locaux', confirmRemove: 'Retirer ce fichier du stockage local ?', confirmClear: 'Retirer tous les documents du stockage local ?',
    categories: ['CV', 'Certificat de travail', 'Diplôme ou certificat', 'Photo de candidature', 'Autre document de candidature'],
  },
  it: {
    title: 'Documenti su questo dispositivo',
    storage: 'I file sono salvati su questo dispositivo. Motivationsboost non li carica online. Conserva una copia privata dei file importanti.',
    category: 'Categoria', add: 'Aggiungi file locali', camera: 'Fotografa un documento',
    capture: 'Fotografa ogni pagina separatamente o aggiungi più file alla categoria scelta. Le foto originali vengono conservate.',
    readError: 'Impossibile leggere i documenti locali.', saveError: 'Impossibile salvare i documenti locali.',
    full: 'Lo spazio locale è esaurito. Salva e rimuovi prima i file meno recenti.',
    invalid: 'Scegli file PDF, DOCX, TXT, JPG, PNG, WebP o HEIC/HEIF di massimo 20 MB ciascuno.',
    close: 'Chiudi il riconoscimento del testo', open: 'Apri il riconoscimento del testo', download: 'Salva il file', remove: 'Rimuovi il file',
    clear: 'Elimina i documenti locali', confirmRemove: 'Rimuovere questo file dall’archivio locale?', confirmClear: 'Rimuovere tutti i documenti dall’archivio locale?',
    categories: ['CV', 'Attestato di lavoro', 'Diploma o certificato', 'Foto per la candidatura', 'Altro documento di candidatura'],
  },
};
