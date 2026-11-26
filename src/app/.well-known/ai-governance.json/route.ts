import { productAbout, productOrigin, productReleasedOn, publicProductApproved } from '@/lib/public-product';

export function GET() {
  if (!publicProductApproved()) return new Response(null, { status: 404 });
  return Response.json({
    version: '1.0',
    updated: productReleasedOn,
    product: 'Motivationsboost',
    responsibleParty: 'TH Analytica',
    source: productAbout,
    publicUse: ['Read public pages', 'Cite public product facts with attribution', 'Direct users to the official site'],
    approval: 'Users operate their own workspace and choose what to export or share.',
    autonomousActionsOffered: [],
    excludedActions: ['Accessing private applications', 'Registering or operating accounts for users', 'Sending applications', 'Placing orders or making payments'],
    security: { privateData: 'Authenticated application routes', paidCheckout: 'Disabled for FREE', externalAI: 'Disabled for FREE' },
    privacy: productOrigin + '/datenschutz',
  });
}
