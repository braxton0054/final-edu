import Link from "next/link";
import SiteLogo from "../components/SiteLogo";
import ThemeToggle from "../components/ThemeToggle";
import { prisma } from "@mtanda/database";

async function trialDays(): Promise<number> {
  try {
    const plans = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      select: { trialDays: true },
    });
    if (plans.length === 0) return 90;
    return Math.min(...plans.map((p) => p.trialDays));
  } catch {
    return 90; // build-time fallback (no DB while prerendering)
  }
}

type HomePlan = {
  slug: string;
  name: string;
  price: number; // quarterly KES; 0 means custom pricing
  maxStudents: number | null;
  features: string[];
};

// Mirrors packages/database/prisma/seed.ts so the page still renders real
// figures when the database is unavailable at build time.
const FALLBACK_PLANS: HomePlan[] = [
  {
    slug: "starter",
    name: "Starter",
    price: 30000,
    maxStudents: 250,
    features: ["Parent Portal", "Finance", "M-Pesa", "CBC", "Report Designer"],
  },
  {
    slug: "pro",
    name: "Pro",
    price: 60000,
    maxStudents: 600,
    features: [
      "Parent Portal",
      "Finance",
      "M-Pesa",
      "CBC",
      "WhatsApp",
      "Report Designer",
      "Custom Domain",
    ],
  },
  {
    slug: "custom",
    name: "Custom",
    price: 0,
    maxStudents: null,
    features: ["Negotiated platform fee", "Everything in Premium"],
  },
];

async function headlinePlans(): Promise<HomePlan[]> {
  try {
    const rows = await prisma.subscriptionPlan.findMany({
      where: { active: true },
      orderBy: { displayOrder: "asc" },
    });
    if (rows.length < 3) return FALLBACK_PLANS;
    const mapped: HomePlan[] = rows.map((p) => ({
      slug: p.slug,
      name: p.name,
      price: Number(p.quarterlyPrice),
      maxStudents: p.maxStudents,
      features: (p.features as string[] | null) ?? [],
    }));
    // Headline the entry tier, the recommended tier, and the custom tier.
    return [mapped[0], mapped[1], mapped[mapped.length - 1]];
  } catch {
    return FALLBACK_PLANS;
  }
}

