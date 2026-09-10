"use client";

import { useMemo, useState } from "react";

export type PlanInfo = {
  slug: string;
  name: string;
  quarterlyPrice: number;
  minStudents: number;
  maxStudents: number | null;
  features: string[] | null;
};

function planFor(students: number, plans: PlanInfo[]): PlanInfo {
  for (const p of plans) {
    if (p.maxStudents === null) {
      if (students >= p.minStudents) return p;
    } else if (students >= p.minStudents && students <= p.maxStudents) {
      return p;
    }
  }
  return plans[0];
}

export default function PricingCalculator({ plans }: { plans: PlanInfo[] }) {
  const [students, setStudents] = useState(250);
  const [parentFee, setParentFee] = useState(300);
  const calc = useMemo(() => {
    const plan = planFor(students, plans);
    const monthly = students * parentFee;
    const quarterly = monthly * 3;
    return { plan, monthly, quarterly, retains: quarterly - plan.quarterlyPrice };
  }, [students, parentFee, plans]);

  return (
    <div className="lp-showcase" style={{ marginTop: "2rem" }}>
      <h3>Estimate your school&apos;s numbers</h3>
      <label>
        Students: <strong>{students}</strong>
        <input
          type="range"
          min={50}
          max={1200}
          step={10}
          value={students}
          onChange={(e) => setStudents(Number(e.target.value))}
          style={{ width: "100%" }}
        />
      </label>
      <label>
        Your parent fee (KSh/month per student):{" "}
        <input
          type="number"
          min={0}
          step={50}
          value={parentFee}
          onChange={(e) => setParentFee(Math.max(0, Number(e.target.value) || 0))}
          style={{ width: "8rem", padding: "0.4rem 0.6rem", borderRadius: 8, border: "1px solid var(--line)" }}
        />
      </label>
      <div className="lp-report-body" style={{ padding: "1rem 0 0" }}>
        <div className="lp-report-row">
          <span>Suggested plan</span>
          <span>{calc.plan.name}</span>
        </div>
        <div className="lp-report-row">
          <span>Parent service fees ({students} × KSh {parentFee.toLocaleString()}/month)</span>
          <span>KSh {calc.monthly.toLocaleString()}/month</span>
        </div>
        <div className="lp-report-row">
          <span>Estimated quarterly collection</span>
          <span>KSh {calc.quarterly.toLocaleString()}</span>
        </div>
        <div className="lp-report-row">
          <span>MtandaoLabsEdu ({calc.plan.name})</span>
          <span>KSh {calc.plan.quarterlyPrice.toLocaleString()}/quarter</span>
        </div>
        <div className="lp-report-row">
          <span>School retains*</span>
          <span>KSh {calc.retains.toLocaleString()}/quarter</span>
        </div>
      </div>
      <p>
        <small>* Illustrative calculation using your own parent fee — not a guaranteed income.</small>
      </p>
    </div>
  );
}
