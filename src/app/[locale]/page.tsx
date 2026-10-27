import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

const pages = {
  de: {
    title: 'KI-Karrierebegleiter und Bewerbungsassistent',
    description: 'Lebenslauf, Kompetenzanalyse, individuelle Bewerbungen, Interviewtraining und Bewerbungsübersicht an einem Ort.',
    eyebrow: 'Dein beruflicher Weg',
    heading: 'Finde den nächsten Schritt, der wirklich zu dir passt.',
    intro: 'Berufserfahrung verstehen, belegte Stärken erkennen und überzeugende Bewerbungen vorbereiten. Du entscheidest über jeden Entwurf.',
    features: ['Berufserfahrung und Qualifikationen strukturiert auswerten', 'Lebenslauf und Motivationsschreiben individuell gestalten', 'Stellenanforderungen abgleichen und Interviews üben', 'Bewerbungen und Rückmeldungen übersichtlich organisieren'],
    trust: 'Die KI kann Fehler machen. Prüfe alle Fakten vor dem Versenden. Wir versprechen weder Jobangebote noch eine Einstellung.',
    cta: 'Zur geschützten Anwendung',
    note: 'Vorbereitungsphase: Funktionen sind noch nicht vollständig öffentlich verfügbar.',
    how: 'So funktioniert es', steps: ['Unterlagen kontrolliert einlesen', 'Belegte Fähigkeiten und passende Rollen prüfen', 'Entwürfe bearbeiten, freigeben und exportieren'],
    question: 'Ersetzt die App einen menschlichen Karriereberater?',
    answer: 'Nein. Sie ist ein Hilfsmittel für eigene Entscheidungen. Eignungswerte sind Einschätzungen und keine Arbeitgeber- oder ATS-Bewertungen.',
  },
  en: {
    title: 'AI career companion and job application assistant',
    description: 'Review your experience, build tailored CVs and cover letters, prepare interviews and track job applications.',
    eyebrow: 'Your next career step',
    heading: 'Discover opportunities that genuinely match your experience.',
    intro: 'Understand your skills, build evidence-based applications and prepare for interviews. You review and approve every draft.',
    features: ['Organize evidence from employment and education records', 'Create tailored resumes and cover letters', 'Compare job requirements and practise interviews', 'Track applications and follow-ups in one place'],
    trust: 'AI can make mistakes. Review every claim before sending. We cannot guarantee interviews or employment.',
    cta: 'Open protected application',
    note: 'Pre-release preview: some services are not yet publicly available.',
    how: 'How it works', steps: ['Import and review your documents', 'Explore verified skills and suitable roles', 'Edit, approve and export your applications'],
    question: 'Does this replace a human career adviser?',
    answer: 'No. It helps you make your own decisions. Fit estimates are not employer assessments or verified ATS scores.',
  },
  fr: {
    title: 'Assistant IA pour votre carrière et vos candidatures',
    description: 'Valorisez votre expérience, préparez CV et lettres personnalisés, entretiens et suivi des candidatures.',
    eyebrow: 'Votre prochain pas professionnel',
    heading: 'Découvrez des possibilités adaptées à votre expérience.',
    intro: 'Identifiez vos compétences justifiées et préparez des candidatures personnalisées. Vous validez chaque document.',
    features: ['Analyser les justificatifs d’expérience et de formation', 'Préparer CV et lettres de motivation adaptés', 'Comparer les exigences et préparer les entretiens', 'Suivre les candidatures et les relances'],
    trust: 'L’IA peut se tromper. Vérifiez toujours les informations. Aucun entretien ou emploi n’est garanti.',
    cta: 'Ouvrir l’application sécurisée',
    note: 'Préversion : certains services ne sont pas encore ouverts au public.',
    how: 'Comment ça marche', steps: ['Importer et vérifier les documents', 'Examiner les compétences et les métiers possibles', 'Corriger, approuver et exporter'],
    question: 'Cette application remplace-t-elle un conseiller humain ?',
    answer: 'Non. Elle soutient vos décisions. Les estimations de compatibilité ne sont pas des notes officielles des recruteurs.',
  },
  it: {
    title: 'Assistente IA per carriera e candidature',
    description: 'Analizza competenze e documenti, prepara CV e lettere, allenati ai colloqui e segui le candidature.',
    eyebrow: 'Il tuo prossimo passo',
    heading: 'Scopri opportunità adatte alla tua esperienza.',
    intro: 'Valorizza competenze documentate e crea candidature personalizzate. Ogni bozza è sotto il tuo controllo.',
    features: ['Analizza esperienza e titoli documentati', 'Crea CV e lettere su misura', 'Confronta requisiti e preparati ai colloqui', 'Monitora candidature e risposte'],
    trust: 'L’IA può sbagliare. Controlla ogni informazione prima di inviare. Nessun lavoro è garantito.',
    cta: 'Apri l’app protetta',
    note: 'Anteprima: non tutti i servizi sono ancora pubblici.',
    how: 'Come funziona', steps: ['Carica e controlla i documenti', 'Esamina le competenze e i ruoli adatti', 'Modifica, approva ed esporta'],
    question: 'L’app sostituisce un consulente di carriera?',
    answer: 'No. Ti aiuta a decidere. Le stime di compatibilità non sono valutazioni ufficiali dei datori di lavoro.',
  },
  es: {
    title: 'Asistente de IA para tu carrera y candidaturas',
    description: 'Analiza tu experiencia, crea currículos y cartas, practica entrevistas y organiza candidaturas.',
    eyebrow: 'Tu próximo paso profesional',
    heading: 'Descubre oportunidades acordes con tu experiencia.',
    intro: 'Reconoce competencias acreditadas y prepara solicitudes personalizadas. Tú revisas cada borrador.',
    features: ['Analiza experiencia, certificados y estudios', 'Crea CV y cartas de presentación personalizadas', 'Compara requisitos y practica entrevistas', 'Organiza solicitudes y seguimientos'],
    trust: 'La IA puede cometer errores. Verifica los datos antes de enviarlos. No garantizamos entrevistas ni empleo.',
    cta: 'Abrir aplicación protegida',
    note: 'Versión preliminar: algunos servicios aún no están disponibles.',
    how: 'Cómo funciona', steps: ['Importa y revisa documentos', 'Evalúa habilidades acreditadas y posibles puestos', 'Edita, aprueba y exporta'],
    question: '¿Sustituye a un orientador profesional?',
    answer: 'No. Te ayuda a tomar decisiones. Las estimaciones no son puntuaciones oficiales de selección.',
  },
  pt: {
    title: 'Assistente de IA para carreira e candidaturas',
    description: 'Organize competências, currículos e cartas, prepare entrevistas e acompanhe candidaturas.',
    eyebrow: 'O seu próximo passo',
    heading: 'Encontre oportunidades adequadas à sua experiência.',
    intro: 'Reconheça competências comprovadas e prepare candidaturas personalizadas. Cada rascunho depende da sua aprovação.',
    features: ['Analise experiências e qualificações documentadas', 'Crie currículos e cartas personalizados', 'Compare requisitos e pratique entrevistas', 'Acompanhe candidaturas e respostas'],
    trust: 'A IA pode errar. Confirme todos os dados antes de enviar. Não há garantia de entrevista ou emprego.',
    cta: 'Abrir aplicação protegida',
    note: 'Pré-lançamento: alguns serviços ainda não estão disponíveis publicamente.',
    how: 'Como funciona', steps: ['Importe e reveja documentos', 'Avalie competências e funções adequadas', 'Edite, aprove e exporte'],
    question: 'A aplicação substitui aconselhamento profissional?',
    answer: 'Não. Ajuda nas suas decisões. As estimativas não são avaliações oficiais de recrutadores.',
  },
  uk: {
    title: 'ШІ-помічник для кар’єри та пошуку роботи',
    description: 'Аналізуйте навички, створюйте резюме й супровідні листи, готуйтеся до співбесід і відстежуйте заявки.',
    eyebrow: 'Ваш наступний кар’єрний крок',
    heading: 'Знайдіть можливості, що відповідають вашому досвіду.',
    intro: 'Зрозумійте свої підтверджені навички та підготуйте персоналізовані документи. Кожен чернетковий текст ви перевіряєте самі.',
    features: ['Аналізуйте документи про освіту та досвід', 'Створюйте адаптовані резюме й листи', 'Порівнюйте вимоги вакансій і тренуйте співбесіди', 'Відстежуйте заявки та відповіді'],
    trust: 'ШІ може помилятися. Перевіряйте всі факти перед надсиланням. Працевлаштування не гарантується.',
    cta: 'Відкрити захищений застосунок',
    note: 'Попередня версія: не всі сервіси вже доступні.',
    how: 'Як це працює', steps: ['Завантажте й перевірте документи', 'Оцініть підтверджені навички та варіанти роботи', 'Відредагуйте, підтвердьте й експортуйте'],
    question: 'Чи замінює застосунок кар’єрного консультанта?',
    answer: 'Ні. Він допомагає ухвалювати рішення. Оцінки відповідності не є оцінками роботодавців.',
  },
  ar: {
    title: 'مساعد ذكي للمسيرة المهنية والتقديم للوظائف',
    description: 'حلّل خبراتك، وأنشئ سيرتك الذاتية وخطابات التقديم، وتدرّب على المقابلات، وتابع طلباتك.',
    eyebrow: 'خطوتك المهنية التالية',
    heading: 'اكتشف الفرص المناسبة لخبراتك الحقيقية.',
    intro: 'تعرّف على مهاراتك المدعومة بالمستندات، وأعد طلبات توظيف مخصصة. تراجع أنت كل مسودة قبل اعتمادها.',
    features: ['تحليل الخبرات والشهادات الموثقة', 'إعداد سيرة ذاتية وخطابات مخصصة', 'مقارنة متطلبات الوظائف والتدرب على المقابلات', 'متابعة الطلبات والردود'],
    trust: 'قد يخطئ الذكاء الاصطناعي. تحقّق من المعلومات قبل الإرسال. لا نضمن مقابلة أو وظيفة.',
    cta: 'فتح التطبيق المحمي',
    note: 'نسخة تجريبية: بعض الخدمات غير متاحة للعامة بعد.',
    how: 'كيف يعمل', steps: ['استيراد المستندات ومراجعتها', 'استكشاف المهارات والوظائف المناسبة', 'التحرير والموافقة والتصدير'],
    question: 'هل يحل التطبيق محل المستشار المهني؟',
    answer: 'لا. إنه يساعدك في اتخاذ قراراتك، ولا تمثل تقديرات الملاءمة تقييماً رسمياً من أصحاب العمل.',
  },
} as const;

