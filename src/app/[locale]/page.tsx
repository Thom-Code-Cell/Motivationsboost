import { redirect } from 'next/navigation';
import { ReleasedProductHome } from '../released-product-home';
import { isProductLocale, productLocales } from '@/lib/product-locale';
import { publicProductApproved, publicProductMetadata, publicProductSchema } from '@/lib/public-product';
import { weeklyLiveCheckoutConfiguration } from '@/lib/server/payrexx-checkout-config';
import '../sites-landing.css';

export const dynamicParams = false;

export function generateStaticParams() {
  return [...productLocales, 'ar', 'es', 'pt', 'nl'].map(locale => ({ locale }));
}

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  if (locale === 'de' || !isProductLocale(locale)) return { robots: { index: false, follow: false } };
  return publicProductMetadata(locale);
}

export default async function LocalizedPublicPage({ params }: Props) {
  const { locale } = await params;
  if (!publicProductApproved() || !isProductLocale(locale) || locale === 'de') redirect('/');
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(publicProductSchema(locale)) }} />
    <ReleasedProductHome fixedLocale={locale} weeklyAvailable={Boolean(weeklyLiveCheckoutConfiguration())} />
  </>;
}
