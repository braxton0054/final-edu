import Link from "next/link";
import { prisma } from "@mtanda/database";

type PlanInfo = {
  slug: string;
  name: string;
  quarterlyPrice: number;
  minStudents: number;
  maxStudents: number | null;
  trialDays: number;
  features: string[] | null;
};

// Live plan prices — never prerender.
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const dbPlans = await prisma.subscriptionPlan.findMany({
    where: { active: true },
    orderBy: { displayOrder: "asc" },
  });
  const plans: PlanInfo[] = dbPlans.map((p) => ({
    slug: p.slug,
    name: p.name,
    quarterlyPrice: Number(p.quarterlyPrice),
    minStudents: p.minStudents,
    maxStudents: p.maxStudents,
    trialDays: p.trialDays,
    features: (p.features as string[] | null) ?? null,
  }));

  return (
    <div className="lp">
      <div className="lp-container" style={{ padding: "3rem 1.25rem 4rem" }}>
        <Link href="/">← Back home</Link>
        <span className="lp-eyebrow">Pricing</span>
        <h1 className="lp-h2">Simple plans that grow with your school</h1>
        <p className="lp-lead">
          Per 3 months, per school. Every plan includes a 3-month free trial.
        </p>

        <div className="lp-pricing">
          {plans.map((p) => (
            <div key={p.slug} className={p.slug === "pro" ? "lp-plan featured" : "lp-plan"}>
              <h3>{p.name}</h3>
              <p className="price">
                {p.quarterlyPrice === 0 ? "Custom" : `KSh ${p.quarterlyPrice.toLocaleString()}`}
              </p>
              <p style={{ color: "#5b6470", fontSize: "0.9rem" }}>
                per 3 months · {p.minStudents.toLocaleString()}–
                {p.maxStudents ? p.maxStudents.toLocaleString() : "+"} students
              </p>
              <p style={{ color: "var(--brand-accent-dark)", fontSize: "0.9rem", fontWeight: 700 }}>
                {p.trialDays}-day free trial included
              </p>
              <ul>
                {(p.features ?? []).map((f) => (
                  <li key={f}>{f} ✓</li>
                ))}
              </ul>
              <a
                href={p.slug === "custom" ? "/contact" : `/register?plan=${p.slug}`}
                className={p.slug === "pro" ? "lp-btn lp-btn-dark lp-center" : "lp-btn lp-btn-outline lp-center"}
              >
                {p.slug === "custom" ? "Contact Sales" : "Get Started"}
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
