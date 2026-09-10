import { prisma } from "../src/client";

const PLANS = [
  {
    name: "Starter",
    slug: "starter",
    quarterlyPrice: 30000,
    minStudents: 150,
    maxStudents: 250,
    graceStudents: 2,
    trialDays: 90,
    features: ["Parent Portal", "Finance", "M-Pesa", "CBC", "Report Designer"],
    displayOrder: 1,
  },
  {
    name: "Pro",
    slug: "pro",
    quarterlyPrice: 60000,
    minStudents: 301,
    maxStudents: 600,
    graceStudents: 2,
    trialDays: 90,
    features: [
      "Parent Portal",
      "Finance",
      "M-Pesa",
      "CBC",
      "WhatsApp",
      "Report Designer",
      "Custom Domain",
    ],
    displayOrder: 2,
  },
  {
    name: "Premium",
    slug: "premium",
    quarterlyPrice: 110000,
    minStudents: 601,
    maxStudents: 1000,
    graceStudents: 2,
    trialDays: 90,
    features: [
      "Parent Portal",
      "Finance",
      "M-Pesa",
      "CBC",
      "WhatsApp",
      "Report Designer",
      "Custom Domain",
      "Priority Support",
    ],
    displayOrder: 3,
  },
  {
    name: "Custom",
    slug: "custom",
    quarterlyPrice: 0,
    minStudents: 1001,
    maxStudents: null,
    graceStudents: 0,
    trialDays: 90,
    features: ["Negotiated platform fee", "Everything in Premium"],
    displayOrder: 4,
  },
];

async function main() {
  const school = await prisma.school.upsert({
    where: { slug: "demo-school" },
    update: {},
    create: { name: "Demo School", slug: "demo-school", status: "ACTIVE" },
  });
  console.log(`Seeded school: ${school.slug}`);

  for (const plan of PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: { ...plan },
      create: { ...plan },
    });
    console.log(`Seeded plan: ${plan.slug}`);
  }
}

main().finally(() => prisma.$disconnect());
