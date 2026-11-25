import type { ProductLocale } from './product-locale';

const de = {
  tagline: 'Deine Erfahrung. Deine Worte. Dein nächster Schritt.',
  checking: 'Deine Anmeldung wird geprüft …', intro: 'Erstelle ein Konto oder melde dich mit E-Mail und Passwort an.',
  resetIntro: 'Gib deine Konto-E-Mail ein. Wir senden dir einen Link, falls ein Konto besteht.',
  name: 'Name', email: 'E-Mail', password: 'Passwort', passwordLength: '(mindestens 12 Zeichen)',
  busy: 'Bitte warten …', create: 'Konto erstellen', request: 'Link anfordern', signin: 'Anmelden',
  existing: 'Ich habe bereits ein Konto', newAccount: 'Neues Konto erstellen', back: 'Zur Anmeldung',
  forgot: 'Passwort vergessen?', home: 'Zur Produktseite', privacy: 'Datenschutz', terms: 'Nutzungsbedingungen', legal: 'Impressum',
  failure: 'Anmeldung fehlgeschlagen.', resetFailure: 'Die Anfrage konnte momentan nicht verarbeitet werden.',
  resetSent: 'Wenn ein Konto zu dieser Adresse besteht, wird ein Link zum Zurücksetzen gesendet.',
  verify: 'Bitte bestätige deine E-Mail-Adresse über den Link in deinem Postfach.',
} as const;

type AuthCopy = { [Key in keyof typeof de]: string };
export const authCopy: Record<ProductLocale, AuthCopy> = {
  de,
  en: {
    tagline: 'Your experience. Your words. Your next step.',
    checking: 'Checking your sign-in …', intro: 'Create an account or sign in with your email and password.',
    resetIntro: 'Enter your account email. We’ll send you a link if an account exists.',
    name: 'Name', email: 'Email', password: 'Password', passwordLength: '(at least 12 characters)',
    busy: 'Please wait …', create: 'Create account', request: 'Request link', signin: 'Sign in',
    existing: 'I already have an account', newAccount: 'Create a new account', back: 'Back to sign-in',
    forgot: 'Forgot your password?', home: 'Back to the product page', privacy: 'Privacy', terms: 'Terms of use', legal: 'Legal notice',
    failure: 'Sign-in failed.', resetFailure: 'We couldn’t process the request right now.',
    resetSent: 'If an account exists for this email address, we’ll send a password reset link.',
    verify: 'Confirm your email address using the link in your inbox.',
  },
  fr: {
    tagline: 'Votre expérience. Vos mots. Votre prochaine étape.',
    checking: 'Vérification de votre connexion …', intro: 'Créez un compte ou connectez-vous avec votre adresse e-mail et votre mot de passe.',
    resetIntro: 'Saisissez l’adresse e-mail de votre compte. Nous vous enverrons un lien si un compte existe.',
    name: 'Nom', email: 'Adresse e-mail', password: 'Mot de passe', passwordLength: '(12 caractères au minimum)',
    busy: 'Veuillez patienter …', create: 'Créer un compte', request: 'Demander un lien', signin: 'Se connecter',
    existing: 'J’ai déjà un compte', newAccount: 'Créer un nouveau compte', back: 'Retour à la connexion',
    forgot: 'Mot de passe oublié ?', home: 'Retour à la page du produit', privacy: 'Confidentialité', terms: 'Conditions d’utilisation', legal: 'Mentions légales',
    failure: 'Échec de la connexion.', resetFailure: 'La demande ne peut pas être traitée pour le moment.',
    resetSent: 'Si un compte existe pour cette adresse, vous recevrez un lien de réinitialisation.',
    verify: 'Confirmez votre adresse e-mail via le lien reçu dans votre boîte de réception.',
  },
  it: {
    tagline: 'La tua esperienza. Le tue parole. Il tuo prossimo passo.',
    checking: 'Verifica del tuo accesso …', intro: 'Crea un account o accedi con e-mail e password.',
    resetIntro: 'Inserisci l’indirizzo e-mail del tuo account. Se esiste un account ti invieremo un link.',
    name: 'Nome', email: 'E-mail', password: 'Password', passwordLength: '(almeno 12 caratteri)',
    busy: 'Attendi …', create: 'Crea un account', request: 'Richiedi il link', signin: 'Accedi',
    existing: 'Ho già un account', newAccount: 'Crea un nuovo account', back: 'Torna all’accesso',
    forgot: 'Password dimenticata?', home: 'Torna alla pagina del prodotto', privacy: 'Privacy', terms: 'Condizioni d’uso', legal: 'Informazioni legali',
    failure: 'Accesso non riuscito.', resetFailure: 'La richiesta non può essere elaborata al momento.',
    resetSent: 'Se esiste un account per questo indirizzo, riceverai un link per reimpostare la password.',
    verify: 'Conferma il tuo indirizzo e-mail usando il link ricevuto.',
  },
};
