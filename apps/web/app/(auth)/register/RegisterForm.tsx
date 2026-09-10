"use client";

import { useEffect, useState } from "react";
import SiteLogo from "../../components/SiteLogo";
import { KENYA_COUNTIES, countyByName } from "./kenya-locations";

type Plan = {
  slug: string;
  name: string;
  quarterlyPrice: number;
  minStudents: number;
  maxStudents: number | null;
  features: string[] | null;
};

const STEPS = [
  { title: "Account", hint: "Who is registering" },
  { title: "School", hint: "Institution details" },
  { title: "Location", hint: "Where you are" },
  { title: "CBC Setup", hint: "Levels & calendar" },
  { title: "Branding", hint: "Identity & URL" },
  { title: "Subscription", hint: "Plan & intentions" },
  { title: "Terms", hint: "Review & confirm" },
];

// CBC levels, grouped for display. Kept configurable here so the structure
// can change without code changes elsewhere (Super Admin list coming next).
const LEVEL_GROUPS: { label: string; levels: string[] }[] = [
  { label: "Pre-Primary", levels: ["PP1", "PP2"] },
  { label: "Lower Primary", levels: ["Grade 1", "Grade 2", "Grade 3"] },
  { label: "Upper Primary", levels: ["Grade 4", "Grade 5", "Grade 6"] },
  { label: "Junior School", levels: ["Grade 7", "Grade 8", "Grade 9"] },
  { label: "Senior School", levels: ["Grade 10", "Grade 11", "Grade 12"] },
];

const POSITIONS = [
  "School Owner", "Director", "Headteacher", "Principal",
  "Deputy Headteacher", "School Administrator", "Other",
];
const SCHOOL_TYPES = [
  "Primary School", "Junior School", "Senior School",
  "Primary + Junior School", "Primary + Junior + Senior School", "Other",
];
const OWNERSHIP = ["Private", "Public", "Faith-Based", "Community", "NGO", "Other"];
const CURRICULA = ["CBC", "8-4-4", "International", "Cambridge", "IB", "Other"];

type FormState = {
  firstName: string; lastName: string; phone: string; email: string;
  jobTitle: string; password: string; confirmPassword: string;
  schoolName: string; shortName: string; schoolType: string; ownership: string;
  schoolEmail: string; schoolPhone: string; alternativePhone: string;
  admissionsEmail: string; financeEmail: string; whatsappNumber: string;
  website: string; regNumber: string; knecCode: string; kraPin: string;
  county: string; subCounty: string; ward: string; town: string;
  location: string; address: string; postalAddress: string; postalCode: string;
  curriculum: string; levelsOffered: string[];
  academicYear: string; currentTerm: string;
  termStartDate: string; termEndDate: string;
  estimatedStudents: string; estimatedTeachers: string;
  estimatedClasses: string; estimatedStreams: string;
  motto: string; description: string;
  primaryColor: string; secondaryColor: string;
  reportCardPreference: string; studentIdFormat: string; admissionPrefix: string;
  subdomain: string;
  planSlug: string;
  feesChoice: string; mpesaChoice: string; emailChoice: string; whatsappChoice: string;
  acceptTerms: boolean; acceptPrivacy: boolean;
  authorizedConfirm: boolean; accuracyConfirm: boolean;
};

const EMPTY: FormState = {
  firstName: "", lastName: "", phone: "", email: "",
  jobTitle: "School Administrator", password: "", confirmPassword: "",
  schoolName: "", shortName: "", schoolType: "", ownership: "",
  schoolEmail: "", schoolPhone: "", alternativePhone: "",
  admissionsEmail: "", financeEmail: "", whatsappNumber: "",
  website: "", regNumber: "", knecCode: "", kraPin: "",
  county: "", subCounty: "", ward: "", town: "",
  location: "", address: "", postalAddress: "", postalCode: "",
  curriculum: "CBC", levelsOffered: [],
  academicYear: "2026", currentTerm: "Term 3",
  termStartDate: "", termEndDate: "",
  estimatedStudents: "", estimatedTeachers: "",
  estimatedClasses: "", estimatedStreams: "",
  motto: "", description: "",
  primaryColor: "#101418", secondaryColor: "#f59e0b",
  reportCardPreference: "default-template", studentIdFormat: "automatic", admissionPrefix: "",
  subdomain: "",
  planSlug: "pro",
  feesChoice: "later", mpesaChoice: "later", emailChoice: "later", whatsappChoice: "not-now",
  acceptTerms: false, acceptPrivacy: false,
  authorizedConfirm: false, accuracyConfirm: false,
};

