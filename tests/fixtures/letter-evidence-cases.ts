import type { ProductLocale } from '../../src/lib/product-locale';
import type { EvidenceItem } from '../../src/lib/letter-evidence';

export type EvidenceCase = {
  id: string;
  locale: ProductLocale;
  ageBand: string;
  profile: string;
  job: string;
  motivation: string;
  example: string;
  future: string;
  target: EvidenceItem;
  development: string;
  invented: string;
};

export const evidenceCases = [
  {
    id: 'de-entry', locale: 'de', ageBand: '18–24', profile: 'Berufseinstieg Logistik',
    job: 'Lagerassistenz gesucht. Erfahrung mit wöchentlichen Bestandslisten ist besonders wichtig. Ein Staplerausweis ist von Vorteil.',
    motivation: 'Die Zusammenarbeit im Lager spricht mich an.',
    example: 'Bei einem Vereinsanlass habe ich den Audioaufbau unterstützt.',
    future: 'Ich möchte Materialengpässe früh mit dem Team abklären.',
    target: { kind: 'experience', text: 'Im Praktikum habe ich wöchentlich die Bestandsliste mit dem Lager abgeglichen.' },
    development: 'Ich möchte den Staplerausweis erwerben.',
    invented: 'Ich besitze einen Staplerausweis.',
  },
  {
    id: 'en-career-change', locale: 'en', ageBand: '25–34', profile: 'Quereinstieg Hotel → IT-Support',
    job: 'Junior IT help desk. Prioritise service requests and give clear handovers. ITIL certification desirable.',
    motivation: 'I want to bring my customer service experience to technical support.',
    example: 'I helped prepare conference rooms at a hotel.',
    future: 'I would like to learn how to troubleshoot network incidents.',
    target: { kind: 'transferableSkill', text: 'At the hotel I prioritised guest requests and wrote a handover for the next shift.' },
    development: 'I plan to study for the ITIL exam.',
    invented: 'I am ITIL certified and have administered production networks.',
  },
  {
    id: 'fr-return', locale: 'fr', ageBand: '35–49', profile: 'Wiedereinstieg Administration',
    job: 'Poste administratif. La coordination des rendez-vous et la tenue du calendrier sont essentielles.',
    motivation: 'Je souhaite retrouver un poste administratif à temps partiel.',
    example: 'J’ai participé à un atelier bénévole de photographie.',
    future: 'Je souhaite apprendre à utiliser votre logiciel de réservation.',
    target: { kind: 'confirmedSkill', text: 'Je coordonne les rendez-vous et saisis les changements dans le calendrier partagé.' },
    development: 'Je souhaite me former aux tableaux de bord.',
    invented: 'J’ai réduit les absences de 30 %.',
  },
  {
    id: 'it-senior', locale: 'it', ageBand: '50–64', profile: 'Langjährige Industrieerfahrung',
    job: 'Ruolo nel collaudo industriale. È richiesta una qualifica di perito meccanico e capacità di leggere i disegni.',
    motivation: 'Vorrei contribuire a un processo di collaudo accurato.',
    example: 'Ho organizzato i turni del volontariato locale.',
    future: 'Vorrei applicare la mia esperienza anche al collaudo robotizzato.',
    target: { kind: 'qualification', text: 'Ho conseguito il diploma di perito meccanico.' },
    development: 'Vorrei approfondire la programmazione dei robot.',
    invented: 'Ho diretto l’installazione di tre linee robotizzate.',
  },
  {
    id: 'de-senior', locale: 'de', ageBand: '65+', profile: 'Langjähriger technischer Service, Teilzeit',
    job: 'Teilzeitstelle im technischen Service. Gesucht wird Erfahrung mit Wartungsprotokollen.',
    motivation: 'Ich möchte Kundinnen und Kunden im technischen Service unterstützen.',
    example: 'Ich habe für einen Verein Sitzungen organisiert.',
    future: 'Ich möchte künftig neue Mitarbeitende einarbeiten.',
    target: { kind: 'experience', text: 'Ich habe bei jedem Wartungseinsatz ein schriftliches Protokoll erstellt.' },
    development: 'Ich möchte die Diagnose neuer Photovoltaikanlagen lernen.',
    invented: 'Ich leitete zwanzig Monteure und erhöhte den Umsatz.',
  },
  {
    id: 'en-apprentice', locale: 'en', ageBand: '18–24', profile: 'Erste reguläre Stelle in der Küche',
    job: 'Kitchen assistant. Food safety training and stock rotation are important.',
    motivation: 'I enjoy working carefully in a busy kitchen.',
    example: 'I completed a supervised placement in a canteen.',
    future: 'I would like to take responsibility for ordering supplies.',
    target: { kind: 'qualification', text: 'I completed the food safety course during my placement.' },
    development: 'I would like to train in menu design.',
    invented: 'I ran a Michelin-starred restaurant.',
  },
  {
    id: 'fr-career-change', locale: 'fr', ageBand: '25–34', profile: 'Quereinstieg Pflegeassistenz → Disposition',
    job: 'Le poste consiste à coordonner les équipes et à transmettre les urgences opérationnelles.',
    motivation: 'Je souhaite évoluer vers la coordination opérationnelle.',
    example: 'Je préparais les documents pour les réunions hebdomadaires.',
    future: 'Je souhaite découvrir la gestion des stocks.',
    target: { kind: 'transferableSkill', text: 'En équipe de soins, je transmettais les changements de priorité à la relève.' },
    development: 'Je souhaite apprendre à utiliser un logiciel de planning.',
    invented: 'J’ai géré les stocks de deux entrepôts.',
  },
  {
    id: 'it-return', locale: 'it', ageBand: '35–49', profile: 'Wiedereinstieg Buchhaltung',
    job: 'Addetto alla contabilità. Occorrono esperienza nella registrazione delle fatture e precisione.',
    motivation: 'Desidero riprendere a lavorare nella contabilità.',
    example: 'Ho gestito le iscrizioni a un evento di quartiere.',
    future: 'Vorrei aggiornarmi sulle procedure contabili svizzere.',
    target: { kind: 'confirmedSkill', text: 'So registrare le fatture e controllare la corrispondenza con gli ordini.' },
    development: 'Vorrei imparare un nuovo gestionale contabile.',
    invented: 'Sono revisore iscritto all’albo.',
  },
] satisfies EvidenceCase[];

export function evidenceCaseInput(item: EvidenceCase) {
  return {
    cv: item.invented,
    job: item.job,
    language: item.locale,
    motivation: item.motivation,
    example: item.example,
    contribution: item.future,
    evidence: [item.target, { kind: 'developmentGoal', text: item.development }] satisfies EvidenceItem[],
  };
}
