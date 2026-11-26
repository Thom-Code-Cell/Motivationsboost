import { isProductLocale, preferredProductLocale, productLanguageHeader } from './product-locale';

const accountEmailCopy = {
  de: {
    verification: ['E-Mail-Adresse für Motivationsboost bestätigen', 'Bitte bestätige deine E-Mail-Adresse über diesen Link.', 'Falls du kein Konto erstellt hast, ignoriere diese Nachricht.'],
    reset: ['Passwort für Motivationsboost zurücksetzen', 'Über diesen Link kannst du dein Passwort zurücksetzen. Der Link ist nur kurz gültig.', 'Falls du die Anfrage nicht gestellt hast, ignoriere diese Nachricht.'],
    deletion: ['Kontolöschung bei Motivationsboost bestätigen', 'Bestätige die dauerhafte Löschung deines Kontos über diesen Link. Er ist eine Stunde gültig.', 'Falls du die Löschung nicht angefordert hast, ignoriere diese Nachricht.'],
  },
  en: {
    verification: ['Confirm your Motivationsboost email address', 'Use this link to confirm your email address.', 'If you did not create an account, ignore this message.'],
    reset: ['Reset your Motivationsboost password', 'Use this link to reset your password. The link expires shortly.', 'If you did not request a new password, ignore this message.'],
    deletion: ['Confirm deletion of your Motivationsboost account', 'Use this link to permanently delete your account. It is valid for one hour.', 'If you did not request deletion, ignore this message.'],
  },
  fr: {
    verification: ['Confirmez votre adresse e-mail pour Motivationsboost', 'Utilisez ce lien pour confirmer votre adresse e-mail.', 'Si vous n’avez pas créé de compte, ignorez ce message.'],
    reset: ['Réinitialisez votre mot de passe Motivationsboost', 'Utilisez ce lien pour réinitialiser votre mot de passe. Le lien expire rapidement.', 'Si vous n’avez pas demandé de nouveau mot de passe, ignorez ce message.'],
    deletion: ['Confirmez la suppression de votre compte Motivationsboost', 'Utilisez ce lien pour supprimer définitivement votre compte. Il est valable une heure.', 'Si vous n’avez pas demandé la suppression du compte, ignorez ce message.'],
  },
  it: {
    verification: ['Conferma il tuo indirizzo e-mail per Motivationsboost', 'Usa questo link per confermare il tuo indirizzo e-mail.', 'Se non hai creato un account, ignora questo messaggio.'],
    reset: ['Reimposta la tua password di Motivationsboost', 'Usa questo link per reimpostare la tua password. Il link scade a breve.', 'Se non hai richiesto una nuova password, ignora questo messaggio.'],
    deletion: ['Conferma l’eliminazione del tuo account Motivationsboost', 'Usa questo link per eliminare definitivamente il tuo account. È valido per un’ora.', 'Se non hai richiesto l’eliminazione, ignora questo messaggio.'],
  },
} as const;

type AccountEmailKind = keyof typeof accountEmailCopy.de;

export function accountEmail(kind: AccountEmailKind, to: string, url: string, request?: Request) {
  const chosen = request?.headers.get(productLanguageHeader) ?? '';
  const browserLanguages = (request?.headers.get('accept-language') ?? '').split(',')
    .map(range => {
      const [language, weight] = range.split(';', 2);
      return { language, weight: weight ? Number(weight.trim().slice(2)) : 1 };
    })
    .filter(range => range.weight > 0 && range.weight <= 1)
    .sort((a, b) => b.weight - a.weight);
  const locale = isProductLocale(chosen) ? chosen : preferredProductLocale(browserLanguages.map(range => range.language));
  const [subject, intro, closing] = accountEmailCopy[locale][kind];
  return { to, subject, text: [intro, url, closing].join('\n\n') };
}