export default async function MarketingHome() {
  const [trial, plans] = await Promise.all([trialDays(), headlinePlans()]);
  return (
    <div className="lp">
      {/* ---------- Nav ---------- */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <Link href="/" aria-label="MtandaoLabs home">
            <SiteLogo />
          </Link>
          <nav className="lp-links">
            <a href="#features">Features</a>
            <a href="#solutions">Solutions</a>
            <a href="#cbc">CBC</a>
            <a href="#pricing">Pricing</a>
            <a href="#contact">Contact</a>
            <ThemeToggle />
            <a href="/login">Login</a>
            <a href="/register" className="lp-btn lp-btn-accent lp-btn-sm">
              Get Started
            </a>
          </nav>
        </div>
      </header>

      {/* ---------- 1. Hero ---------- */}
      <section className="lp-hero">
        <div className="lp-hero-mark" aria-hidden="true" />
        <div className="lp-container lp-hero-content">
          <h1>
            RUN YOUR SCHOOL <span className="accent">SMARTER</span>.
          </h1>
          <p>
            A complete school management platform for modern schools — students,
            CBC academics, fees with M-Pesa, parents, and communication in one
            place.
          </p>
          <div className="lp-hero-cta">
            <a href="/register" className="lp-btn lp-btn-accent">
              Get Started
            </a>
            <a href="#contact" className="lp-btn lp-btn-outline">
              Book a Demo
            </a>
          </div>
          <div className="lp-preview">
            <div className="lp-preview-bar">
              <span />
              <span />
              <span />
            </div>
            <div className="lp-preview-grid">
              <div className="lp-preview-card students">
                <strong>Students</strong>
                <small>Admission → graduation</small>
              </div>
              <div className="lp-preview-card fees">
                <strong>Fees</strong>
                <small>Invoices &amp; M-Pesa</small>
              </div>
              <div className="lp-preview-card">
                <strong>Results</strong>
                <small>Assessments &amp; CBC</small>
              </div>
              <div className="lp-preview-card">
                <strong>CBC</strong>
                <small>Strands &amp; competencies</small>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 2. Why schools choose it ---------- */}
      <section className="lp-section">
        <div className="lp-container">
          <p className="lp-center lp-lead" style={{ paddingTop: "2.5rem" }}>
            Built for Kenyan schools — from admission to results.
          </p>
          <div className="lp-grid-3">
            <div className="lp-card">
              <h3>One place for everything</h3>
              <p>
                Students, academics, fees, and communication without
                spreadsheets or disconnected tools.
              </p>
            </div>
            <div className="lp-card">
              <h3>Payments that reconcile</h3>
              <p>
                Fee invoices, M-Pesa STK Push, receipts, and statements update
                against the right student automatically.
              </p>
            </div>
            <div className="lp-card">
              <h3>Ready for CBC</h3>
              <p>
                Mapped for learning areas, strands, sub-strands, and
                competency-based assessment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 3. What it does ---------- */}
      <section id="features" className="lp-section lp-section-soft">
        <div className="lp-container lp-center">
          <span className="lp-eyebrow">Platform</span>
          <h2 className="lp-h2">Everything your school needs. One platform.</h2>
          <ul className="lp-check-list" style={{ textAlign: "left" }}>
            <li>Student Management</li>
            <li>CBC Academic Management</li>
            <li>Attendance</li>
            <li>Assessments &amp; Results</li>
            <li>Fees &amp; Invoicing</li>
            <li>M-Pesa STK Push</li>
            <li>Parent Portal</li>
            <li>WhatsApp Communication</li>
            <li>Email Communication</li>
            <li>Report Cards</li>
            <li>Admissions</li>
            <li>School Reports</li>
          </ul>
        </div>
      </section>

      {/* ---------- 4. Feature showcase ---------- */}
      <section id="solutions" className="lp-section">
        <div className="lp-container">
          <div className="lp-center">
            <span className="lp-eyebrow">Solutions</span>
            <h2 className="lp-h2">Built for how schools actually work</h2>
          </div>

          <div className="lp-showcase">
            <h3>Student Management</h3>
            <p className="lp-lead">
              Manage your students from admission to graduation — profiles,
              guardians, academics, attendance, fees, and documents in one
              record.
            </p>
            <a href="/register" className="lp-btn lp-btn-dark lp-btn-sm">
              View Students
            </a>
          </div>

          <div className="lp-grid-2">
            <div className="lp-showcase">
              <h3>Academic Management</h3>
              <div className="lp-flow">
                <span>Classes</span>
                <span>Streams</span>
                <span>Learning Areas</span>
                <span>Subjects</span>
                <span>CBC</span>
                <span>Assessments</span>
                <span>Results</span>
              </div>
            </div>
            <div className="lp-showcase">
              <h3>Finance</h3>
              <div className="lp-flow">
                <span>Fee Structure</span>
                <span className="arrow">↓</span>
                <span>Invoice</span>
                <span className="arrow">↓</span>
                <span>M-Pesa STK Push</span>
                <span className="arrow">↓</span>
                <span>Payment</span>
                <span className="arrow">↓</span>
                <span>Receipt</span>
                <span className="arrow">↓</span>
                <span>Statement</span>
              </div>
            </div>
          </div>

          <div className="lp-showcase">
            <h3>Parent Portal</h3>
            <p className="lp-lead">Parents can:</p>
            <ul className="lp-check-list">
              <li>View children</li>
              <li>View fees</li>
              <li>Pay fees</li>
              <li>View receipts</li>
              <li>View results</li>
              <li>Download report cards</li>
              <li>View assignments</li>
              <li>Receive announcements</li>
            </ul>
          </div>
        </div>
      </section>

      {/* ---------- 5. M-Pesa ---------- */}
      <section className="lp-section lp-band-dark">
        <div className="lp-container lp-center">
          <span className="lp-eyebrow">Fees &amp; Payments</span>
          <h2 className="lp-h2" style={{ color: "#fff" }}>
            Get paid directly through M-Pesa
          </h2>
          <p className="lp-lead">
            Create invoices. Send an STK Push. Receive payment. Automatically
            reconcile the payment — each school configures its own payment
            integration from its dashboard.
          </p>
          <div className="lp-steps" style={{ textAlign: "left" }}>
            <div>
              <strong>1. Invoice</strong>
              <p>Generate fee invoices per student or class.</p>
            </div>
            <div>
              <strong>2. STK Push</strong>
              <p>Prompt the parent&apos;s phone to pay instantly.</p>
            </div>
            <div>
              <strong>3. Receive</strong>
              <p>Payments land against the right invoice.</p>
            </div>
            <div>
              <strong>4. Reconcile</strong>
              <p>Receipts and statements update automatically.</p>
            </div>
          </div>
          <p style={{ marginTop: "2rem" }}>
            <a href="#pricing" className="lp-btn lp-btn-white">
              Learn More
            </a>
          </p>
        </div>
      </section>

      {/* ---------- 6. Report card designer ---------- */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-grid-2">
            <div>
              <span className="lp-eyebrow">Report Cards</span>
              <h2 className="lp-h2">Your school. Your report card.</h2>
              <p className="lp-lead">
                Design report cards that match your school&apos;s identity —
                logo, colors, school information, academic results,
                competencies, comments, attendance, signatures, and footer.
              </p>
              <a href="/register" className="lp-btn lp-btn-accent">
                Explore Report Cards
              </a>
            </div>
            <div className="lp-report-mock">
              <div className="lp-report-head">
                <strong>Sample Primary School</strong>
                <small>Term Report Card — Grade 5</small>
              </div>
              <div className="lp-report-body">
                <div className="lp-report-row">
                  <span>Mathematics</span>
                  <span>Exceeding</span>
                </div>
                <div className="lp-report-row">
                  <span>English</span>
                  <span>Meeting</span>
                </div>
                <div className="lp-report-row">
                  <span>Science</span>
                  <span>Meeting</span>
                </div>
                <div className="lp-report-row">
                  <span>Attendance</span>
                  <span>96%</span>
                </div>
                <div className="lp-report-row">
                  <span>Class teacher&apos;s comment</span>
                  <span>Great progress</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 7. WhatsApp + Email ---------- */}
      <section className="lp-section lp-section-soft">
        <div className="lp-container lp-center">
          <span className="lp-eyebrow">Communication</span>
          <h2 className="lp-h2">Keep parents connected</h2>
          <p className="lp-lead">
            WhatsApp built in — connect the school&apos;s number by scanning a
            QR code. Email and in-app notifications included.
          </p>
          <div className="lp-grid-3" style={{ textAlign: "left" }}>
            <div className="lp-card">
              <h3>WhatsApp</h3>
              <p>Fee reminders, payment confirmations, and announcements.</p>
            </div>
            <div className="lp-card">
              <h3>Email</h3>
              <p>Results, admission letters, statements, and newsletters.</p>
            </div>
            <div className="lp-card">
              <h3>Notifications</h3>
              <p>Assignment and attendance alerts to parents instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 8. CBC ---------- */}
      <section id="cbc" className="lp-section">
        <div className="lp-container lp-center">
          <span className="lp-eyebrow">CBC / Academics</span>
          <h2 className="lp-h2">Built for competency-based learning</h2>
          <p className="lp-lead">
            Support for Kenyan CBC/CBA workflows — manage your academic
            structure from curriculum down to results. (MtandaoLabsEdu is not
            an official KICD or KNEC system.)
          </p>
          <div className="lp-flow" style={{ justifyContent: "center" }}>
            <span>Curriculum</span>
            <span className="arrow">↓</span>
            <span>Learning Areas</span>
            <span className="arrow">↓</span>
            <span>Subjects</span>
            <span className="arrow">↓</span>
            <span>Strands</span>
            <span className="arrow">↓</span>
            <span>Sub-Strands</span>
            <span className="arrow">↓</span>
            <span>Learning Outcomes</span>
            <span className="arrow">↓</span>
            <span>Competencies</span>
            <span className="arrow">↓</span>
            <span>Assessments</span>
            <span className="arrow">↓</span>
            <span>Results</span>
          </div>
        </div>
      </section>

      {/* ---------- 9. Multi-school SaaS ---------- */}
      <section className="lp-section lp-section-soft">
        <div className="lp-container lp-center">
          <span className="lp-eyebrow">Multi-school platform</span>
          <h2 className="lp-h2">One platform. Your school&apos;s own environment.</h2>
          <p className="lp-lead">Every school gets:</p>
          <ul className="lp-check-list" style={{ textAlign: "left" }}>
            <li>Its own dashboard</li>
            <li>Its own branding</li>
            <li>Its own domain/subdomain</li>
            <li>Its own students</li>
            <li>Its own teachers</li>
            <li>Its own parents</li>
            <li>Its own report-card templates</li>
            <li>Its own M-Pesa configuration</li>
            <li>Its own email configuration</li>
            <li>Its own WhatsApp number</li>
          </ul>
        </div>
      </section>

      {/* ---------- 10. Pricing ---------- */}
      <section id="pricing" className="lp-section">
        <div className="lp-container">
          <div className="lp-center">
            <span className="lp-eyebrow">Pricing</span>
            <h2 className="lp-h2">Simple plans that grow with your school</h2>
            <p className="lp-lead">Plans can change — pick a starting point.</p>
            <p className="lp-lead" style={{ fontWeight: 700, color: "var(--brand-accent-dark)" }}>
              Start with a {trial}-day free trial on every plan.
            </p>
          </div>
          <div className="lp-pricing">
            {plans.map((plan, index) => {
              const custom = plan.price === 0;
              const featured = index === 1;
              return (
                <div
                  key={plan.slug}
                  className={featured ? "lp-plan featured" : "lp-plan"}
                >
                  <h3>{plan.name}</h3>
                  <p className="price">
                    {custom ? "Custom" : `KSh ${plan.price.toLocaleString()}`}
                  </p>
                  {!custom && (
                    <p style={{ color: "#5b6470", fontSize: "0.85rem" }}>
                      per 3 months
                    </p>
                  )}
                  <ul>
                    {plan.maxStudents ? (
                      <li>
                        <b>Up to {plan.maxStudents.toLocaleString()}</b> students
                      </li>
                    ) : (
                      <li>
                        <b>Unlimited</b> students
                      </li>
                    )}
                    {plan.features.map((feature) => (
                      <li key={feature}>{feature} ✓</li>
                    ))}
                  </ul>
                  <a
                    href={custom ? "/contact" : `/register?plan=${plan.slug}`}
                    className={
                      featured
                        ? "lp-btn lp-btn-dark lp-center"
                        : "lp-btn lp-btn-outline lp-center"
                    }
                  >
                    {custom ? "Contact Sales" : "Get Started"}
                  </a>
                </div>
              );
            })}
          </div>
          <p className="lp-center" style={{ marginTop: "1.5rem" }}>
            <a href="/pricing">Compare all plans →</a>
          </p>
        </div>
      </section>

      {/* ---------- 11. How it works ---------- */}
      <section className="lp-section lp-section-soft">
        <div className="lp-container lp-center">
          <span className="lp-eyebrow">Onboarding</span>
          <h2 className="lp-h2">Live in five steps</h2>
          <div className="lp-how">
            <div>
              <span className="num">01</span>
              <p>Create your school</p>
            </div>
            <div>
              <span className="num">02</span>
              <p>Configure your school</p>
            </div>
            <div>
              <span className="num">03</span>
              <p>Import students &amp; staff</p>
            </div>
            <div>
              <span className="num">04</span>
              <p>Connect M-Pesa, email &amp; WhatsApp</p>
            </div>
            <div>
              <span className="num">05</span>
              <p>Start managing your school</p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 12. Security ---------- */}
      <section className="lp-section">
        <div className="lp-container lp-center">
          <span className="lp-eyebrow">Security</span>
          <h2 className="lp-h2">Built with security in mind</h2>
          <p className="lp-lead">
            Schools trust us with student and financial data — we treat that
            responsibility seriously.
          </p>
          <ul className="lp-check-list" style={{ textAlign: "left" }}>
            <li>Tenant data isolation</li>
            <li>Role-based access</li>
            <li>Audit logs</li>
            <li>Encrypted credentials</li>
            <li>Secure authentication</li>
            <li>Backups</li>
            <li>Controlled access to student data</li>
          </ul>
        </div>
      </section>

      {/* ---------- 13. Early access ---------- */}
      <section className="lp-section lp-section-soft">
        <div className="lp-container lp-center">
          <span className="lp-eyebrow">Early access</span>
          <h2 className="lp-h2">Become a founding school</h2>
          <p className="lp-lead">
            We are onboarding our first schools and working closely with them to
            shape the platform. Get in touch to join early.
          </p>
          <p style={{ marginTop: "1.5rem" }}>
            <a href="#contact" className="lp-btn lp-btn-accent">
              Talk to us
            </a>
          </p>
        </div>
      </section>

      {/* ---------- 14. FAQ ---------- */}
      <section id="faq" className="lp-section">
        <div className="lp-container">
          <div className="lp-center">
            <span className="lp-eyebrow">FAQ</span>
            <h2 className="lp-h2">Frequently asked questions</h2>
          </div>
          <div className="lp-faq">
            <details>
              <summary>Can I use my own school domain?</summary>
              <p>Yes, supported schools can connect a custom domain.</p>
            </details>
            <details>
              <summary>Can I use my own M-Pesa account?</summary>
              <p>
                Yes, the architecture allows each school to configure its own
                supported M-Pesa integration.
              </p>
            </details>
            <details>
              <summary>Can I design my own report card?</summary>
              <p>Yes. Each school can have its own report-card template.</p>
            </details>
            <details>
              <summary>Can I connect WhatsApp?</summary>
              <p>
                Yes. Connect your school&apos;s WhatsApp number from your
                dashboard by scanning a QR code — no technical setup needed.
                Fee reminders, payment confirmations, and announcements then
                go out over WhatsApp automatically.
              </p>
            </details>
            <details>
              <summary>Can parents pay school fees online?</summary>
              <p>
                Yes, the parent portal can initiate supported payment flows and
                show payment/receipt information.
              </p>
            </details>
            <details>
              <summary>Can one parent have multiple children?</summary>
              <p>Yes.</p>
            </details>
          </div>
        </div>
      </section>

      {/* ---------- 15. Final CTA ---------- */}
      <section className="lp-section lp-band-accent">
        <div className="lp-container">
          <h2 className="lp-h2" style={{ color: "#101418" }}>
            Ready to manage your school the smarter way?
          </h2>
          <p className="lp-lead">
            Bring students, academics, finance, communication, and parents
            together in one platform.
          </p>
          <div className="lp-hero-cta" style={{ marginBottom: 0 }}>
            <a href="/register" className="lp-btn lp-btn-dark">
              Get Started
            </a>
            <a href="#contact" className="lp-btn lp-btn-outline">
              Book a Demo
            </a>
          </div>
        </div>
      </section>

      {/* ---------- 16. Footer ---------- */}
      <footer id="contact" className="lp-footer">
        <div className="lp-footer-grid">
          <div>
            <SiteLogo tone="light" />
            <p className="lp-tagline">School management made simpler.</p>
            <p>
              <a href="mailto:mtandaolabs@gmail.com">mtandaolabs@gmail.com</a>
              <br />
              <a href="tel:+254728249135">+254 728 249135</a>
              <br />
              <a
                href="https://wa.me/254728249135"
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp us
              </a>
            </p>
          </div>
          <div>
            <h4>Platform</h4>
            <ul>
              <li>
                <a href="#features">Features</a>
              </li>
              <li>
                <a href="#pricing">Pricing</a>
              </li>
              <li>
                <a href="#solutions">Solutions</a>
              </li>
              <li>
                <a href="#cbc">CBC</a>
              </li>
              <li>
                <a href="#contact">Integrations</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Resources</h4>
            <ul>
              <li>
                <a href="/features">Features</a>
              </li>
              <li>
                <a href="/pricing">Pricing</a>
              </li>
              <li>
                <a href="#faq">FAQs</a>
              </li>
              <li>
                <a href="/contact">Contact</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li>
                <a href="/about">About</a>
              </li>
              <li>
                <a href="/contact">Contact</a>
              </li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li>
                <a href="/privacy">Privacy Policy</a>
              </li>
              <li>
                <a href="/terms">Terms &amp; Conditions</a>
              </li>
              <li>
                <a href="/privacy">Data Protection</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="lp-footer-bottom">
          <span>© 2026 MtandaoLabsEdu</span>
          <span>mtandaolabsedu.com</span>
        </div>
      </footer>
    </div>
  );
}