type Locale = keyof typeof pages;
export const locales = Object.keys(pages) as Locale[];

function publicOrigin(): string | null {
  if (process.env.PUBLIC_SITE_LAUNCHED !== 'true') return null;
  try {
    const u = new URL(process.env.NEXT_PUBLIC_SITE_URL || '');
    return u.protocol === 'https:' ? u.origin : null;
  } catch { return null; }
}

export const dynamicParams = false;
export function generateStaticParams() { return locales.map(locale => ({ locale })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!Object.hasOwn(pages, locale)) return { robots: { index: false } };
  const copy = pages[locale as Locale];
  const base = publicOrigin();
  const languages = base ? Object.fromEntries(locales.map(code => [code, base + '/' + code])) : undefined;
  return {
    title: copy.title + ' | Motivationsboost',
    description: copy.description,
    robots: { index: Boolean(base), follow: Boolean(base) },
    alternates: base ? { canonical: base + '/' + locale, languages } : undefined,
    openGraph: { title: copy.title, description: copy.description, type: 'website', locale },
  };
}

export default async function LocalizedPublicPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!Object.hasOwn(pages, locale)) notFound();
  const copy = pages[locale as Locale];
  const base = publicOrigin();
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Motivationsboost',
    description: copy.description,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    inLanguage: locale,
    url: base ? base + '/' + locale : undefined,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CHF' },
    featureList: copy.features,
  };
  return (
    <div lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} className="min-h-screen bg-background text-foreground">
      {base && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />}
      <header className="border-b px-5 py-5">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4" aria-label="Language navigation">
          <span className="font-semibold">Motivationsboost</span>
          <div className="flex flex-wrap gap-3 text-sm">
            {locales.map(code => <Link key={code} href={'/' + code} hrefLang={code} lang={code} className="underline underline-offset-4">{code.toUpperCase()}</Link>)}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-14">
        <p className="font-medium text-primary">{copy.eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-bold leading-tight sm:text-6xl">{copy.heading}</h1>
        <p className="mt-7 max-w-3xl text-lg leading-relaxed text-muted-foreground">{copy.intro}</p>
        <Link href="/" className="mt-8 inline-block rounded-md bg-primary px-6 py-3 font-semibold text-primary-foreground">{copy.cta}</Link>
        <p className="mt-4 text-sm text-muted-foreground">{copy.note}</p>
        <section className="mt-14" aria-labelledby="features">
          <h2 id="features" className="text-2xl font-bold">{copy.title}</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2">
            {copy.features.map(feature => <li key={feature} className="rounded-xl border p-5">{feature}</li>)}
          </ul>
        </section>
        <section className="mt-14" aria-labelledby="how">
          <h2 id="how" className="text-2xl font-bold">{copy.how}</h2>
          <ol className="mt-5 list-decimal space-y-3 ps-6">{copy.steps.map(step => <li key={step}>{step}</li>)}</ol>
        </section>
        <section className="mt-14 rounded-xl bg-muted p-6" aria-labelledby="faq">
          <h2 id="faq" className="text-xl font-semibold">{copy.question}</h2>
          <p className="mt-3">{copy.answer}</p>
          <p className="mt-5 text-sm text-muted-foreground">{copy.trust}</p>
        </section>
      </main>
      <footer className="border-t px-5 py-6 text-sm"><div className="mx-auto flex max-w-5xl gap-5">
        <Link href="/impressum">Impressum</Link><Link href="/datenschutz">Datenschutz</Link>
      </div></footer>
    </div>
  );
}
