import prisma from './models/prisma';

const defaultPlans = [
  {
    name: 'free',
    displayName: 'Free',
    description: 'Get started with basic features',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'EUR',
    features: JSON.stringify([
      'Up to 5 active listings',
      'Basic messaging',
      'Community support',
    ]),
    maxListings: 5,
    highlighted: false,
    sortOrder: 0,
  },
  {
    name: 'starter',
    displayName: 'Starter',
    description: 'For active traders looking to grow',
    priceMonthly: 999, // EUR 9.99
    priceYearly: 9590, // EUR 95.90 (save ~20%)
    currency: 'EUR',
    features: JSON.stringify([
      'Up to 25 active listings',
      'Priority messaging',
      'Trade analytics',
      'Email support',
    ]),
    maxListings: 25,
    highlighted: false,
    sortOrder: 1,
  },
  {
    name: 'professional',
    displayName: 'Professional',
    description: 'For power users and businesses',
    priceMonthly: 2499, // EUR 24.99
    priceYearly: 23990, // EUR 239.90 (save ~20%)
    currency: 'EUR',
    features: JSON.stringify([
      'Unlimited listings',
      'Priority messaging',
      'Advanced analytics',
      'Featured listings',
      'Priority support',
    ]),
    maxListings: -1,
    highlighted: true,
    sortOrder: 2,
  },
  {
    name: 'enterprise',
    displayName: 'Enterprise',
    description: 'Custom solutions for large organizations',
    priceMonthly: 9999, // EUR 99.99
    priceYearly: 95990, // EUR 959.90 (save ~20%)
    currency: 'EUR',
    features: JSON.stringify([
      'Everything in Professional',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'White-label options',
    ]),
    maxListings: -1,
    highlighted: false,
    sortOrder: 3,
  },
];

async function seed() {
  console.log('Seeding default plans...');

  for (const plan of defaultPlans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`  - ${plan.displayName} plan seeded`);
  }

  console.log('Seeding complete.');
}

seed()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
