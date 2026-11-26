import { PLANS } from './plans';
import type { ProductLocale } from './product-locale';

const price = `CHF ${(PLANS.weekly.amount / 100).toFixed(2)}`;
const credits = PLANS.weekly.limit;

export const stagedTermsCopy: Record<ProductLocale, { intro: string; free: string; heading: string; weekly: string; refund: string; version: string }> = {
  de: {
    intro: 'Motivationsboost bietet ein Benutzerkonto, eine lokale Bewerbungsübersicht und einen bearbeitbaren Entwurf für ein Motivationsschreiben. Die verfügbaren Leistungen stehen in der Anwendung.',
    free: 'FREE kostet CHF 0.00 und enthält 0 KI-Credits. Die Registrierung erfordert keine Zahlungsdaten und löst keine Zahlung oder ein Abonnement aus.',
    heading: 'Preis, Leistung und Ende des Wochenpasses',
    weekly: `Der Wochenpass kostet einmalig ${price} und enthält ${credits} Credits. Er gilt sieben Tage ab Freischaltung nach bestätigter Payrexx-Zahlung. Nach Ablauf verfallen ungenutzte Credits. Der Pass endet automatisch. Eigene lokal gespeicherte Unterlagen bleiben zugänglich.`,
    refund: 'Bei Fragen zur Zahlung oder zur Rückerstattung wende dich an den Produktsupport. Eine vollständige Rückerstattung beendet den Wochenpass. Zwingende gesetzliche Rechte bleiben vorbehalten.',
    version: 'Stand der Wochenpass-Bedingungen',
  },
  en: {
    intro: 'Motivationsboost provides an account, a local application tracker and an editable cover letter draft. The app shows the available services.',
    free: 'FREE costs CHF 0.00 and includes 0 AI credits. Registration requires no payment details and starts no payment or subscription.',
    heading: 'Weekly pass price, access and expiry',
    weekly: `The weekly pass costs ${price} as a one-off payment and includes ${credits} credits. It is valid for seven days after activation following Payrexx payment confirmation. Unused credits expire at the end of the pass. The pass ends automatically. Your locally stored documents remain accessible.`,
    refund: 'Contact product support with payment or refund questions. A full refund ends the weekly pass. Mandatory legal rights remain unaffected.',
    version: 'Weekly pass terms version',
  },
  fr: {
    intro: 'Motivationsboost propose un compte, un suivi local des candidatures et un brouillon modifiable de lettre de motivation. L’application présente les prestations disponibles.',
    free: 'FREE coûte CHF 0.00 et comprend 0 crédit IA. L’inscription ne demande aucune donnée de paiement et ne déclenche ni paiement ni abonnement.',
    heading: 'Prix, prestations et expiration du pass hebdomadaire',
    weekly: `Le pass hebdomadaire coûte ${price} en un paiement unique et comprend ${credits} crédits. Il est valable sept jours après son activation, une fois le paiement confirmé par Payrexx. Les crédits inutilisés expirent à la fin du pass. Le pass prend fin automatiquement. Vos documents enregistrés sur votre appareil restent accessibles.`,
    refund: 'Pour toute question sur le paiement ou le remboursement, contactez l’assistance. Un remboursement intégral met fin au pass. Les droits impératifs restent réservés.',
    version: 'Version des conditions du pass hebdomadaire',
  },
  it: {
    intro: 'Motivationsboost offre un account, una panoramica locale delle candidature e una bozza di lettera di motivazione modificabile. L’app mostra i servizi disponibili.',
    free: 'FREE costa CHF 0.00 e include 0 crediti IA. La registrazione non richiede dati di pagamento e non avvia pagamenti o abbonamenti.',
    heading: 'Prezzo, prestazioni e scadenza del pass settimanale',
    weekly: `Il pass settimanale costa ${price} con pagamento unico e comprende ${credits} crediti. È valido per sette giorni dall’attivazione dopo la conferma del pagamento da parte di Payrexx. I crediti inutilizzati scadono alla fine del pass. Il pass termina automaticamente. I documenti salvati sul tuo dispositivo rimangono accessibili.`,
    refund: 'Per domande sul pagamento o sul rimborso, contatta l’assistenza. Il rimborso integrale pone fine al pass settimanale. Restano salvi i diritti inderogabili.',
    version: 'Versione delle condizioni del pass settimanale',
  },
};
