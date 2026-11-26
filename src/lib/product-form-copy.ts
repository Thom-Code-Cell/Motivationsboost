import type { ProductLocale } from './product-locale';

const de = {
  reset: {
    heading: 'Neues Passwort festlegen', invalid: 'Der Link fehlt oder ist ungültig. Fordere über die Anmeldung einen neuen Link an.',
    intro: 'Verwende mindestens 12 Zeichen. Nach dem Speichern kannst du dich neu anmelden.',
    expired: 'Der Link ist ungültig oder abgelaufen. Fordere einen neuen Link an.',
    saved: 'Passwort geändert. Du kannst dich jetzt anmelden.', failed: 'Das Passwort konnte nicht geändert werden.',
    password: 'Neues Passwort', saving: 'Wird gespeichert …', save: 'Passwort speichern', signIn: 'Zur Anmeldung', loading: 'Wird geladen …',
  },
  job: {
    label: 'Link zum Stelleninserat', intro: 'Du kannst den Text auch unten direkt einfügen. Für den Import ruft Motivationsboost die öffentliche Inseratseite auf.',
    busy: 'Inserat wird geladen …', replace: 'Vorhandenen Anzeigentext durch Linkimport ersetzen', import: 'Stelleninserat per Link übernehmen',
    done: 'Anzeigentext übernommen. Prüfe, ob die Stelle und die Anforderungen stimmen.',
    origin: 'Der Import ist von dieser Seite aus nicht verfügbar.', login: 'Bitte melde dich erneut an.',
    tooLong: 'Der Stellenlink ist zu lang.', invalid: 'Gib die vollständige HTTPS-Adresse der Stellenanzeige ein.',
    limited: 'Bitte warte kurz, bevor du einen weiteren Stellenlink importierst.',
    unreadable: 'Die Anzeige konnte nicht übernommen werden. Füge den Text direkt ein, falls die Seite gesperrt ist oder ein Login verlangt.',
    unavailable: 'Der Import ist derzeit nicht verfügbar. Du kannst den Anzeigentext direkt einfügen.',
  },
} as const;

type FormCopy = { [Section in keyof typeof de]: { [Key in keyof (typeof de)[Section]]: string } };
export const productFormCopy: Record<ProductLocale, FormCopy> = {
  de,
  en: {
    reset: {
      heading: 'Choose a new password', invalid: 'The link is missing or invalid. Request a new link on the sign-in page.',
      intro: 'Use at least 12 characters. You can sign in again after saving your password.',
      expired: 'The link is invalid or has expired. Request a new link.',
      saved: 'Password changed. You can sign in now.', failed: 'Your password could not be changed.',
      password: 'New password', saving: 'Saving …', save: 'Save password', signIn: 'Back to sign-in', loading: 'Loading …',
    },
    job: {
      label: 'Job posting link', intro: 'You can also paste the text below. To import a link, Motivationsboost opens the public posting page.',
      busy: 'Loading the posting …', replace: 'Replace the current text with the linked posting', import: 'Import job posting from link',
      done: 'Posting imported. Check that the role and requirements are correct.',
      origin: 'Import is unavailable from this page.', login: 'Please sign in again.',
      tooLong: 'The job posting link is too long.', invalid: 'Enter the full HTTPS address of the job posting.',
      limited: 'Wait a moment before importing another job posting.',
      unreadable: 'The posting could not be imported. Paste the text if the page is blocked or requires sign-in.',
      unavailable: 'Import is currently unavailable. You can paste the posting text instead.',
    },
  },
  fr: {
    reset: {
      heading: 'Choisir un nouveau mot de passe', invalid: 'Le lien est manquant ou invalide. Demandez un nouveau lien sur la page de connexion.',
      intro: 'Utilisez au moins 12 caractères. Vous pourrez vous reconnecter après l’enregistrement.',
      expired: 'Le lien est invalide ou a expiré. Demandez un nouveau lien.',
      saved: 'Le mot de passe a été modifié. Vous pouvez maintenant vous connecter.', failed: 'Le mot de passe n’a pas pu être modifié.',
      password: 'Nouveau mot de passe', saving: 'Enregistrement…', save: 'Enregistrer le mot de passe', signIn: 'Retour à la connexion', loading: 'Chargement…',
    },
    job: {
      label: 'Lien vers l’offre d’emploi', intro: 'Vous pouvez aussi coller le texte ci-dessous. Pour importer un lien, Motivationsboost ouvre la page publique de l’offre.',
      busy: 'Chargement de l’offre…', replace: 'Remplacer le texte actuel par l’offre liée', import: 'Importer l’offre depuis un lien',
      done: 'Offre importée. Vérifiez le poste et les exigences.',
      origin: 'L’importation est indisponible depuis cette page.', login: 'Veuillez vous reconnecter.',
      tooLong: 'Le lien de l’offre est trop long.', invalid: 'Saisissez l’adresse HTTPS complète de l’offre.',
      limited: 'Patientez un instant avant d’importer une autre offre.',
      unreadable: 'L’offre n’a pas pu être importée. Collez son texte si la page est bloquée ou exige une connexion.',
      unavailable: 'L’importation est momentanément indisponible. Vous pouvez coller le texte de l’offre.',
    },
  },
  it: {
    reset: {
      heading: 'Imposta una nuova password', invalid: 'Il link manca o non è valido. Richiedine uno nuovo dalla pagina di accesso.',
      intro: 'Usa almeno 12 caratteri. Dopo il salvataggio puoi accedere di nuovo.',
      expired: 'Il link non è valido o è scaduto. Richiedi un nuovo link.',
      saved: 'Password modificata. Ora puoi accedere.', failed: 'Non è stato possibile modificare la password.',
      password: 'Nuova password', saving: 'Salvataggio…', save: 'Salva password', signIn: 'Torna all’accesso', loading: 'Caricamento…',
    },
    job: {
      label: 'Link all’annuncio di lavoro', intro: 'Puoi anche incollare il testo qui sotto. Per importare un link, Motivationsboost apre la pagina pubblica dell’annuncio.',
      busy: 'Caricamento dell’annuncio…', replace: 'Sostituisci il testo attuale con l’annuncio collegato', import: 'Importa l’annuncio da un link',
      done: 'Annuncio importato. Verifica la posizione e i requisiti.',
      origin: 'L’importazione non è disponibile da questa pagina.', login: 'Accedi di nuovo.',
      tooLong: 'Il link all’annuncio è troppo lungo.', invalid: 'Inserisci l’indirizzo HTTPS completo dell’annuncio.',
      limited: 'Attendi un momento prima di importare un altro annuncio.',
      unreadable: 'Non è stato possibile importare l’annuncio. Incolla il testo se la pagina è bloccata o richiede l’accesso.',
      unavailable: 'L’importazione non è disponibile al momento. Puoi incollare direttamente il testo dell’annuncio.',
    },
  },
};