const STEP_COPY = [
  { h: "Create your account", s: "The person authorized to register this school." },
  { h: "School information", s: "Identity and contacts. Documents can follow later." },
  { h: "Physical location", s: "Where the school operates." },
  { h: "CBC setup", s: "Levels, calendar, and size. Refine everything during onboarding." },
  { h: "Branding", s: "How your school appears on its own portal." },
  { h: "Subscription", s: "Your plan, plus what to configure after registration." },
  { h: "Review and confirm", s: "Check everything, accept the legal terms." },
];

export default function RegisterForm({ initialPlan }: { initialPlan?: string }) {
  const [step, setStep] = useState(0);
  const [maxVisited, setMaxVisited] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [form, setForm] = useState<FormState>({ ...EMPTY, planSlug: initialPlan ?? "pro" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{
    schoolId: string; slug: string; subdomain: string; verifyUrl?: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then(setPlans)
      .catch(() => setPlans([]));
  }, []);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleLevel(level: string) {
    setForm((f) => ({
      ...f,
      levelsOffered: f.levelsOffered.includes(level)
        ? f.levelsOffered.filter((l) => l !== level)
        : [...f.levelsOffered, level],
    }));
  }

  function validateStep(s: number): string | null {
    if (s === 0) {
      if (!form.firstName.trim() || !form.lastName.trim()) return "First and last name are required.";
      if (!form.phone.trim()) return "Phone number is required.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return "Enter a valid email address.";
      if (form.password.length < 8) return "Password must be at least 8 characters.";
      if (form.password !== form.confirmPassword) return "Passwords do not match.";
    }
    if (s === 1) {
      if (!form.schoolName.trim()) return "Official school name is required.";
      if (!form.schoolType) return "Choose the school type.";
      if (!form.ownership) return "Choose the ownership.";
    }
    if (s === 2) {
      if (!form.county) return "Choose the county.";
      if (!form.subCounty.trim()) return "Sub-county is required.";
      if (!form.town.trim()) return "Town / city is required.";
      if (!form.address.trim()) return "Physical address is required.";
    }
    if (s === 3) {
      if (!form.curriculum) return "Choose the curriculum.";
      if (!form.academicYear.trim() || !form.currentTerm.trim())
        return "Academic year and term are required.";
    }
    if (s === 4) {
      if (!form.subdomain.trim()) return "Choose your school URL name.";
    }
    return null;
  }

  function go(target: number) {
    if (target < step) {
      setError(null);
      setStep(target);
      return;
    }
    const problem = validateStep(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep(target);
    setMaxVisited((m) => Math.max(m, target));
  }

  async function submit() {
    if (!form.acceptTerms || !form.acceptPrivacy || !form.authorizedConfirm || !form.accuracyConfirm) {
      setError("Accept the Terms, Privacy Policy, and both confirmations.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/schools/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimatedStudents: Number(form.estimatedStudents) || undefined,
          estimatedTeachers: Number(form.estimatedTeachers) || undefined,
          estimatedClasses: Number(form.estimatedClasses) || undefined,
          estimatedStreams: Number(form.estimatedStreams) || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Registration failed.");
      setDone(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  }

  const selectedPlan = plans.find((p) => p.slug === form.planSlug);
  const pct = Math.round(((step + 1) / STEPS.length) * 100);
  const activeCounty = countyByName(form.county);

  // Cascading location: county → sub-counties + towns + postal code.
  function pickCounty(name: string) {
    const county = countyByName(name);
    setForm((f) => ({
      ...f,
      county: name,
      subCounty: "",
      town: "",
      postalCode: county ? county.postal : f.postalCode,
    }));
  }

  return (
    <div className="reg-shell">
      <aside className="reg-rail">
        <div><a href="/" className="back">← Back home</a></div>
        <SiteLogo tone="light" height={44} />
        <ol className="reg-steps">
          {STEPS.map((s, i) => {
            const cls = i === step ? "current" : i <= maxVisited && i !== step ? "done-step" : "";
            const reachable = i <= maxVisited;
            return (
              <li key={s.title}>
                <button type="button" className={cls} disabled={!reachable}
                  onClick={() => reachable && go(i)} aria-current={i === step ? "step" : undefined}>
                  <span className="reg-dot">{i < step ? "✓" : i + 1}</span>
                  <span className="reg-step-text">{s.title}<small>{s.hint}</small></span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="reg-rail-foot">
          <p>Stuck? Talk to us.</p>
          <p><a href="mailto:mtandaolabs@gmail.com">mtandaolabs@gmail.com</a><br />
          <a href="tel:+254728249135">+254 728 249135</a></p>
        </div>
      </aside>

      <main className="reg-main">
        <div className="reg-card">
          {!done ? (
            <>
              <div className="reg-progress"><span style={{ width: `${pct}%` }} /></div>
              <div className="reg-kicker">Step {step + 1} of {STEPS.length}</div>
              <h1>{STEP_COPY[step].h}</h1>
              <p className="reg-sub">{STEP_COPY[step].s}</p>

              {step === 0 && (
                <>
                  <div className="reg-pair">
                    <label className="reg-field"><span>First name *</span>
                      <input className="reg-input" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" /></label>
                    <label className="reg-field"><span>Last name *</span>
                      <input className="reg-input" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" /></label>
                  </div>
                  <div className="reg-pair">
                    <label className="reg-field"><span>Email address *</span>
                      <input className="reg-input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" /></label>
                    <label className="reg-field"><span>Phone number *</span>
                      <input className="reg-input" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="07XX XXX XXX" autoComplete="tel" /></label>
                  </div>
                  <label className="reg-field"><span>Position *</span>
                    <select className="reg-select" value={form.jobTitle} onChange={(e) => set("jobTitle", e.target.value)}>
                      {POSITIONS.map((t) => <option key={t}>{t}</option>)}
                    </select></label>
                  <div className="reg-pair">
                    <label className="reg-field"><span>Password *</span>
                      <input className="reg-input" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" /></label>
                    <label className="reg-field"><span>Confirm password *</span>
                      <input className="reg-input" type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} autoComplete="new-password" /></label>
                  </div>
                </>
              )}

              {step === 1 && (
                <>
                  <label className="reg-field"><span>Official school name *</span>
                    <input className="reg-input" value={form.schoolName} onChange={(e) => set("schoolName", e.target.value)} placeholder="e.g. Green Valley Academy" /></label>
                  <label className="reg-field"><span>Short school name</span>
                    <input className="reg-input" value={form.shortName} onChange={(e) => set("shortName", e.target.value)} placeholder="e.g. Green Valley" /></label>
                  <div className="reg-field"><span>School type *</span>
                    <div className="reg-radio-cards">
                      {SCHOOL_TYPES.map((t) => (
                        <div key={t} className={form.schoolType === t ? "reg-radio-card on" : "reg-radio-card"} onClick={() => set("schoolType", t)}><strong>{t}</strong></div>
                      ))}
                    </div></div>
                  <div className="reg-field"><span>Ownership *</span>
                    <div className="reg-radio-cards">
                      {OWNERSHIP.map((t) => (
                        <div key={t} className={form.ownership === t ? "reg-radio-card on" : "reg-radio-card"} onClick={() => set("ownership", t)}><strong>{t}</strong></div>
                      ))}
                    </div></div>
                  <div className="reg-pair">
                    <label className="reg-field"><span>School email *</span>
                      <input className="reg-input" type="email" value={form.schoolEmail} onChange={(e) => set("schoolEmail", e.target.value)} placeholder="Defaults to your email" /></label>
                    <label className="reg-field"><span>School phone *</span>
                      <input className="reg-input" value={form.schoolPhone} onChange={(e) => set("schoolPhone", e.target.value)} /></label>
                  </div>
                  <div className="reg-pair">
                    <label className="reg-field"><span>Alternative phone</span>
                      <input className="reg-input" value={form.alternativePhone} onChange={(e) => set("alternativePhone", e.target.value)} /></label>
                    <label className="reg-field"><span>School WhatsApp number</span>
                      <input className="reg-input" value={form.whatsappNumber} onChange={(e) => set("whatsappNumber", e.target.value)} /></label>
                  </div>
                  <div className="reg-pair">
                    <label className="reg-field"><span>Admissions email</span>
                      <input className="reg-input" type="email" value={form.admissionsEmail} onChange={(e) => set("admissionsEmail", e.target.value)} /></label>
                    <label className="reg-field"><span>Finance email</span>
                      <input className="reg-input" type="email" value={form.financeEmail} onChange={(e) => set("financeEmail", e.target.value)} /></label>
                  </div>
                  <label className="reg-field"><span>School website</span>
                    <input className="reg-input" value={form.website} onChange={(e) => set("website", e.target.value)} placeholder="https://…" /></label>
                  <div className="reg-pair">
                    <label className="reg-field"><span>Registration number <small>(optional)</small></span>
                      <input className="reg-input" value={form.regNumber} onChange={(e) => set("regNumber", e.target.value)} /></label>
                    <label className="reg-field"><span>KNEC code <small>(if applicable)</small></span>
                      <input className="reg-input" value={form.knecCode} onChange={(e) => set("knecCode", e.target.value)} /></label>
                  </div>
                  <label className="reg-field"><span>KRA PIN <small>(if applicable)</small></span>
                    <input className="reg-input" value={form.kraPin} onChange={(e) => set("kraPin", e.target.value)} /></label>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="reg-pair">
                    <label className="reg-field"><span>County *</span>
                      <select className="reg-select" value={form.county} onChange={(e) => pickCounty(e.target.value)}>
                        <option value="">— choose county —</option>
                        {KENYA_COUNTIES.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                      </select></label>
                    <label className="reg-field"><span>Sub-county *</span>
                      <select className="reg-select" value={form.subCounty}
                        onChange={(e) => set("subCounty", e.target.value)}
                        disabled={!activeCounty}>
                        <option value="">{activeCounty ? `— ${activeCounty.subs.length} in ${activeCounty.name} —` : "— pick a county first —"}</option>
                        {activeCounty?.subs.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select></label>
                  </div>
                  <div className="reg-pair">
                    <label className="reg-field"><span>Ward</span>
                      <input className="reg-input" value={form.ward} onChange={(e) => set("ward", e.target.value)} /></label>
                    <label className="reg-field"><span>Town / city *</span>
                      <input className="reg-input" value={form.town} onChange={(e) => set("town", e.target.value)}
                        list="county-towns" placeholder={activeCounty ? `e.g. ${activeCounty.towns[0]}` : ""} />
                      <datalist id="county-towns">
                        {activeCounty?.towns.map((t) => <option key={t} value={t} />)}
                      </datalist></label>
                  </div>
                  <label className="reg-field"><span>Location</span>
                    <input className="reg-input" value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Area / estate / village" /></label>
                  <label className="reg-field"><span>Physical address *</span>
                    <input className="reg-input" value={form.address} onChange={(e) => set("address", e.target.value)} /></label>
                  <div className="reg-pair">
                    <label className="reg-field"><span>Postal address</span>
                      <input className="reg-input" value={form.postalAddress} onChange={(e) => set("postalAddress", e.target.value)} placeholder="P.O. Box …" /></label>
                    <label className="reg-field"><span>Postal code <small>(auto-filled, editable)</small></span>
                      <input className="reg-input" value={form.postalCode} onChange={(e) => set("postalCode", e.target.value)} placeholder="e.g. 20100" /></label>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="reg-field"><span>Curriculum *</span>
                    <div className="reg-radio-cards">
                      {CURRICULA.map((c) => (
                        <div key={c} className={form.curriculum === c ? "reg-radio-card on" : "reg-radio-card"} onClick={() => set("curriculum", c)}><strong>{c}</strong></div>
                      ))}
                    </div></div>
                  {LEVEL_GROUPS.map((g) => (
                    <div className="reg-field" key={g.label}><span>{g.label}</span>
                      <div className="reg-checks">
                        {g.levels.map((l) => (
                          <span key={l} className={form.levelsOffered.includes(l) ? "reg-chip on" : "reg-chip"} onClick={() => toggleLevel(l)}>{l}</span>
                        ))}
                      </div></div>
                  ))}
                  <div className="reg-pair">
                    <label className="reg-field"><span>Academic year *</span>
                      <input className="reg-input" value={form.academicYear} onChange={(e) => set("academicYear", e.target.value)} /></label>
                    <label className="reg-field"><span>Current term *</span>
                      <input className="reg-input" value={form.currentTerm} onChange={(e) => set("currentTerm", e.target.value)} /></label>
                  </div>
                  <div className="reg-pair">
                    <label className="reg-field"><span>Term start date</span>
                      <input className="reg-input" type="date" value={form.termStartDate} onChange={(e) => set("termStartDate", e.target.value)} /></label>
                    <label className="reg-field"><span>Term end date</span>
                      <input className="reg-input" type="date" value={form.termEndDate} onChange={(e) => set("termEndDate", e.target.value)} /></label>
                  </div>
                  <div className="reg-pair">
                    <label className="reg-field"><span>Number of students *</span>
                      <input className="reg-input" type="number" min={0} value={form.estimatedStudents} onChange={(e) => set("estimatedStudents", e.target.value)} /></label>
                    <label className="reg-field"><span>Number of teachers *</span>
                      <input className="reg-input" type="number" min={0} value={form.estimatedTeachers} onChange={(e) => set("estimatedTeachers", e.target.value)} /></label>
                  </div>
                  <div className="reg-pair">
                    <label className="reg-field"><span>Number of classes *</span>
                      <input className="reg-input" type="number" min={0} value={form.estimatedClasses} onChange={(e) => set("estimatedClasses", e.target.value)} /></label>
                    <label className="reg-field"><span>Number of streams *</span>
                      <input className="reg-input" type="number" min={0} value={form.estimatedStreams} onChange={(e) => set("estimatedStreams", e.target.value)} /></label>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div className="reg-pair">
                    <label className="reg-field"><span>School motto</span>
                      <input className="reg-input" value={form.motto} onChange={(e) => set("motto", e.target.value)} /></label>
                    <label className="reg-field"><span>Primary colour</span>
                      <input className="reg-input" type="color" value={form.primaryColor} onChange={(e) => set("primaryColor", e.target.value)} /></label>
                  </div>
                  <div className="reg-pair">
                    <label className="reg-field"><span>Secondary colour</span>
                      <input className="reg-input" type="color" value={form.secondaryColor} onChange={(e) => set("secondaryColor", e.target.value)} /></label>
                    <label className="reg-field"><span>School URL *</span>
                      <span style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                        <input className="reg-input" value={form.subdomain} onChange={(e) => set("subdomain", e.target.value)} placeholder="greenvalleyacademy" style={{ maxWidth: 280 }} />
                        <small style={{ color: "var(--muted)" }}>.mtandaolabsedu.com</small>
                      </span></label>
                  </div>
                  <label className="reg-field"><span>School description</span>
                    <input className="reg-input" value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
                  <div className="reg-field"><span>Report card preference</span>
                    <div className="reg-radio-cards">
                      <div className={form.reportCardPreference === "default-template" ? "reg-radio-card on" : "reg-radio-card"} onClick={() => set("reportCardPreference", "default-template")}>
                        <strong>Use MtandaoLabsEdu default</strong><small>Start fast, customize later</small>
                      </div>
                      <div className={form.reportCardPreference === "custom-later" ? "reg-radio-card on" : "reg-radio-card"} onClick={() => set("reportCardPreference", "custom-later")}>
                        <strong>Configure my own later</strong><small>Template designer after signup</small>
                      </div>
                    </div></div>
                  <div className="reg-field"><span>Student ID format</span>
                    <div className="reg-radio-cards">
                      <div className={form.studentIdFormat === "automatic" ? "reg-radio-card on" : "reg-radio-card"} onClick={() => set("studentIdFormat", "automatic")}>
                        <strong>Automatic</strong><small>System generates IDs</small>
                      </div>
                      <div className={form.studentIdFormat === "school-defined" ? "reg-radio-card on" : "reg-radio-card"} onClick={() => set("studentIdFormat", "school-defined")}>
                        <strong>School-defined</strong><small>Your prefix + sequence</small>
                      </div>
                    </div></div>
                  {form.studentIdFormat === "school-defined" && (
                    <label className="reg-field"><span>Admission number prefix</span>
                      <input className="reg-input" value={form.admissionPrefix} onChange={(e) => set("admissionPrefix", e.target.value)} placeholder="GVA → GVA-0001" style={{ maxWidth: 200 }} /></label>
                  )}
                  <p className="reg-sub"><small>Logo upload, favicon, and custom domains come after registration, in Settings.</small></p>
                </>
              )}

              {step === 5 && (
                <>
                  <div className="reg-field"><span>Selected plan</span>
                    <div className="reg-radio-cards">
                      {plans.map((p) => (
                        <div key={p.slug} className={form.planSlug === p.slug ? "reg-radio-card on" : "reg-radio-card"} onClick={() => set("planSlug", p.slug)}>
                          <strong>{p.name}</strong>
                          <small>{p.quarterlyPrice === 0 ? "Custom pricing" : `KSh ${p.quarterlyPrice.toLocaleString()}/3 months`} · {p.minStudents}–{p.maxStudents ?? "+"} students</small>
                        </div>
                      ))}
                    </div></div>
                  <div className="reg-pair">
                    <div className="reg-field"><span>Fees via MtandaoLabsEdu?</span>
                      <div className="reg-checks">
                        {(["yes", "later"] as const).map((v) => (
                          <span key={v} className={form.feesChoice === v ? "reg-chip on" : "reg-chip"} onClick={() => set("feesChoice", v)}>{v === "yes" ? "Yes" : "Later"}</span>
                        ))}
                      </div></div>
                    <div className="reg-field"><span>M-Pesa payments?</span>
                      <div className="reg-checks">
                        {(["later", "no"] as const).map((v) => (
                          <span key={v} className={form.mpesaChoice === v ? "reg-chip on" : "reg-chip"} onClick={() => set("mpesaChoice", v)}>{v === "later" ? "Yes, configure later" : "No"}</span>
                        ))}
                      </div></div>
                  </div>
                  <div className="reg-pair">
                    <div className="reg-field"><span>School email provider?</span>
                      <div className="reg-checks">
                        {([["later", "Configure later"], ["platform", "Use MtandaoLabsEdu"], ["own", "Use my own"]] as const).map(([v, label]) => (
                          <span key={v} className={form.emailChoice === v ? "reg-chip on" : "reg-chip"} onClick={() => set("emailChoice", v)}>{label}</span>
                        ))}
                      </div></div>
                    <div className="reg-field"><span>WhatsApp notifications?</span>
                      <div className="reg-checks">
                        {(["later", "not-now"] as const).map((v) => (
                          <span key={v} className={form.whatsappChoice === v ? "reg-chip on" : "reg-chip"} onClick={() => set("whatsappChoice", v)}>{v === "later" ? "Enable later" : "Not now"}</span>
                        ))}
                      </div></div>
                  </div>
                  <p className="reg-sub"><small>Credentials for M-Pesa, email, and WhatsApp are entered later under Settings → Integrations — never at signup.</small></p>
                </>
              )}

              {step === 6 && (
                <>
                  <div className="reg-field"><span>Review your details</span>
                    <div className="reg-review">
                      <div className="reg-review-row"><span>Administrator</span><span>{form.firstName} {form.lastName} · {form.jobTitle}</span></div>
                      <div className="reg-review-row"><span>Contact</span><span>{form.email} · {form.phone}</span></div>
                      <div className="reg-review-row"><span>School</span><span>{form.schoolName} · {form.schoolType} · {form.ownership}</span></div>
                      <div className="reg-review-row"><span>Location</span><span>{form.town}, {form.subCounty}, {form.county}</span></div>
                      <div className="reg-review-row"><span>Academics</span><span>{form.curriculum} · {form.levelsOffered.length} levels · {form.academicYear} · {form.currentTerm}</span></div>
                      <div className="reg-review-row"><span>School URL</span><span>{form.subdomain || "—"}.mtandaolabsedu.com</span></div>
                      <div className="reg-review-row"><span>Plan</span><span>{selectedPlan ? `${selectedPlan.name} — KSh ${selectedPlan.quarterlyPrice.toLocaleString()}/3 months` : form.planSlug}</span></div>
                    </div></div>
                  <label className="reg-legal"><input type="checkbox" checked={form.authorizedConfirm} onChange={(e) => set("authorizedConfirm", e.target.checked)} /> I confirm that I am authorized to register this school *</label>
                  <label className="reg-legal"><input type="checkbox" checked={form.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)} /> I agree to the Terms of Service *</label>
                  <label className="reg-legal"><input type="checkbox" checked={form.acceptPrivacy} onChange={(e) => set("acceptPrivacy", e.target.checked)} /> I have read the Privacy Policy *</label>
                  <label className="reg-legal"><input type="checkbox" checked={form.accuracyConfirm} onChange={(e) => set("accuracyConfirm", e.target.checked)} /> I confirm that the information provided is accurate *</label>
                </>
              )}

              {error && <div className="reg-error">{error}</div>}

              <div className="reg-actions">
                <div>{step > 0 && <button type="button" className="reg-btn reg-btn-ghost" onClick={() => go(step - 1)}>← Back</button>}</div>
                {step < STEPS.length - 1
                  ? <button type="button" className="reg-btn reg-btn-primary" onClick={() => go(step + 1)}>Continue →</button>
                  : <button type="button" className="reg-btn reg-btn-primary" onClick={submit} disabled={busy}>{busy ? "Creating school…" : "Create School Account"}</button>}
              </div>
            </>
          ) : (
            <div className="reg-success">
              <div className="reg-kicker">Registration complete</div>
              <h1>Verify your email</h1>
              <p className="reg-sub"><strong>{form.schoolName}</strong> is registered and pending verification.</p>
              <div className="reg-success-box">
                <p style={{ marginTop: 0 }}>A verification link was sent to <strong>{form.email}</strong>. Email verification is required before the school is activated.</p>
                {done.verifyUrl && <p style={{ marginBottom: 0 }}><small>Development mode — <a href={done.verifyUrl}>verify email now →</a></small></p>}
              </div>
              <div className="reg-actions">
                <span />
                <a href={`/register/payment/${done.schoolId}`} className="reg-btn reg-btn-primary" style={{ textDecoration: "none" }}>Continue to Payment →</a>
              </div>
              <p className="reg-sub" style={{ marginTop: "1rem" }}><small>Super Admin has been notified and will review your school.</small></p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
