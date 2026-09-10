import SiteLogo from "../components/SiteLogo";
import ThemeToggle from "../components/ThemeToggle";

export default function MarketingHome() {
  return (
    <div className="lp">
      {/* ---------- Nav ---------- */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <a href="/" aria-label="MtandaoLabs home">
            <SiteLogo />
          </a>
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

      {/* ---------- 2. Trust / statistics ---------- */}
      <section>
        <div className="lp-container">
          <p className="lp-center lp-lead" style={{ paddingTop: "2.5rem" }}>
            Trusted school technology
          </p>
          {/* Replace these figures with real statistics once available. */}
          <div className="lp-stats">
            <div className="lp-stat">
              <strong>500+</strong>
              <span>Schools</span>
            </div>
            <div className="lp-stat">
              <strong>40K+</strong>
              <span>Students</span>
            </div>
            <div className="lp-stat">
              <strong>2K+</strong>
              <span>Teachers</span>
            </div>
            <div className="lp-stat">
              <strong>99.9%</strong>
              <span>Platform uptime</span>
            </div>
          </div>
          <p className="lp-stats-note">
            Figures shown are illustrative — publish real statistics once you
            have them.
          </p>
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
            WhatsApp, email, and in-app notifications — each school connects its
            own Evolution API instance and email configuration.
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
            <li>Its own WhatsApp configuration</li>
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
          </div>
          <div className="lp-pricing">
            <div className="lp-plan">
              <h3>Starter</h3>
              <p className="price">—</p>
              <ul>
                <li>
                  <b>500</b> students
                </li>
                <li>
                  <b>50</b> teachers
                </li>
                <li>Parent Portal ✓</li>
                <li>Finance ✓</li>
                <li>M-Pesa ✓</li>
                <li>CBC ✓</li>
                <li>WhatsApp —</li>
                <li>Report Designer ✓</li>
                <li>Custom Domain —</li>
              </ul>
              <a href="/register?plan=starter" className="lp-btn lp-btn-outline lp-center">
                Get Started
              </a>
            </div>
            <div className="lp-plan featured">
              <h3>Pro</h3>
              <p className="price">—</p>
              <ul>
                <li>
                  <b>2,000</b> students
                </li>
                <li>
                  <b>200</b> teachers
                </li>
                <li>Parent Portal ✓</li>
                <li>Finance ✓</li>
                <li>M-Pesa ✓</li>
                <li>CBC ✓</li>
                <li>WhatsApp ✓</li>
                <li>Report Designer ✓</li>
                <li>Custom Domain ✓</li>
              </ul>
              <a href="/register?plan=pro" className="lp-btn lp-btn-dark lp-center">
                Get Started
              </a>
            </div>
            <div className="lp-plan">
              <h3>Enterprise</h3>
              <p className="price">Custom</p>
              <ul>
                <li>
                  <b>Custom</b> students
                </li>
                <li>
                  <b>Custom</b> teachers
                </li>
                <li>Parent Portal ✓</li>
                <li>Finance ✓</li>
                <li>M-Pesa ✓</li>
                <li>CBC ✓</li>
                <li>WhatsApp ✓</li>
                <li>Report Designer ✓</li>
                <li>Custom Domain ✓</li>
              </ul>
              <a href="#contact" className="lp-btn lp-btn-outline lp-center">
                Contact Sales
              </a>
            </div>
          </div>
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

      {/* ---------- 13. Testimonials (placeholder — no fabricated quotes) ---------- */}
      <section className="lp-section lp-section-soft">
        <div className="lp-container lp-center">
          <span className="lp-eyebrow">Schools</span>
          <h2 className="lp-h2">Loved by school administrators</h2>
          <p className="lp-lead">
            Customer stories will appear here once our first schools are live.
          </p>
        </div>
      </section>

      {/* ---------- 14. FAQ ---------- */}
      <section className="lp-section">
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
                Yes, schools can configure their own Evolution API integration.
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
            <p className="lp-tagline">Built to work, never got tired</p>
            <p>School management made simpler.</p>
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
                <a href="#">Documentation</a>
              </li>
              <li>
                <a href="#">Help Center</a>
              </li>
              <li>
                <a href="#">Blog</a>
              </li>
              <li>
                <a href="#">FAQs</a>
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
                <a href="#contact">Contact</a>
              </li>
              <li>
                <a href="#">Careers</a>
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
