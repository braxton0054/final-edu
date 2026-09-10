import { prisma } from "@mtanda/database";
import PricingCalculator, { type PlanInfo } from "./PricingCalculator";

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
    features: (p.features as string[] | null) ?? null,
  }));

  return (
    <div className="lp">
      <div className="lp-container" style={{ padding: "3rem 1.25rem 4rem" }}>
        <a href="/">← Back home</a>
        <span className="lp-eyebrow">Pricing</span>
        <h1 className="lp-h2">Simple plans that grow with your school</h1>
        <p className="lp-lead">
          Per quarter, per school. Every plan includes a 14-day trial.
          Parent service fees are set by each school, not by us.
        </p>

        <div className="lp-pricing">
          {plans.map((p) => (
            <div key={p.slug} className={p.slug === "pro" ? "lp-plan featured" : "lp-plan"}>
              <h3>{p.name}</h3>
              <p className="price">
                {p.quarterlyPrice === 0 ? "Custom" : `KSh ${p.quarterlyPrice.toLocaleString()}`}
              </p>
              <p style={{ color: "#5b6470", fontSize: "0.9rem" }}>
                per quarter · {p.minStudents.toLocaleString()}–
                {p.maxStudents ? p.maxStudents.toLocaleString() : "+"} students
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

        <PricingCalculator plans={plans} />
      </div>
    </div>
  );
}
