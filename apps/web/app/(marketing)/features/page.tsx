import Link from "next/link";
import { prisma } from "@mtanda/database";

type Capability = {
  title: string;
  description: string;
  points: string[];
};

const CAPABILITIES: Capability[] = [
  {
    title: "Student management",
    description:
      "Keep every learner's record in one place, from admission through to graduation.",
    points: [
      "Student profiles, guardians, and contacts",
      "Admissions and enrolment records",
      "Class, stream, and academic history",
      "Documents and notes per student",
    ],
  },
  {
    title: "CBC academics",
    description:
      "Manage the Kenyan competency-based curriculum from structure down to results.",
    points: [
      "Learning areas, subjects, strands, and sub-strands",
      "Learning outcomes and competencies",
      "Formative and summative assessments",
      "Results capture and analysis",
    ],
  },
  {
    title: "Fees & invoicing",
    description:
      "Raise fee invoices and reconcile payments without chasing spreadsheets.",
    points: [
      "Fee structures per level, class, or student",
      "Invoices, receipts, and statements",
      "Payment allocation against the right invoice",
      "Outstanding balances and reports",
    ],
  },
  {
    title: "M-Pesa payments",
    description:
      "Let parents pay from their phone with an STK Push, reconciled automatically.",
    points: [
      "Daraja STK Push initiation",
      "Callback handling and reconciliation",
      "Receipts and payment history",
      "Each school configures its own integration",
    ],
  },
  {
    title: "Parents & communication",
    description:
      "Keep parents informed through the channels they already use.",
    points: [
      "Parent portal with children, fees, and results",
      "WhatsApp messaging with QR-code setup",
      "Email notifications and announcements",
      "Fee reminders and payment confirmations",
    ],
  },
  {
    title: "Report cards",
    description:
      "Produce report cards that match your school's identity and grading.",
    points: [
      "School logo, colours, and information",
      "Academic results and competencies",
      "Teacher comments, attendance, and signatures",
      "Per-school templates",
    ],
  },
];

async function planFeatureNames(): Promise<string[]> {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
      select: { features: true },
    });
    const all = plans.flatMap((p) => (p.features as string[] | null) ?? []);
    return Array.from(new Set(all));
  } catch {
    return [];
  }
}

export default async function FeaturesPage() {
  const planFeatures = await planFeatureNames();

  return (
    <div className="lp">
      <div className="lp-container" style={{ padding: "3rem 1.25rem 4rem" }}>
        <Link href="/">← Back home</Link>
        <div className="lp-center" style={{ marginTop: "2rem" }}>
          <span className="lp-eyebrow">Features</span>
          <h1 className="lp-h2">Everything your school needs in one platform</h1>
          <p className="lp-lead">
            Students, academics, finance, and communication — without the
            spreadsheets and disconnected tools.
          </p>
        </div>

        <div className="lp-grid-3" style={{ textAlign: "left", marginTop: "2.5rem" }}>
          {CAPABILITIES.map((capability) => (
            <div key={capability.title} className="lp-card">
              <h3>{capability.title}</h3>
              <p>{capability.description}</p>
              <ul>
                {capability.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {planFeatures.length > 0 && (
          <div className="lp-center" style={{ marginTop: "3rem" }}>
            <span className="lp-eyebrow">Plan add-ons</span>
            <h2 className="lp-h2">Also available on selected plans</h2>
            <ul className="lp-check-list" style={{ textAlign: "left" }}>
              {planFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="lp-center" style={{ marginTop: "3rem" }}>
          <a href="/register" className="lp-btn lp-btn-accent">
            Get Started
          </a>
          <a
            href="/pricing"
            className="lp-btn lp-btn-outline"
            style={{ marginLeft: "0.75rem" }}
          >
            See Pricing
          </a>
        </div>
      </div>
    </div>
  );
}
