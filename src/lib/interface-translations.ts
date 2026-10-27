export const UI_LOCALES = [
  ['de', 'Deutsch'], ['en', 'English'], ['fr', 'Français'], ['it', 'Italiano'],
  ['es', 'Español'], ['pt', 'Português'], ['uk', 'Українська'], ['ar', 'العربية'],
] as const;
export type UiLocale = typeof UI_LOCALES[number][0];
export const isUiLocale = (value: string): value is UiLocale => UI_LOCALES.some(([tag]) => tag === value);

type Entry = Record<string, string>;
const translations: Record<UiLocale, Entry> = {
  de: {
    start:'Dashboard',uploads:'Dokumente', 'cv-generator':'CV-Generator',generator:'Motivationsschreiben','career-profile':'Kompetenzpass & Zielland',
    feedback:'Bewerbungsanalyse', 'linkedin-booster':'LinkedIn-Profil',interview:'Interview-Coach','photo-studio':'KI-Foto-Studio','cv-gaps':'CV-Editor','salary-checker':'Gehalts-Check',
    'job-tracker':'Bewerbungsübersicht','job-finder':'Stellensuche',email:'E-Mail-Vorlagen',export:'Export','style-profile':'Mein Stil',abo:'Abonnement',trust:'Hilfe & Datenschutz','owner-dashboard':'Administration',
    'Übersicht':'Übersicht','Erstellung':'Erstellung','Optimierung':'Optimierung','Verwaltung':'Verwaltung','Konto':'Konto',
    'signout':'Abmelden','signin':'Anmelden','reconnect':'Drive verbinden','chooseInterface':'App-Sprache','chooseOutput':'Dokumentensprache',
  },
  en: {
    start:'Dashboard',uploads:'Documents','cv-generator':'Resume builder',generator:'Cover letters','career-profile':'Skills & target country',
    feedback:'Application review','linkedin-booster':'LinkedIn profile',interview:'Interview coach','photo-studio':'AI photo studio','cv-gaps':'Resume editor','salary-checker':'Salary guidance',
    'job-tracker':'Application tracker','job-finder':'Job search',email:'Email templates',export:'Export','style-profile':'My writing style',abo:'Subscription',trust:'Help & privacy','owner-dashboard':'Admin',
    'Übersicht':'Overview','Erstellung':'Create','Optimierung':'Improve','Verwaltung':'Manage','Konto':'Account',
    signout:'Sign out',signin:'Sign in',reconnect:'Connect Drive',chooseInterface:'App language',chooseOutput:'Document language',
  },
  fr: {
    start:'Tableau de bord',uploads:'Documents','cv-generator':'Créer un CV',generator:'Lettre de motivation','career-profile':'Compétences et pays',
    feedback:'Analyse de candidature','linkedin-booster':'Profil LinkedIn',interview:'Préparation entretien','photo-studio':'Photo IA','cv-gaps':'Modifier le CV','salary-checker':'Salaire estimé',
    'job-tracker':'Suivi des candidatures','job-finder':'Recherche d’emploi',email:'E-mails',export:'Exporter','style-profile':'Mon style',abo:'Abonnement',trust:'Aide et confidentialité','owner-dashboard':'Administration',
    'Übersicht':'Aperçu','Erstellung':'Créer','Optimierung':'Améliorer','Verwaltung':'Gérer','Konto':'Compte',
    signout:'Déconnexion',signin:'Connexion',reconnect:'Connecter Drive',chooseInterface:'Langue de l’application',chooseOutput:'Langue du document',
  },
  it: {
    start:'Panoramica',uploads:'Documenti','cv-generator':'Crea CV',generator:'Lettera di presentazione','career-profile':'Competenze e Paese',
    feedback:'Analisi candidatura','linkedin-booster':'Profilo LinkedIn',interview:'Colloqui','photo-studio':'Foto IA','cv-gaps':'Modifica CV','salary-checker':'Stima stipendio',
    'job-tracker':'Candidature','job-finder':'Cerca lavoro',email:'Modelli e-mail',export:'Esporta','style-profile':'Il mio stile',abo:'Abbonamento',trust:'Aiuto e privacy','owner-dashboard':'Amministrazione',
    'Übersicht':'Panoramica','Erstellung':'Crea','Optimierung':'Migliora','Verwaltung':'Gestisci','Konto':'Account',
    signout:'Esci',signin:'Accedi',reconnect:'Collega Drive',chooseInterface:'Lingua app',chooseOutput:'Lingua documento',
  },
  es: {
    start:'Panel principal',uploads:'Documentos','cv-generator':'Crear CV',generator:'Carta de presentación','career-profile':'Competencias y país',
    feedback:'Revisión de candidatura','linkedin-booster':'Perfil LinkedIn',interview:'Entrevistas','photo-studio':'Foto IA','cv-gaps':'Editar CV','salary-checker':'Orientación salarial',
    'job-tracker':'Seguimiento','job-finder':'Buscar empleo',email:'Plantillas de correo',export:'Exportar','style-profile':'Mi estilo',abo:'Suscripción',trust:'Ayuda y privacidad','owner-dashboard':'Administración',
    'Übersicht':'Resumen','Erstellung':'Crear','Optimierung':'Mejorar','Verwaltung':'Gestionar','Konto':'Cuenta',
    signout:'Cerrar sesión',signin:'Acceder',reconnect:'Conectar Drive',chooseInterface:'Idioma de la app',chooseOutput:'Idioma del documento',
  },
  pt: {
    start:'Painel',uploads:'Documentos','cv-generator':'Criar currículo',generator:'Carta de apresentação','career-profile':'Competências e país',
    feedback:'Análise da candidatura','linkedin-booster':'Perfil LinkedIn',interview:'Entrevistas','photo-studio':'Foto IA','cv-gaps':'Editar currículo','salary-checker':'Orientação salarial',
    'job-tracker':'Acompanhar candidaturas','job-finder':'Buscar emprego',email:'Modelos de e-mail',export:'Exportar','style-profile':'Meu estilo',abo:'Assinatura',trust:'Ajuda e privacidade','owner-dashboard':'Administração',
    'Übersicht':'Visão geral','Erstellung':'Criar','Optimierung':'Melhorar','Verwaltung':'Gerir','Konto':'Conta',
    signout:'Sair',signin:'Entrar',reconnect:'Conectar Drive',chooseInterface:'Idioma da aplicação',chooseOutput:'Idioma do documento',
  },
  uk: {
    start:'Панель',uploads:'Документи','cv-generator':'Створити резюме',generator:'Супровідний лист','career-profile':'Навички та країна',
    feedback:'Аналіз заявки','linkedin-booster':'Профіль LinkedIn',interview:'Співбесіда','photo-studio':'Фото ШІ','cv-gaps':'Редактор резюме','salary-checker':'Орієнтир зарплати',
    'job-tracker':'Мої заявки','job-finder':'Пошук роботи',email:'Шаблони листів',export:'Експорт','style-profile':'Мій стиль',abo:'Підписка',trust:'Допомога і приватність','owner-dashboard':'Адміністрування',
    'Übersicht':'Огляд','Erstellung':'Створити','Optimierung':'Поліпшити','Verwaltung':'Керування','Konto':'Обліковий запис',
    signout:'Вийти',signin:'Увійти',reconnect:'Підключити Drive',chooseInterface:'Мова застосунку',chooseOutput:'Мова документа',
  },
  ar: {
    start:'لوحة التحكم',uploads:'المستندات','cv-generator':'إنشاء السيرة الذاتية',generator:'خطاب التقديم','career-profile':'المهارات والبلد',
    feedback:'مراجعة الطلب','linkedin-booster':'ملف LinkedIn',interview:'التدرب على المقابلة','photo-studio':'صورة بالذكاء الاصطناعي','cv-gaps':'تعديل السيرة','salary-checker':'تقدير الراتب',
    'job-tracker':'متابعة الطلبات','job-finder':'البحث عن عمل',email:'نماذج البريد',export:'تصدير','style-profile':'أسلوبي',abo:'الاشتراك',trust:'المساعدة والخصوصية','owner-dashboard':'الإدارة',
    'Übersicht':'نظرة عامة','Erstellung':'إنشاء','Optimierung':'تحسين','Verwaltung':'إدارة','Konto':'الحساب',
    signout:'تسجيل الخروج',signin:'تسجيل الدخول',reconnect:'ربط Drive',chooseInterface:'لغة التطبيق',chooseOutput:'لغة المستند',
  },
};

export function uiText(locale: string, key: string, fallback = key): string {
  return (isUiLocale(locale) ? translations[locale][key] : null) || translations.de[key] || fallback;
}
